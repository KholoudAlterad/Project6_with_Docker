import { useState, useEffect } from "react";
import { Toaster } from "./components/ui/sonner";
import { Layout } from "./components/Layout";
import { Register } from "./components/screens/Register";
import { Login } from "./components/screens/Login";
import { VerifyEmail } from "./components/screens/VerifyEmail";
import { MyTodos } from "./components/screens/MyTodos";
import { AdminUsers } from "./components/screens/AdminUsers";
import { AdminTodos } from "./components/screens/AdminTodos";
import { Settings } from "./components/screens/Settings";
import { isLoggedIn, decodeJwt, getCurrentEmail, logout as apiLogout, getToken } from "./lib/api";
import { SimpleUI } from "./components/screens/SimpleUI";

/**
 * ========================================
 * LEAFTASKS - MULTI-USER TODO APPLICATION
 * ========================================
 * 
 * DESIGN SYSTEM TOKENS (CSS Variables)
 * ------------------------------------
 * Primary Colors:
 *   --primary-600: #2E7D32 (Dark green)
 *   --primary-500: #43A047 (Main green)
 *   --primary-300: #81C784 (Light green)
 *   --accent-500: #8BC34A (Light accent)
 * 
 * Background Colors:
 *   --bg: #F6FBF4 (Light garden background)
 *   --surface: #FFFFFF (White cards/surfaces)
 * 
 * Text Colors:
 *   --text-900: #0B1F14 (Dark text)
 *   --text-600: #2F4F3E (Medium text)
 * 
 * Status Colors:
 *   --success-500: #2E7D32 (Green)
 *   --warning-500: #F59E0B (Amber)
 *   --error-500: #E53935 (Red)
 * 
 * UI Colors:
 *   --border: #D8E8DA (Soft border)
 *   --muted: #EEF6EF (Muted background)
 * 
 * Typography:
 *   Font Family: Inter (system default)
 *   H1: 28px/36px semi-bold
 *   H2: 22px/30px semi-bold
 *   H3: 18px/26px semi-bold
 *   Body: 14px/22px regular
 *   Small: 12px/18px
 * 
 * Spacing: 8px base grid
 * Border Radius: 16px (cards/buttons)
 * Shadows: Soft, low elevation
 * 
 * TAILWIND CONFIGURATION SUGGESTION
 * ----------------------------------
 * colors: {
 *   primary: { 300: '#81C784', 500: '#43A047', 600: '#2E7D32' },
 *   accent: { 500: '#8BC34A' },
 *   bg: '#F6FBF4',
 *   surface: '#FFFFFF',
 *   text: { 600: '#2F4F3E', 900: '#0B1F14' },
 *   success: { 500: '#2E7D32' },
 *   warning: { 500: '#F59E0B' },
 *   error: { 500: '#E53935' },
 *   border: '#D8E8DA',
 *   muted: '#EEF6EF',
 * }
 * borderRadius: { DEFAULT: '16px' }
 * spacing: { base: '8px' }
 * 
 * API ENDPOINTS SUMMARY
 * ---------------------
 * 
 * AUTH:
 * - POST   /auth/register              Create account (email, password)
 * - GET    /auth/verify-email?token=   Verify email with token
 * - POST   /auth/login                 Login (returns access_token)
 * 
 * USER TODOS:
 * - GET    /todos                      List user's todos
 * - POST   /todos                      Create new todo
 * - PATCH  /todos/{id}                 Update todo (partial)
 * - DELETE /todos/{id}                 Delete todo
 * 
 * ADMIN:
 * - GET    /admin/users                List all users
 * - PATCH  /admin/users/{id}           Update user flags (query params)
 * - GET    /admin/todos                List all todos
 * - DELETE /admin/todos/{id}           Delete any todo
 * 
 * All authenticated endpoints require:
 * Authorization: Bearer <access_token>
 * 
 * RESPONSIVE BREAKPOINTS
 * ----------------------
 * Mobile:  390px  (default)
 * Tablet:  768px  (md:)
 * Desktop: 1440px (lg:)
 * 
 * COMPONENT STATES
 * ----------------
 * - Default
 * - Hover (hover:)
 * - Focus (focus:, focus-visible:)
 * - Disabled (disabled:)
 * - Loading (with spinners/skeletons)
 * - Error (error styling)
 * - Success (success styling)
 * 
 * ACCESSIBILITY FEATURES
 * ----------------------
 * - High contrast (≥4.5:1 text ratio)
 * - Large touch targets (≥44px)
 * - Focus indicators
 * - ARIA labels where needed
 * - Keyboard navigation support
 * 
 * GARDEN THEME ELEMENTS
 * ---------------------
 * - Leaf icon logo
 * - Green color palette
 * - Soft, calm aesthetics
 * - Subtle garden motifs on empty states
 * - Clean, accessible design
 */

