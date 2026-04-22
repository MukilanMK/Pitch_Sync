# Deploying PitchSync (Render + Vercel)

This repo is split into:

- **`server/`** — Node.js (Express) API, MongoDB via Mongoose → deploy on **Render** as a Web Service.
- **`client/`** — React (Vite) SPA → deploy on **Vercel**.

The client calls the API using `VITE_API_URL` (see `client/.env.example`). The API allows that frontend origin via `CLIENT_ORIGIN` (CORS).

---

## Prerequisites

1. Code pushed to a Git host **GitHub, GitLab, or Bitbucket** (both Render and Vercel connect via Git).
2. A **MongoDB** database reachable from the internet. The easiest option is **[MongoDB Atlas](https://www.mongodb.com/atlas)** (free tier is fine). You need a connection string (`MONGO_URI`).

---

## Part A — MongoDB Atlas (if you do not already have a database)

1. Create an Atlas account and a **cluster**.
2. **Database Access** → create a database user (username + password).
3. **Network Access** → add your IP, or for a simple setup add **`0.0.0.0/0`** (allow from anywhere) and use a strong password. Tighten this later if you need to.
4. **Clusters** → **Connect** → **Drivers** → copy the connection string.
5. Replace `<password>` (and `<dbname>` if you use one) in the URI. Example shape:

   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/psynccur?retryWrites=true&w=majority`

   This full string is your **`MONGO_URI`** for Render.

---

## Part B — Deploy the API on Render

1. Sign in at [render.com](https://render.com) and connect your Git provider.
2. **New** → **Web Service**.
3. Select this repository.
4. Configure the service:

   | Setting | Value |
   |---------|--------|
   | **Root Directory** | `server` |
   | **Runtime** | Node |
   | **Build Command** | `npm install` (or `npm ci` for reproducible installs from `package-lock.json`) |
   | **Start Command** | `npm start` |

5. **Instance type** — choose a paid plan if you need the API to stay warm; the free tier **spins down after inactivity** (cold starts).

6. **Environment** → add variables:

   | Variable | Description |
   |----------|-------------|
   | `MONGO_URI` | Your Atlas (or other) MongoDB connection string. **Required** — the app exits on startup if this is missing. |
   | `JWT_SECRET` | A long random string used to sign tokens. **Required** for auth to work. |
   | `CLIENT_ORIGIN` | Your **production** Vercel site URL, e.g. `https://pitch-sync.vercel.app` (no trailing slash). Set this after you have the Vercel URL (see Part C), then save and redeploy. If unset on Render, CORS falls back to reflecting the request origin (works for any allowed browser origin). |
   | `JWT_EXPIRES_IN` | Optional. Default in code is `7d`. |
   | `PORT` | **Do not set manually on Render** — Render injects `PORT`. The server already uses `process.env.PORT \|\| 5000`. |

7. Create the Web Service and wait for the first deploy to finish.
8. Note the public URL, e.g. `https://your-api-name.onrender.com`.
9. Quick check: open `https://your-api-name.onrender.com/api/health` — you should see JSON like `{ "ok": true, "name": "PitchSync API" }`. The site root `/` redirects there; a `HEAD /` probe returning **204** is normal.

**Reading deploy logs:** `Build successful` and **Your service is live** mean the deploy worked. A line like `injected env (0) from .env` comes from **dotenv** v17 (often with a promotional tip); `(0)` means no variables were taken from a `.env` file on that run. **`PitchSync API listening`** should show your public URL on Render (via `RENDER_EXTERNAL_URL`), not “localhost” as the real hostname.

**CORS note:** `CLIENT_ORIGIN` is passed into `createApp()` in `server/src/app.js`. If it is unset, the code uses `origin: true`, which reflects the request origin. On Render, the server **does not load `server/.env`** (see `server/src/server.js`), so a committed local `.env` cannot force `http://localhost:5173` in production. Set `CLIENT_ORIGIN` to your exact Vercel URL for an explicit allowlist.

---

## Part C — Deploy the client on Vercel

1. Sign in at [vercel.com](https://vercel.com) and **Add New** → **Project**.
2. Import the **same** Git repository.
3. Configure the project:

   | Setting | Value |
   |---------|--------|
   | **Root Directory** | `client` (use “Edit” next to the root if needed) |
   | **Framework Preset** | Vite (Vercel usually detects this) |
   | **Build Command** | `npm run build` (default for Vite) |
   | **Output Directory** | `dist` (Vite default) |
   | **Install Command** | `npm install` (default) |

4. **Environment Variables** (Production — and Preview if you want preview deployments to hit a real API):

   | Variable | Example |
   |----------|---------|
   | `VITE_API_URL` | `https://your-api-name.onrender.com/api` |

   Use your **exact** Render URL, **with** `/api` at the end (the Express app mounts routes under `/api`).

5. Deploy. After deploy, copy your production URL, e.g. `https://your-app.vercel.app`.

6. **Finish CORS:** In Render → your Web Service → **Environment** → set `CLIENT_ORIGIN` to that Vercel URL (no trailing slash). **Save** and trigger a **manual deploy** or restart so the new value is picked up.

---

## Recommended order of operations

1. Create **MongoDB** and obtain **`MONGO_URI`**.
2. Deploy **Render** with `MONGO_URI` and `JWT_SECRET`. You may leave `CLIENT_ORIGIN` empty for the first deploy if you accept reflected CORS, or redeploy once the Vercel URL exists.
3. Deploy **Vercel** with `VITE_API_URL` pointing at Render’s `/api`.
4. Set **`CLIENT_ORIGIN`** on Render to the **Vercel production URL** and redeploy/restart the API.

---

## Local development reminder

- `client/.env.example` shows `VITE_API_URL=http://localhost:5000/api` for local Vite.
- Server expects `MONGO_URI`, `JWT_SECRET`, and optionally `CLIENT_ORIGIN` (e.g. `http://localhost:5173` for Vite’s dev server).

---

## Troubleshooting

| Symptom | Things to check |
|---------|------------------|
| API fails to start on Render | Logs for `MONGO_URI is missing` or Mongo connection errors; Atlas **Network Access** must allow Render’s egress (often `0.0.0.0/0` during setup). |
| `Invalid scheme, expected connection string to start with "mongodb://"` | The URI must start **once** with `mongodb+srv://` or `mongodb://`. Do not prefix with `mongodb:` or paste a label like `MONGO_URI=` into the value field on Render — only the URI itself. Special characters in the password must be [URL-encoded](https://www.mongodb.com/docs/manual/reference/connection-string/) in the URI. |
| Browser shows CORS errors | `CLIENT_ORIGIN` on Render must match the **exact** origin you use in the browser (scheme + host, no path). Include `https://` for production (e.g. `https://pitch-sync.vercel.app`). If the error says `Access-Control-Allow-Origin` is `http://localhost:5173`, Render is still using a local dev value — often from a **committed `server/.env`**. Set `CLIENT_ORIGIN` in the Render dashboard to your Vercel URL, redeploy, and **do not commit** `.env` (see `server/.gitignore`). |
| Frontend calls wrong host | `VITE_API_URL` is baked in at **build time** on Vercel. Change the env var and **redeploy** the frontend. |
| Auth always fails | `JWT_SECRET` set on Render; same secret must be used for all instances if you scale later. |
| First request after idle is slow | Render free tier cold start; upgrade or use a keep-alive ping only if your plan allows it. |

---

## Security checklist (production)

- Use a strong, unique **`JWT_SECRET`**.
- Prefer **`CLIENT_ORIGIN`** set to your real Vercel URL instead of a wildcard.
- Restrict **MongoDB Atlas** network access when you no longer need open `0.0.0.0/0`.
- Keep dependencies updated and review Render/Vercel security settings for your org.
