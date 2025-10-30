import logging
import os
import urllib.parse
from io import BytesIO

try:
    from PIL import Image, ImageOps
except Exception:
    Image = None
    ImageOps = None

try:
    import boto3
except Exception:
    boto3 = None

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

_DEFAULT_PREFIX = "avatars/"
_DEFAULT_SUFFIX = "_processed"
_DEFAULT_MAX_SIDE = 512
_DEFAULT_FORMAT = "webp"  # webp | jpeg | png
_DEFAULT_QUALITY = 80

s3 = None
if boto3 is not None:
    try:
        s3 = boto3.client("s3")
    except Exception:
        s3 = None


def _process_image(data: bytes, max_side: int, target_format: str, quality: int) -> tuple[bytes, str]:
    if Image is None or ImageOps is None:
        raise RuntimeError("Pillow (PIL) not available. Attach a Lambda layer with Pillow.")
    img = Image.open(BytesIO(data))
    img = ImageOps.exif_transpose(img)
    # Color/alpha handling
    if img.mode in ("RGBA", "LA"):
        bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
        bg.alpha_composite(img)
        img = bg.convert("RGB")
    elif img.mode != "RGB":
        img = img.convert("RGB")
    # Resize to fit max_side (no upscale)
    w, h = img.size
    max_dim = max(w, h)
    if max_dim > max_side:
        ratio = max_side / float(max_dim)
        new_size = (max(1, int(w * ratio)), max(1, int(h * ratio)))
        img = img.resize(new_size, Image.LANCZOS)
    # Encode
    buf = BytesIO()
    fmt = (target_format or _DEFAULT_FORMAT).lower()
    if fmt == "webp":
        img.save(buf, format="WEBP", quality=quality, method=6)
        content_type = "image/webp"
    elif fmt in ("jpg", "jpeg"):
        img.save(buf, format="JPEG", quality=quality, optimize=True)
        content_type = "image/jpeg"
    else:
        img.save(buf, format="PNG", optimize=True)
        content_type = "image/png"
    return buf.getvalue(), content_type


def handler(event, context):
    prefix = os.getenv("AVATAR_PREFIX", _DEFAULT_PREFIX)
    suffix = os.getenv("PROCESSED_SUFFIX", _DEFAULT_SUFFIX)
    target_max = int(os.getenv("TARGET_MAX_SIDE", str(_DEFAULT_MAX_SIDE)))
    target_fmt = os.getenv("TARGET_FORMAT", _DEFAULT_FORMAT)
    target_quality = int(os.getenv("TARGET_QUALITY", str(_DEFAULT_QUALITY)))

    records = event.get("Records") or []
    if not records:
        logger.info("avatar-event: no records to process")
        return {"processed": 0, "skipped": 0}

    if s3 is None:
        logger.error("avatar-event: boto3/S3 client unavailable")
        return {"processed": 0, "skipped": len(records), "error": "no_s3"}

    processed = 0
    skipped = 0
    for record in records:
        s3_info = record.get("s3") or {}
        bucket = (s3_info.get("bucket") or {}).get("name")
        obj = s3_info.get("object") or {}
        key = urllib.parse.unquote_plus(obj.get("key", ""))

        if not bucket or not key:
            skipped += 1
            continue
        if not key.startswith(prefix):
            skipped += 1
            continue
        if key.endswith(suffix):
            logger.info("avatar-event: skipping already-processed object key=%s", key)
            skipped += 1
            continue

        try:
            src = s3.get_object(Bucket=bucket, Key=key)
            body = src["Body"].read()
            out_bytes, out_ct = _process_image(body, target_max, target_fmt, target_quality)
            dest_key = f"{key}{suffix}"
            s3.put_object(Bucket=bucket, Key=dest_key, Body=out_bytes, ContentType=out_ct)
            processed += 1
            logger.info(
                "avatar-event: processed bucket=%s src=%s dest=%s size_in=%s size_out=%s",
                bucket,
                key,
                dest_key,
                len(body),
                len(out_bytes),
            )
        except Exception:
            logger.exception("avatar-event: failed processing bucket=%s key=%s", bucket, key)
            skipped += 1

    logger.info("avatar-event: total processed=%s skipped=%s", processed, skipped)
    return {"processed": processed, "skipped": skipped}
