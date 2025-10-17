// Centralized API client for FastAPI backend (proxied via Vite at /api)
// Uses localStorage for token persistence. No changes to main.py are required.

export type TokenOut = {
  access_token: string;
  token_type: string; // "bearer"
  expires_in: number; // seconds
};

export type UserOut = {
  id: number;
  email: string;
  is_admin: boolean;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
};

export type TodoOut = {
  id: number;
  title: string;
  description: string;
  done: boolean;
  created_at: string;
  updated_at: string;
};

export type UserBrief = {
  id: number;
  email: string;
};

export type AdminTodoOut = {
  id: number;
  title: string;
  description: string;
  done: boolean;
  created_at: string;
  updated_at: string;
  owner: UserBrief;
};

const BASE = "/api"; // Vite proxy will rewrite to http://127.0.0.1:8000
const TOKEN_KEY = "access_token";
const EMAIL_KEY = "current_email";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function setCurrentEmail(email: string) {
  localStorage.setItem(EMAIL_KEY, email);
}

export function getCurrentEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

export function decodeJwt<T = any>(token: string): T | null {
  try {
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt<any>(token);
  if (!payload?.exp) return false;
  // exp is seconds-since-epoch
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp <= nowSec;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const h: Record<string, string> = {};
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function handleJsonResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("Content-Type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json() : (null as any);
  if (!res.ok) {
    const detail = data?.detail || res.statusText || "Request failed";
    const err: any = new Error(detail);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

// -------- Auth --------
export async function register(email: string, password: string): Promise<UserOut> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleJsonResponse<UserOut>(res);
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE}/auth/verify-email?token=${encodeURIComponent(token)}`);
  return handleJsonResponse<{ message: string }>(res);
}

export async function login(email: string, password: string): Promise<{ token: string; adm: boolean }> {
  const form = new URLSearchParams();
  form.append("username", email); // FastAPI OAuth2 expects 'username' field for email
  form.append("password", password);

  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const data = await handleJsonResponse<TokenOut>(res);
  setToken(data.access_token);
  setCurrentEmail(email);
  const payload = decodeJwt<any>(data.access_token);
  return { token: data.access_token, adm: Boolean(payload?.adm) };
}

export function logout() {
  clearSession();
}

// -------- User Todos --------
export async function listMyTodos(): Promise<TodoOut[]> {
  const res = await fetch(`${BASE}/todos`, {
    headers: { ...authHeaders() },
  });
  return handleJsonResponse<TodoOut[]>(res);
}

export async function createTodo(input: { title: string; description?: string }): Promise<TodoOut> {
  const res = await fetch(`${BASE}/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  return handleJsonResponse<TodoOut>(res);
}

export async function updateTodo(id: number, input: Partial<{ title: string; description: string; done: boolean }>): Promise<TodoOut> {
  const res = await fetch(`${BASE}/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  return handleJsonResponse<TodoOut>(res);
}

export async function deleteTodo(id: number): Promise<void> {
  const res = await fetch(`${BASE}/todos/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok && res.status !== 204) {
    await handleJsonResponse(res);
  }
}

// -------- Admin --------
export async function adminListUsers(): Promise<UserOut[]> {
  const res = await fetch(`${BASE}/admin/users`, {
    headers: { ...authHeaders() },
  });
  return handleJsonResponse<UserOut[]>(res);
}

export async function adminUpdateUser(
  userId: number,
  changes: Partial<{ make_admin: boolean; verify_email: boolean; deactivate: boolean }>
): Promise<UserOut> {
  const params = new URLSearchParams();
  if (typeof changes.make_admin === "boolean") params.append("make_admin", String(changes.make_admin));
  if (typeof changes.verify_email === "boolean") params.append("verify_email", String(changes.verify_email));
  if (typeof changes.deactivate === "boolean") params.append("deactivate", String(changes.deactivate));

  const res = await fetch(`${BASE}/admin/users/${userId}?${params.toString()}`, {
    method: "PATCH",
    headers: { ...authHeaders() },
  });
  return handleJsonResponse<UserOut>(res);
}

export async function adminListTodos(): Promise<AdminTodoOut[]> {
  const res = await fetch(`${BASE}/admin/todos`, {
    headers: { ...authHeaders() },
  });
  return handleJsonResponse<AdminTodoOut[]>(res);
}

export async function adminDeleteTodo(id: number): Promise<void> {
  const res = await fetch(`${BASE}/admin/todos/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok && res.status !== 204) {
    await handleJsonResponse(res);
  }
}

export function isLoggedIn(): boolean {
  const t = getToken();
  return !!t && !isTokenExpired(t);
}
