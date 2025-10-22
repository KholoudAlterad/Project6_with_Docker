"""
FastAPI Multi-User Todo API (adjusted)

Fixes:
- Pydantic v1/v2 compatibility for response models (orm_mode + from_attributes + explicit model validation).
- SQLite robustness on Windows (timeout, WAL, busy_timeout).
- IntegrityError handling on register to return 409 instead of 500.
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict

from pathlib import Path as FilePath
import jwt
from fastapi import FastAPI, Depends, HTTPException, status, Request, Query, Path, UploadFile, File, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, constr
from sqlalchemy import (
    create_engine, Column, Integer, String, Boolean, ForeignKey, DateTime, Text, LargeBinary, text, inspect
)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session
from sqlalchemy.exc import IntegrityError

# --------------------- Config ---------------------
# Build a default absolute SQLite URL next to this file (backend/todos.db)
_DEFAULT_DB_PATH = FilePath(__file__).with_name("todos.db").resolve()
_DEFAULT_DB_URL = f"sqlite:///{_DEFAULT_DB_PATH.as_posix()}"

DATABASE_URL = os.getenv("DATABASE_URL", _DEFAULT_DB_URL)
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
EMAIL_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
ALGORITHM = "HS256"

# --------------------- DB setup ---------------------
engine = create_engine(
    DATABASE_URL,
    connect_args=(
        {"check_same_thread": False, "timeout": 30}  # wait up to 30s for file lock
        if DATABASE_URL.startswith("sqlite") else {}
    ),
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    profile_image = Column(LargeBinary, nullable=True)
    profile_image_mime = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    todos = relationship("Todo", back_populates="owner", cascade="all, delete-orphan")


class Todo(Base):
    __tablename__ = "todos"
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="", nullable=False)
    done = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
    owner = relationship("User", back_populates="todos")


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    user = relationship("User")


Base.metadata.create_all(bind=engine)

# Ensure avatar columns exist (simple runtime migration for SQLite)
def _ensure_avatar_columns():
    try:
        inspector = inspect(engine)
        cols = {c["name"] for c in inspector.get_columns("users")}
        statements = []
        if "profile_image" not in cols:
            statements.append("ALTER TABLE users ADD COLUMN profile_image BLOB")
        if "profile_image_mime" not in cols:
            statements.append("ALTER TABLE users ADD COLUMN profile_image_mime VARCHAR")
        if statements:
            with engine.begin() as conn:
                for stmt in statements:
                    conn.execute(text(stmt))
    except Exception:
        # best-effort; ignore if not supported
        pass

_ensure_avatar_columns()


def _ensure_token_index_non_unique():
    try:
        inspector = inspect(engine)
        indexes = inspector.get_indexes("email_verification_tokens")
        unique_token_indexes = [idx for idx in indexes if idx.get("unique") and idx.get("column_names") == ["token"]]
        if unique_token_indexes:
            with engine.begin() as conn:
                for idx in unique_token_indexes:
                    conn.execute(text(f"DROP INDEX IF EXISTS {idx['name']}"))
            with engine.begin() as conn:
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_email_verification_tokens_token ON email_verification_tokens (token)"))
    except Exception:
        pass


_ensure_token_index_non_unique()

# SQLite pragmas for better concurrency
if DATABASE_URL.startswith("sqlite"):
    from sqlalchemy import event

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=30000")  # ms
        cursor.close()

# --------------------- Auth utils ---------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def hash_password(password: str) -> str:
    return password


def verify_password(plain: str, hashed: str) -> bool:
    return plain == hashed


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


# --------------------- Rate Limiter ---------------------
class SimpleRateLimiter:
    """Leaky-bucket style in-memory rate limiter."""
    def __init__(self, limit: int, per_seconds: int):
        self.limit = limit
        self.per = per_seconds
        self.buckets: Dict[str, List[float]] = {}

    def hit(self, key: str):
        now = time.time()
        window_start = now - self.per
        q = [t for t in self.buckets.get(key, []) if t >= window_start]
        if len(q) >= self.limit:
            q = q[-self.limit:]
            self.buckets[key] = q
            reset = int(min(q) + self.per - now)
            raise HTTPException(status_code=429, detail=f"Rate limit exceeded. Try again in {max(reset, 1)}s")
        q.append(now)
        self.buckets[key] = q


unauth_rl = SimpleRateLimiter(limit=30, per_seconds=60)   # 30 req/min per IP
auth_rl = SimpleRateLimiter(limit=120, per_seconds=60)    # 120 req/min per user


# --------------------- Schemas ---------------------
PasswordStr = constr(min_length=8, max_length=128)
TitleStr = constr(min_length=1, max_length=200)
DescStr = constr(min_length=0, max_length=2000)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserCreate(BaseModel):
    email: EmailStr
    password: PasswordStr


class UserOut(BaseModel):
    id: int
    email: EmailStr
    is_admin: bool
    email_verified: bool
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True            # Pydantic v1
        from_attributes = True     # Pydantic v2


class TodoCreate(BaseModel):
    title: TitleStr
    description: Optional[DescStr] = ""


class TodoUpdate(BaseModel):
    title: Optional[TitleStr] = None
    description: Optional[DescStr] = None
    done: Optional[bool] = None


class TodoOut(BaseModel):
    id: int
    title: str
    description: str
    done: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True


class UserBrief(BaseModel):
    id: int
    email: EmailStr

    class Config:
        orm_mode = True
        from_attributes = True


class AdminTodoOut(BaseModel):
    id: int
    title: str
    description: str
    done: bool
    created_at: datetime
    updated_at: datetime
    owner: UserBrief

    class Config:
        orm_mode = True
        from_attributes = True


# --------- Compatibility helpers: stable returns on v1/v2 ----------
def _resp(model, obj):
    # v2: model_validate; v1: from_orm
    return model.model_validate(obj) if hasattr(model, "model_validate") else model.from_orm(obj)

def _resp_list(model, objs):
    return [_resp(model, o) for o in objs]


# --------------------- Dependencies ---------------------
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    uid = payload.get("sub")
    if uid is None:
        raise HTTPException(status_code=401, detail="Malformed token: missing subject")
    user: User | None = db.get(User, int(uid))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive or not found")
    return user


def require_verified_user(user: User = Depends(get_current_user)) -> User:
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
    return user


def require_admin(user: User = Depends(require_verified_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


# --------------------- App ---------------------
app = FastAPI(title="Todo API (Multi-User)", version="1.0.0")


@app.middleware("http")
async def apply_rate_limit(request: Request, call_next):
    # Fast path: rate limit by user id if a bearer token is present (no DB open).
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer"):
        token = auth.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            uid = payload.get("sub")
            if uid is not None:
                auth_rl.hit(f"user:{uid}")
                return await call_next(request)
        except Exception:
            pass
    # Fallback: per-IP
    unauth_rl.hit(f"ip:{request.client.host}")
    return await call_next(request)


# --------------------- Auth routes ---------------------
@app.post("/auth/register", response_model=UserOut, status_code=201)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Fast pre-check
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(email=user_in.email, hashed_password=hash_password(user_in.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Handle unique constraint race
        raise HTTPException(status_code=409, detail="Email already registered")
    db.refresh(user)

    # Create mock verification token
    token = "a1"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=EMAIL_TOKEN_EXPIRE_MINUTES)
    existing_token = (
        db.query(EmailVerificationToken)
        .filter(EmailVerificationToken.token == token)
        .first()
    )

    if existing_token:
        existing_token.user_id = user.id
        existing_token.expires_at = expires_at
        existing_token.used = False
    else:
        db.add(
            EmailVerificationToken(
                user_id=user.id,
                token=token,
                expires_at=expires_at,
            )
        )
    db.commit()

    print(f"[MOCK EMAIL] Verify your email: http://localhost:8000/auth/verify-email?token={token}")
    return _resp(UserOut, user)


@app.get("/auth/verify-email")
def verify_email(token: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    rec: EmailVerificationToken | None = (
        db.query(EmailVerificationToken).filter(EmailVerificationToken.token == token).first()
    )
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid token")
    now_utc = datetime.now(timezone.utc)
    exp = rec.expires_at if rec.expires_at.tzinfo is not None else rec.expires_at.replace(tzinfo=timezone.utc)
    if exp < now_utc:
        raise HTTPException(status_code=400, detail="Token expired")
    user = db.get(User, rec.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    if rec.used:
        if user.email_verified:
            return {"message": "Email already verified"}
        rec.used = False

    user.email_verified = True
    rec.used = True
    db.commit()
    return {"message": "Email verified"}


@app.post("/auth/login", response_model=TokenOut)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # NOTE: pass email in the 'username' field
    user: User | None = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")

    expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token({"sub": str(user.id), "adm": user.is_admin}, expires)
    return TokenOut(access_token=token, expires_in=int(expires.total_seconds()))


# --------------------- Todo routes (User-scoped) ---------------------
@app.get("/todos", response_model=List[TodoOut])
def list_my_todos(user: User = Depends(require_verified_user), db: Session = Depends(get_db)):
    items = db.query(Todo).filter(Todo.owner_id == user.id).order_by(Todo.created_at.desc()).all()
    return _resp_list(TodoOut, items)


@app.post("/todos", response_model=TodoOut, status_code=201)
def create_todo(todo_in: TodoCreate, user: User = Depends(require_verified_user), db: Session = Depends(get_db)):
    item = Todo(owner_id=user.id, title=todo_in.title, description=todo_in.description or "")
    db.add(item)
    db.commit()
    db.refresh(item)
    return _resp(TodoOut, item)


@app.get("/todos/{todo_id}", response_model=TodoOut)
def get_todo(todo_id: int = Path(..., ge=1), user: User = Depends(require_verified_user), db: Session = Depends(get_db)):
    item: Todo | None = db.get(Todo, todo_id)
    if not item or item.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Todo not found")
    return _resp(TodoOut, item)


@app.patch("/todos/{todo_id}", response_model=TodoOut)
def update_todo(
    todo_id: int,
    updates: TodoUpdate,
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    item: Todo | None = db.get(Todo, todo_id)
    if not item or item.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Todo not found")
    if updates.title is not None:
        item.title = updates.title
    if updates.description is not None:
        item.description = updates.description
    if updates.done is not None:
        item.done = updates.done
    db.commit()
    db.refresh(item)
    return _resp(TodoOut, item)


@app.delete("/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int, user: User = Depends(require_verified_user), db: Session = Depends(get_db)):
    item: Todo | None = db.get(Todo, todo_id)
    if not item or item.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(item)
    db.commit()
    return None


# --------------------- Admin routes ---------------------
@app.get("/admin/users", response_model=List[UserOut])
def admin_list_users(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return _resp_list(UserOut, users)


@app.patch("/admin/users/{user_id}", response_model=UserOut)
def admin_toggle_admin(
    user_id: int,
    make_admin: Optional[bool] = Query(None),
    verify_email: Optional[bool] = Query(None),
    deactivate: Optional[bool] = Query(None),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user: User | None = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if make_admin is not None:
        user.is_admin = bool(make_admin)
    if verify_email is not None:
        user.email_verified = bool(verify_email)
    if deactivate is not None:
        user.is_active = not bool(deactivate)
    db.commit()
    db.refresh(user)
    return _resp(UserOut, user)


@app.get("/admin/users/{user_id}/todos", response_model=List[TodoOut])
def admin_list_user_todos(user_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    if not db.get(User, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    items = db.query(Todo).filter(Todo.owner_id == user_id).order_by(Todo.created_at.desc()).all()
    return _resp_list(TodoOut, items)


@app.get("/admin/todos", response_model=List[AdminTodoOut])
def admin_list_all_todos(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    items = db.query(Todo).order_by(Todo.created_at.desc()).all()
    return _resp_list(AdminTodoOut, items)


@app.delete("/admin/todos/{todo_id}", status_code=204)
def admin_delete_any_todo(todo_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    item: Todo | None = db.get(Todo, todo_id)
    if not item:
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(item)
    db.commit()
    return None


# --------------------- User profile ---------------------
@app.get("/users/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return _resp(UserOut, user)


@app.get("/users/me/avatar")
def get_my_avatar(user: User = Depends(get_current_user)):
    if not user.profile_image:
        raise HTTPException(status_code=404, detail="No avatar")
    return Response(content=user.profile_image, media_type=user.profile_image_mime or "application/octet-stream")


@app.put("/users/me/avatar", response_model=UserOut)
async def put_my_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in {"image/jpeg", "image/png", "image/gif", "image/webp"}:
        raise HTTPException(status_code=400, detail="Unsupported image type")
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 2MB)")
    user.profile_image = content
    user.profile_image_mime = file.content_type
    db.add(user)
    db.commit()
    db.refresh(user)
    return _resp(UserOut, user)


# --------------------- Health ---------------------
@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}
