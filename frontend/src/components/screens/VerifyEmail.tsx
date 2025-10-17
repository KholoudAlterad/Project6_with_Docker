import { useEffect, useState, useCallback } from "react";
import { FlowerLogo } from "../icons/FlowerLogo";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { CheckCircle, AlertCircle, MailCheck } from "lucide-react";
import { verifyEmail as apiVerifyEmail } from "../../lib/api";

interface VerifyEmailProps {
  onNavigate: (page: string) => void;
  pendingEmail?: string | null;
  onClearPending?: () => void;
}

/**
 * EMAIL VERIFICATION SCREEN
 * 
 * API Endpoint: GET /auth/verify-email?token={token}
 * 
 * Implementation:
 * 1. Extract token from URL query parameters
 * 2. Send GET request with token
 * 3. Display success/error message
 * 4. Redirect to login page
 * 
 * Success Response: 200
 * {
 *   "message": "Email verified successfully"
 * }
 * 
 * Error Responses:
 * - 400: Invalid token
 * - 404: Token not found or expired
 * - 500: Server error
 */

export function VerifyEmail({ onNavigate, pendingEmail, onClearPending }: VerifyEmailProps) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [tokenInput, setTokenInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const runVerification = useCallback(async (token: string) => {
    setLoading(true);
    setStatus("idle");
    setMessage("");
    try {
      const res = await apiVerifyEmail(token);
      setStatus("success");
      setMessage(res.message || "Email verified");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.data?.detail || err?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setTokenInput(token);
      runVerification(token);
    }
  }, [runVerification]);

  useEffect(() => {
    if (pendingEmail) {
      setInfoMessage(`Account for ${pendingEmail} is not verified yet. Enter the token below to continue.`);
    }
  }, [pendingEmail]);

  useEffect(() => {
    if (status === "success" && onClearPending) {
      onClearPending();
    }
  }, [status, onClearPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setStatus("error");
      setMessage("Please enter the verification token.");
      return;
    }
    runVerification(tokenInput.trim());
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <FlowerLogo className="w-20 h-20 mb-4" />
          <h1 className="text-text-900">LeafTasks</h1>
        </div>

        {/* Result Card */}
        <div className="bg-surface p-8 rounded-xl border border-border shadow-sm">
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <MailCheck className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-text-900 mb-2">Verify your email</h2>
            <p className="text-text-600">
              Paste the verification token printed by the API server to activate your account.
            </p>
            {infoMessage && <p className="mt-2 text-sm text-text-600">{infoMessage}</p>}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {status !== "idle" && (
              <Alert variant={status === "success" ? "default" : "destructive"}>
                {status === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="verification-token">Verification token</Label>
              <Input
                id="verification-token"
                placeholder="Paste token here"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                disabled={loading || status === "success"}
                className="border-border"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary-600"
              disabled={loading || status === "success"}
            >
              {loading ? "Verifying..." : status === "success" ? "Verified" : "Verify"}
            </Button>
          </form>

          <Button
            onClick={() => onNavigate("login")}
            className="w-full mt-4 bg-muted text-text-900 hover:bg-muted/70"
            type="button"
          >
            Back to Login
          </Button>
        </div>

        {/* API Implementation Note */}
        <div className="mt-4 p-4 bg-muted rounded-lg text-sm text-text-600">
          <p className="mb-2"><strong>Implementation:</strong></p>
          <code className="text-xs">GET /auth/verify-email?token=...</code>
        </div>
      </div>
    </div>
  );
}
