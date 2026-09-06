# Bailanysta

Bailanysta is a small social network: users register, publish short text posts, browse a chronological feed of everyone's posts, like and comment on posts, and manage their own posts from a profile page. Light/dark theme choice is remembered per browser.

- **Live app:** _add your deployed frontend URL here after deploying_
- **Live API:** _add your deployed backend URL here after deploying_

## Tech stack

- **Backend:** Python, FastAPI, SQLAlchemy 2.0, Alembic, Postgres (SQLite for local dev), JWT auth via `python-jose` + `passlib`/bcrypt.
- **Frontend:** React 19 + TypeScript, Vite, React Router. No UI component library — hand-written CSS with variables for the theme system.

**Why this stack:** the author's primary language is Python, so a Python backend (FastAPI) was chosen over a Node/Next.js backend to work in a familiar, productive language while still meeting the "own API" requirement. FastAPI specifically was picked over Django/Flask for its async support, automatic OpenAPI docs (useful for manually exercising the API while building the frontend), and first-class Pydantic validation. The frontend is a separate React SPA (not server-rendered) so the backend stays a pure JSON API — this keeps "all external calls happen server-side" trivially true, since the browser only ever talks to our own API. Postgres was chosen for the deployed environment for real concurrent-write safety and relational integrity on the like/comment tables (unique constraint on `(post_id, user_id)` for likes prevents duplicate likes at the database level); SQLite is used as the zero-setup default for local development.

## Project structure

```
bailanysta/
  backend/   FastAPI app, SQLAlchemy models, Alembic migrations, pytest suite
  frontend/  Vite + React + TypeScript SPA
```

Each subdirectory is self-contained (own dependency manifest, own `.env.example`).

## Running locally

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # defaults to a local SQLite file if left untouched
alembic upgrade head
uvicorn app.main:app --reload
```

The API is now at `http://localhost:8000` (interactive docs at `/docs`).

Run the test suite with:

```bash
python -m pytest
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # VITE_API_BASE_URL, defaults to http://localhost:8000
npm run dev
```

The app is now at `http://localhost:5173`. Register a new account, then use the feed and profile pages.

## Design & development process

The project was built backend-first: data model (users, posts, comments, likes) → auth → CRUD/feed endpoints → automated tests, then the frontend was layered on top of a working, tested API. This ordering meant every frontend screen was built against a real, already-verified contract instead of guessing at shapes and reconciling later.

Key structural decisions:

- **Ownership checks live in the backend, not just hidden in the UI.** Editing/deleting a post or comment checks `author_id` against the authenticated user server-side (403 if mismatched) — the frontend also hides those buttons for other users' posts, but that's a UX nicety, not the security boundary.
- **Post serialization is centralized.** A single `_serialize_posts` helper (backend/app/routers/posts.py) computes `like_count`, `comment_count`, and `liked_by_me` in batched queries (grouped by post id) rather than N+1 queries per post, and is reused by the feed, profile, and single-post-mutation endpoints so all three stay consistent.
- **Theme and auth token are both persisted via `localStorage`** and read synchronously on load (see `ThemeContext`/`AuthContext`), so a page reload never causes a visible flash of the wrong theme or an unnecessary bounce to `/login` while the `/users/me` check is in flight.
- **Optional auth dependency for public-but-personalized reads.** `GET /posts` and `GET /users/{username}` work for anonymous callers, but if a valid token is present they also return `liked_by_me` for the viewer — done via a `get_current_user_optional` FastAPI dependency that returns `None` instead of raising on a missing/invalid token, rather than duplicating the route logic per auth state.

## Testing

Backend: `pytest` covers the register/login flow (including duplicate-email/wrong-password rejection) and the post CRUD ownership rules (a user cannot edit or delete another user's post), plus the like/comment counters on the feed response.

Frontend: manually verified end-to-end in a real browser (Playwright-driven, run once during development and not kept in the repo) covering register → create post → like → comment → keyword search → dark/light theme toggle with persistence across reload → profile view → edit own post → logout → login again with the edit intact, and confirmed a second user's feed does not show Edit/Delete controls on someone else's post.

## Unique approaches / methodology

- Deliberately avoided a component library or CSS framework so the theme-toggle bonus feature could be implemented with a small, auditable set of CSS custom properties (`:root` / `[data-theme="dark"]`) rather than fighting a third-party theming system.
- The like/unlike button in `PostCard` updates optimistically (flips state immediately, rolls back on request failure) so liking feels instant even on a slow connection, while comments and post edits wait for the server response since their content isn't known until the server confirms it.

## Trade-offs

- **Custom JWT auth instead of a library** (e.g. Auth.js/NextAuth): more code to own, but no framework "magic" to explain or debug, and it keeps the backend framework-agnostic from the auth layer's perspective.
- **Separate SPA + API instead of a single full-stack framework** (e.g. Next.js): two deployables and a CORS boundary to manage, in exchange for using Python on the backend and keeping the frontend a plain, portable React app.
- **Scoped bonus features:** implemented theme toggle and likes/comments; did not implement follow/subscriptions, notifications, or AI content generation, to keep the surface area small enough to fully test rather than partially implementing everything.
- **No pagination on the feed:** `GET /posts` returns every post. Fine for a demo/bootcamp dataset size; would need cursor-based pagination before real growth.
- **SQLite for local dev, Postgres in production:** convenient locally, but means local dev never exercises Postgres-specific behavior (e.g. exact error messages) — acceptable for this project's size, worth revisiting if the schema grows more complex.

## Known limitations

- No image/media attachments on posts (explicitly optional per the spec).
- No pagination or infinite scroll on the feed — every post loads at once.
- Search is a client-side substring filter over already-loaded posts, not a server-side search endpoint — fine at small scale, would need to move server-side (and probably add an index) at real scale.
- No password reset / email verification flow.
- No rate limiting on auth endpoints.

## Deployment

- **Backend:** containerized with the included `Dockerfile` (runs `alembic upgrade head` then `uvicorn`); deploy as a web service on Render (or any container host) with `DATABASE_URL`, `JWT_SECRET`, and `ALLOWED_ORIGINS` set as environment variables, backed by a managed Postgres instance.
- **Frontend:** static Vite build (`npm run build` → `dist/`) deployed to Vercel, with `VITE_API_BASE_URL` set to the deployed backend's URL.
