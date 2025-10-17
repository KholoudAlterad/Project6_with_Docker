import { useState } from "react";
import type React from "react";
import { FlowerLogo } from "../icons/FlowerLogo";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { CheckCircle, AlertCircle, Mail, Lock } from "lucide-react";
import { register as apiRegister } from "../../lib/api";

interface RegisterProps {
  onNavigate: (page: string) => void;
}

/**
 * REGISTER SCREEN
 * 
 * API Endpoint: POST /auth/register
 * Request Body (JSON):
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 * 
 * Validation:
 * - Email must be valid format
 * - Password must be >= 8 characters
 * 
 * Success Response: 201
 * {
 *   "message": "User created. Please verify your email."
 * }
 * Note: Verification link is printed in server console (mock)
 * 
 * Error Responses:
 * - 400: Invalid input
 * - 409: Email already exists
 * - 500: Server error
 */

export function Register({ onNavigate }: RegisterProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validation
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await apiRegister(email, password);
      setSuccess(true);
      onNavigate("verify-email");
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || "Registration failed";
      setError(String(detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <FlowerLogo className="w-20 h-20 mb-4" />
          <h1 className="text-text-900">LeafTasks</h1>
          <p className="text-text-600">Create your account</p>
        </div>

        {/* Registration Form */}
        <div className="bg-surface p-8 rounded-xl border border-border shadow-sm">
          {success ? (
            <Alert className="bg-success-500/10 border-success-500/20">
              <CheckCircle className="h-4 w-4 text-success-500" />
              <AlertDescription className="text-success-500">
                <strong>Account created!</strong>
                <br />
                Verification link is printed in server console (mock).
                <br />
                Please check your email to verify your account.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-text-600" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="border-border"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-text-600" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="border-border"
                  required
                />
                <p className="text-xs text-text-600">
                  Must be at least 8 characters long
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-600"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => onNavigate("login")}
              className="text-sm text-primary hover:underline"
            >
              Already have an account? Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
