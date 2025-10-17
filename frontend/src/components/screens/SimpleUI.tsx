import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  isLoggedIn,
  getCurrentEmail,
  login as apiLogin,
  register as apiRegister,
  verifyEmail as apiVerify,
  logout as apiLogout,
  listMyTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  type TodoOut,
} from "../../lib/api";

export function SimpleUI() {
  const [loggedIn, setLoggedIn] = useState<boolean>(isLoggedIn());
  const [email, setEmail] = useState<string>(getCurrentEmail() || "");
  const [password, setPassword] = useState<string>("");
  const [mode, setMode] = useState<"login" | "register" | "verify">("login");

  const [verifyToken, setVerifyToken] = useState<string>("");

  const [todos, setTodos] = useState<TodoOut[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newDesc, setNewDesc] = useState<string>("");

  const loadTodos = async () => {
    try {
      setLoading(true);
      const data = await listMyTodos();
      setTodos(data);
    } catch (err: any) {
      toast.error(String(err?.data?.detail || err?.message || "Failed to load todos"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loggedIn) loadTodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  const handleRegister = async () => {
    try {
      setLoading(true);
      await apiRegister(email, password);
      toast.success("Registered! Check the API console for a verification URL.");
      setMode("verify");
    } catch (err: any) {
      toast.error(String(err?.data?.detail || err?.message || "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyToken) {
      toast.error("Paste the token from the API console.");
      return;
    }
    try {
      setLoading(true);
      await apiVerify(verifyToken);
      toast.success("Email verified! You can now login.");
      setMode("login");
    } catch (err: any) {
      toast.error(String(err?.data?.detail || err?.message || "Verification failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      await apiLogin(email, password);
      setLoggedIn(true);
      toast.success("Logged in");
    } catch (err: any) {
      toast.error(String(err?.data?.detail || err?.message || "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    apiLogout();
    setLoggedIn(false);
    setTodos([]);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      setLoading(true);
      const created = await createTodo({ title: newTitle.trim(), description: newDesc.trim() });
      setTodos([created, ...todos]);
      setNewTitle("");
      setNewDesc("");
    } catch (err: any) {
      toast.error(String(err?.data?.detail || err?.message || "Create failed"));
    } finally {
      setLoading(false);
    }
  };

  const toggleDone = async (t: TodoOut) => {
    try {
      const updated = await updateTodo(t.id, { done: !t.done });
      setTodos(todos.map((x) => (x.id === t.id ? updated : x)));
    } catch (err: any) {
      toast.error(String(err?.data?.detail || err?.message || "Update failed"));
    }
  };

  const handleDelete = async (t: TodoOut) => {
    try {
      await deleteTodo(t.id);
      setTodos(todos.filter((x) => x.id !== t.id));
    } catch (err: any) {
      toast.error(String(err?.data?.detail || err?.message || "Delete failed"));
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Simple Todo UI</h1>

      {!loggedIn ? (
        <div style={{ border: "1px solid #D8E8DA", borderRadius: 12, padding: 16, background: "#fff" }}>
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => setMode("login")}
              style={{ marginRight: 8, padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc" }}
            >
              Login
            </button>
            <button
              onClick={() => setMode("register")}
              style={{ marginRight: 8, padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc" }}
            >
              Register
            </button>
            <button
              onClick={() => setMode("verify")}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc" }}
            >
              Verify Email
            </button>
          </div>

          {mode !== "verify" && (
            <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
              />
              <input
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
              />
            </div>
          )}

          {mode === "register" && (
            <button disabled={loading} onClick={handleRegister} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #2E7D32", color: "#fff", background: "#2E7D32" }}>
              {loading ? "Registering..." : "Register"}
            </button>
          )}

          {mode === "login" && (
            <button disabled={loading} onClick={handleLogin} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #2E7D32", color: "#fff", background: "#2E7D32" }}>
              {loading ? "Logging in..." : "Login"}
            </button>
          )}

          {mode === "verify" && (
            <div style={{ display: "grid", gap: 8 }}>
              <input
                placeholder="Paste verification token"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
              />
              <button disabled={loading} onClick={handleVerify} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #2E7D32", color: "#fff", background: "#2E7D32" }}>
                {loading ? "Verifying..." : "Verify Email"}
              </button>
              <div style={{ fontSize: 12, color: "#2F4F3E" }}>
                Tip: After registering, the API prints a verification link in the server console.
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 600 }}>Welcome, {getCurrentEmail() || "user"}</div>
              <div style={{ fontSize: 12, color: "#2F4F3E" }}>You can create, toggle, and delete todos.</div>
            </div>
            <button onClick={handleLogout} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc" }}>Logout</button>
          </div>

          <div style={{ border: "1px solid #D8E8DA", borderRadius: 12, padding: 16, background: "#fff", marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Add Todo</h2>
            <div style={{ display: "grid", gap: 8 }}>
              <input
                placeholder="Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
              />
              <textarea
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc", minHeight: 60 }}
              />
              <button disabled={loading} onClick={handleCreate} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #2E7D32", color: "#fff", background: "#2E7D32", alignSelf: "flex-start" }}>
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>

          <div style={{ border: "1px solid #D8E8DA", borderRadius: 12, padding: 16, background: "#fff" }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>My Todos</h2>
            {loading && todos.length === 0 ? (
              <div>Loading...</div>
            ) : todos.length === 0 ? (
              <div style={{ color: "#2F4F3E" }}>No todos yet.</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                {todos.map((t) => (
                  <li key={t.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, textDecoration: t.done ? "line-through" : "none" }}>{t.title}</div>
                      {t.description && <div style={{ fontSize: 12, color: "#2F4F3E" }}>{t.description}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <label style={{ fontSize: 12 }}>
                        <input type="checkbox" checked={t.done} onChange={() => toggleDone(t)} /> Done
                      </label>
                      <button onClick={() => handleDelete(t)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E53935", background: "#fff", color: "#E53935" }}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