type Page =
  | "register"
  | "verify-email"
  | "simple"
  | "login"
  | "my-todos"
  | "profile"
  | "settings"
  | "users"
  | "all-todos";

interface User {
  email: string;
  role: "admin" | "user";
  isVerified: boolean;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("login");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<"green" | "pink">("green");
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  // Load theme preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("leaftasks-theme") as "green" | "pink" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // If verify token present or explicit page param, navigate accordingly
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get("page");
    const hasToken = params.has("token");
    if (pageParam === "verify-email" || hasToken) {
      setCurrentPage("verify-email");
    } else if (pageParam === "simple") {
      setCurrentPage("simple");
    }
  }, []);

  // Restore session from token
  useEffect(() => {
    if (isLoggedIn()) {
      const token = getToken()!;
      const payload: any = decodeJwt(token);
      const email = getCurrentEmail() || "user";
      const role: "admin" | "user" = payload?.adm ? "admin" : "user";
      setCurrentUser({ email, role, isVerified: true });
      setCurrentPage("my-todos");
    }
  }, []);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "pink") {
      root.classList.add("theme-pink");
    } else {
      root.classList.remove("theme-pink");
    }
  }, [theme]);

  const handleThemeChange = (newTheme: "green" | "pink") => {
    setTheme(newTheme);
    localStorage.setItem("leaftasks-theme", newTheme);
  };

  const handleLogin = (email: string, role: "admin" | "user") => {
    setCurrentUser({
      email,
      role,
      isVerified: true,
    });
    setPendingVerificationEmail(null);
    setCurrentPage("my-todos");
  };

  const handleLogout = () => {
    apiLogout();
    setCurrentUser(null);
    setCurrentPage("login");
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  const handleRequireVerification = (email: string) => {
    setPendingVerificationEmail(email);
    setCurrentPage("verify-email");
  };

  // Auth screens (no layout)
  if (!currentUser) {
    switch (currentPage) {
      case "register":
        return (
          <>
            <Register onNavigate={handleNavigate} />
            <Toaster position="top-right" />
          </>
        );
      case "verify-email":
        return (
          <>
            <VerifyEmail
              onNavigate={handleNavigate}
              pendingEmail={pendingVerificationEmail}
              onClearPending={() => setPendingVerificationEmail(null)}
            />
            <Toaster position="top-right" />
          </>
        );
      case "simple":
        return (
          <>
            <SimpleUI />
            <Toaster position="top-right" />
          </>
        );
      case "login":
      default:
        return (
          <>
            <Login
              onNavigate={handleNavigate}
              onLogin={handleLogin}
              onRequireVerification={handleRequireVerification}
            />
            <Toaster position="top-right" />
          </>
        );
    }
  }

  const renderPage = () => {
    switch (currentPage) {
      case "my-todos":
        return <MyTodos />;
      case "profile":
        return (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-text-900 mb-4">Profile</h1>
            <div className="bg-surface p-6 rounded-xl border border-border">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-text-600">Email</label>
                  <p className="text-text-900">{currentUser.email}</p>
                </div>
                <div>
                  <label className="text-sm text-text-600">Role</label>
                  <p className="text-text-900 capitalize">{currentUser.role}</p>
                </div>
                <div>
                  <label className="text-sm text-text-600">Status</label>
                  <p className="text-text-900">
                    {currentUser.isVerified ? "Verified" : "Unverified"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case "users":
        return currentUser.role === "admin" ? (
          <AdminUsers />
        ) : (
          <div>Access Denied</div>
        );
      case "settings":
        return <Settings currentTheme={theme} onThemeChange={handleThemeChange} />;
      case "all-todos":
        return currentUser.role === "admin" ? (
          <AdminTodos />
        ) : (
          <div>Access Denied</div>
        );
      default:
        return <MyTodos />;
    }
  };

  return (
    <>
      <Layout
        currentUser={currentUser}
        onNavigate={handleNavigate}
        currentPage={currentPage}
        onLogout={handleLogout}
      >
        {renderPage()}
      </Layout>
      <Toaster position="top-right" />
    </>
  );
}
