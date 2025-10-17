# Multi-User Todo Platform

Full-stack implementation of a multi-tenant task manager with segregated user/admin roles, email verification, and a polished React UI based on the _Multi-User Todo App UI Kit_.

---

## Feature Highlights

- **Authentication & Verification**
  - Email registration with password hashing (`pbkdf2_sha256`).
  - Verification tokens stored server-side and printed as mock “emails”.
  - JWT-based login; tokens persisted in localStorage via the frontend helper.
  - Automatic redirect to the verification screen when login is attempted with an unverified account.

- **User Experience**
  - Responsive React + Vite interface with theme toggle (green/pink).
  - Personal todo dashboard (`MyTodos`) with create/update/delete capabilities.
  - Guided verification form that accepts pasted tokens or auto-detects query params.
  - Rate limiting on the API to deter brute force attempts.

- **Admin Capabilities**
  - `AdminUsers` screen to view all users and adjust flags (admin role, email verified, active status).
  - `AdminTodos` screen to list and manage todos across all users with search and filtering.
  - User deletion is intentionally disabled in the UI (see Future Enhancements).

- **Tech Stack**
  - Backend: FastAPI, SQLAlchemy (SQLite), Passlib, PyJWT.
  - Frontend: React (Vite, SWC), TypeScript, Tailwind-inspired utility classes.
  - Tooling: Sonner toasts, Radix UI components, class-variance-authority.

---

## Project Structure

```
Project5/
├─ backend/
│  ├─ main.py                  # FastAPI application entry point
│  ├─ todos.db                 # SQLite database (created at runtime)
│  └─ postman_collections/     # Postman collections for API testing
├─ frontend/
│  ├─ src/
│  │  ├─ App.tsx               # Frontend root with routing & auth flow
│  │  ├─ components/
│  │  │  ├─ Layout.tsx         # Authenticated shell
│  │  │  ├─ screens/           # Login, Register, VerifyEmail, MyTodos, Admin views, etc.
│  │  │  └─ ui/                # Reusable UI primitives (Button, Table, Dialogs...)
│  │  └─ lib/api.ts            # REST client aimed at FastAPI backend
│  ├─ package.json
│  └─ vite.config.ts           # Vite config & proxy to FastAPI at /api
├─ venv/
└─ README.md
```

---

## Prerequisites

- **Python 3.11+** (virtual environment recommended)
- **Node.js 18+** and npm
- **PowerShell** for provided commands (on Windows)

Optional: Postman or curl for direct API testing.

---

## Backend Setup (FastAPI)

From `Project5/`:

```powershell
python -m venv venv
venv\Scripts\Activate.ps1
# If you have a requirements file, use it (adjust path if needed):
# pip install -r backend/requirements.txt
# Otherwise install dependencies manually:
pip install fastapi uvicorn sqlalchemy passlib pyjwt pydantic email-validator python-multipart

python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

### Environment Variables

`backend/main.py` honors several optional variables:

- `DATABASE_URL` (default: SQLite file next to `backend/main.py`, i.e. `backend/todos.db`)
- `SECRET_KEY` (default development key in file)
- `ACCESS_TOKEN_EXPIRE_MINUTES` (default: 60)

Tokens & verification data are stored in SQLite by default. To reset data during development, stop the server and delete `backend/todos.db` (and any `todos.db-wal`/`todos.db-shm` sidecar files).

### Key Endpoints (excerpt)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Create account, emit verification token |
| `GET` | `/auth/verify-email?token=` | Validate token, mark email as verified |
| `POST` | `/auth/login` | Exchange credentials for JWT (`username` field holds the email) |
| `GET` | `/todos` | List authenticated user todos |
| `POST` | `/todos` | Create todo (user scope) |
| `PATCH`/`DELETE` | `/todos/{id}` | Update or remove user’s own todo |
| `GET` | `/admin/users` | List users (admin only) |
| `PATCH` | `/admin/users/{user_id}` | Toggle admin/verification/active flags |
| `GET` | `/admin/todos` | Review all todos |
| `DELETE` | `/admin/todos/{id}` | Remove any todo |

Additional middleware: rate limiting per IP/user, health check at `/health`.

---

## Frontend Setup (React + Vite)

From `Project5/frontend/`:

```powershell
npm install
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:8000` (FastAPI). Restart the dev server after editing proxy config or when backend routes change.

### App Navigation Summary

- `Login` – Authenticates the user, stores JWT, and routes to the dashboard. Unverified accounts trigger an automatic redirect to the verification screen.
- `Register` – Creates accounts and immediately navigates to the verification page.
- `VerifyEmail` – Accepts manual token entry or parses `?token=` from the URL. Locked-out logins redirect here.
- `MyTodos` – CRUD for the authenticated user’s todos. Requires verified email.
- `AdminUsers` – Admin-only view with drawers to modify flags. User deletion is disabled in the UI.
- `AdminTodos` – Admin overview with search, status filtering, and bulk deletion actions.
- `Settings` – Theme management and placeholder for future preferences.

### Auth Handling

Frontend uses `src/lib/api.ts`:

- `register()` / `verifyEmail()` / `login()` / `logout()` manage session state.
- Token helpers store & retrieve `access_token` and current email from `localStorage`.
- `isLoggedIn()` validates token freshness via `exp` claim.

---

## Account Lifecycle

1. **Register** via UI or Postman (`POST /auth/register`). Backend prints verification URL with the token.
2. **Verify** using the React UI (paste token) or direct HTTP GET.
3. **Login**; JWT saved locally and used for authenticated requests. Unverified users are blocked (HTTP 403) until verification.
4. **Todo Management** – Verified users can create, update, toggle, and delete their own tasks.
5. **Admin Management** – Admins can:
   - Promote/demote admins.
   - Manually verify or deactivate users.
   - Review all todos.

---

## Testing & Troubleshooting

- **500 on registration** – Likely due to duplicate emails (case sensitive). Normalize emails or delete existing records in `backend/todos.db`.
- **403 on login** – Email not verified; check FastAPI console for the token and verify.
- **405 method not allowed** – Ensure the request path includes the resource ID and that FastAPI server is restarted after route changes.
- **CORS issues** – Use the provided Vite proxy (`/api`). Direct Postman requests must include proper headers.
- **Rate limit hits** – Wait for window reset (see `SimpleRateLimiter` in `backend/main.py`).

---

## Run with Docker Compose

To run the full stack in containers (FastAPI + React + Nginx):

```powershell
# From the project root
docker compose build
docker compose ps
docker compose up -d

# Then open
Frontend: http://localhost:3000
Backend docs: http://localhost:8000/docs

# To stop the containers
docker compose down -v

# To stop the containers (and delete the database volume):
docker compose down -v
```
---

## View the Database

```powershell
# Then open Open a shell inside the backend container
docker compose exec backend sh

# Open SQLite and load the DB
sqlite3 /data/todos.db

# List all tables
.tables

# See a table’s structure
PRAGMA table_info(users);

# Preview the data
SELECT * FROM users;
SELECT * FROM todos;
SELECT * FROM email_verification_tokens;

# Make a user admin
UPDATE users SET is_admin = 1 WHERE email = 'admin@example.com';

# Exit SQLite and container, Inside SQLite:
.exit

# Exit SQLite and container, Then back in shell:
exit
```
