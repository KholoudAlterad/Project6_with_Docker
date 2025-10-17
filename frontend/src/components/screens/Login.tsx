import { useState } from "react";
import type React from "react";
import { FlowerLogo } from "../icons/FlowerLogo";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { AlertCircle, Mail, Lock } from "lucide-react";
import { login as apiLogin } from "../../lib/api";

interface LoginProps {
  onNavigate: (page: string) => void;
  onLogin: (email: string, role: "admin" | "user") => void;
  onRequireVerification: (email: string) => void;
}

/**
 * LOGIN SCREEN
 * 
 * API Endpoint: POST /auth/login
 * Request Body (x-www-form-urlencoded):
 * {
 *   "username": "user@example.com",  // Note: field is named 'username' not 'email'
 *   "password": "password123"
 * }
 * 
 * Success Response: 200
 * {
 *   "access_token": "eyJhbGc...",
 *   "token_type": "bearer"
 * }
 * 
 * Implementation:
 * 1. Store access_token in localStorage or memory
 * 2. Use as: Authorization: Bearer <access_token>
 * 3. Decode JWT to get user role and email
 * 4. Redirect to /my-todos (dashboard)
 * 
 * Error Responses:
 * - 400: Bad credentials (invalid email/password)
 * - 403: Email not verified
 * - 429: Rate limit exceeded
 * - 500: Server error
 */

export function Login({ onNavigate, onLogin, onRequireVerification }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      const { adm } = await apiLogin(email, password);
      const role = adm ? "admin" : "user";
      onLogin(email, role);
    } catch (err: any) {
      if (err?.status === 403) {
        setError("Email not verified");
        onRequireVerification(email);
      } else if (err?.status === 429) {
        setError("Too many attempts, please try later");
      } else {
        setError(err?.message || "Invalid credentials");
      }
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
          <p className="text-text-600">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-surface p-8 rounded-xl border border-border shadow-sm">
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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="border-border"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary-600"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <button
              onClick={() => onNavigate("register")}
              className="text-sm text-primary hover:underline block w-full"
            >
              Don't have an account? Sign up
            </button>
            
            {/* Demo Credentials */}
            
          </div>
        </div>
      </div>
    </div>
  );
}
