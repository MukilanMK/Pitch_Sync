# PitchSync Project Documentation

PitchSync is a full-stack cricket turf booking and match management platform built with a React frontend and an Express/MongoDB backend. It supports two user roles:

- `Owner`: manages turfs and handles bookings
- `Player`: books turfs, manages friends, creates matches, scores games, and tracks stats

---

## 1) Project Goals

PitchSync combines booking workflows with live cricket utilities in one system:

- Turf discovery and booking
- Owner-side booking operations (including walk-in/manual bookings)
- Ball-by-ball score tracking
- Match drafting and toss/innings setup
- Personal cricket stats
- Role-based authorization and protected UI routes

---

## 2) Tech Stack

### Frontend (`client/`)

- React (with Vite)
- React Router
- Axios
- Context API for auth/theme state

### Backend (`server/`)

- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- bcrypt password hashing
- CORS + morgan middleware

---

## 3) High-Level Architecture

- Frontend sends requests to backend using `VITE_API_URL`.
- Backend validates JWT via `Authorization: Bearer <token>`.
- Role checks are enforced server-side (`Owner` vs `Player`).
- MongoDB stores users, turfs, bookings, matches, and scorecards.

Request flow:

1. User authenticates (`/api/auth/login` or `/api/auth/register`)
2. Client stores token in local storage (`pitchsync_token`)
3. Protected routes and API calls require valid token
4. Backend decodes token and authorizes by role where required

---

## 4) Folder Structure

```text
psynccur/
  client/                  # React app (Vite)
    src/
      components/
      contexts/
      layouts/
      pages/
      router/
      services/            # API wrappers
  server/                  # Express API
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      utils/
  README.md
  DEPLOYMENT.md
  STEP_BY_STEP_DEPLOYMENT.md
```

---

## 5) Frontend Details

## Routing

Main routes are defined in `client/src/router/AppRouter.jsx`:

- Public:
  - `/` (landing)
  - `/turfs`
  - `/login`
  - `/register`
- Owner-only:
  - `/owner`
- Player-only:
  - `/player`
  - `/match-drafter`
  - `/scorecard/:bookingId`
  - `/match/new`
  - `/match/:id/toss`
  - `/match/:id/score`

Route protection is handled by `client/src/components/ProtectedRoute.jsx`.

## Auth State

Auth is managed through `client/src/contexts/AuthContext.jsx`:

- Bootstraps session with `/auth/me` when token exists
- Stores token in `localStorage` as `pitchsync_token`
- Exposes `login`, `register`, and `logout`
- Uses `isBootstrapping` to avoid route flicker before auth is verified

## API Access Layer

`client/src/services/api.js` creates axios clients with:

- `baseURL = VITE_API_URL` or `http://localhost:5000/api`
- `Authorization` header when token is present
- Shared timeout and request configuration

Other service files (`authService`, `bookingService`, `matchService`, etc.) call endpoint-specific APIs.

---

## 6) Backend Details

## Server Startup

`server/src/server.js`:

- Loads `.env` only when not running on Render
- Connects to Mongo via `MONGO_URI`
- Creates app with CORS config from `CLIENT_ORIGIN`
- Starts server on `PORT` (or `5000` locally)

## App Wiring

`server/src/app.js`:

- Registers middlewares: `cors`, `express.json`, `morgan`
- Exposes health endpoint: `GET /api/health`
- Mounts route modules under `/api/*`
- Uses centralized not-found and error handlers

## Security and Authorization

- `auth` middleware verifies JWT and attaches `req.user`
- `requireRole` middleware enforces route role access
- Passwords are hashed in `User` schema pre-save hook

---

## 7) Data Model (MongoDB Schemas)

## `User`

- `name`
- `userId` (normalized, unique)
- `email` (lowercased, unique)
- `password` (hashed)
- `role` (`Owner` or `Player`)
- `friends` (array of `User` references)

## `Turf`

- `name`
- `location`
- `pricePerHour`
- `facilities[]`
- `ownerId` (`User` reference)

## `Booking`

- `turfId`
- `playerId` (nullable for owner-created/walk-in bookings)
- `date` (`YYYY-MM-DD`)
- `timeSlot` (`HH:MM-HH:MM`)
- `status` (`Pending`, `Confirmed`, `Cancelled`)
- `bookedForName`, `bookedForPhone`
- `createdByRole`, `createdByUserId`
- Unique index on `(turfId, date, timeSlot)` to prevent double-booking

## `Scorecard`

- `bookingId` (unique)
- `totalRuns`, `totalWickets`, `legalDeliveries`
- `striker`, `nonStriker`
- `deliveries[]` (ball-level scoring events with extras/wicket data)

## `Match`

- `type` (`Turf` or `Local`)
- `bookingId` (nullable for local matches)
- `createdByUserId`
- `oversPerInnings`
- `players[]`
- `teamA`, `teamB` (members, guest members, captain, wicket keeper)
- `toss` (`wonBy`, `decision`)
- `innings[]` (stateful innings runtime data)
- `deliveries[]` (ball-by-ball event log)
- `status` (`Setup`, `Toss`, `Live`, `Completed`)

---

## 8) API Endpoints

Base path: `/api`

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me` (auth required)

## Turfs

- `GET /turfs`
- `POST /turfs` (Owner)
- `GET /turfs/mine/list` (Owner)
- `GET /turfs/:id`

## Bookings

- `POST /bookings` (Player)
- `GET /bookings/mine` (Player)
- `GET /bookings/owner` (Owner)
- `PATCH /bookings/:id/status` (Owner)
- `POST /bookings/owner/create` (Owner manual booking)

## Scorecards

- `GET /scorecards/:bookingId`
- `GET /scorecards/:bookingId/stats`
- `POST /scorecards/:bookingId/deliveries`

## Matches

- `GET /matches/mine`
- `POST /matches`
- `GET /matches/:id`
- `POST /matches/:id/toss`
- `POST /matches/:id/innings/setup`
- `POST /matches/:id/deliveries`
- `POST /matches/:id/deliveries/undo`

## Friends

- `GET /friends`
- `POST /friends` (add friend by `userId`)
- `DELETE /friends/:friendId`

## Stats

- `GET /stats/me` (Player)

## Users

- `POST /users/resolve`

---

## 9) Core Workflows

## Owner Workflow

1. Register/login as `Owner`
2. Create/manage turfs
3. View bookings for owned turfs
4. Confirm/cancel player bookings
5. Create owner-side walk-in bookings

## Player Workflow

1. Register/login as `Player`
2. Browse turfs
3. Create bookings
4. View personal bookings
5. Use scorecard and match modules
6. Track personal stats

## Match Flow (Player)

1. Create match (local or turf)
2. Set toss winner and decision
3. Set innings participants (striker/non-striker/bowler)
4. Add deliveries ball-by-ball
5. Undo if needed
6. Match auto-completes when innings limits are reached

---

## 10) Environment Variables

## Backend (`server`)

- `MONGO_URI` (required)
- `JWT_SECRET` (required)
- `JWT_EXPIRES_IN` (optional; defaults to `7d` in logic)
- `CLIENT_ORIGIN` (required for strict production CORS policy)
- `PORT` (provided by hosting platform in production)

## Frontend (`client`)

- `VITE_API_URL` (required in production, should end with `/api`)

---

## 11) Deployment Overview

- Deploy `server/` to Render (Node web service)
- Deploy `client/` to Vercel (Vite app)
- Configure:
  - Vercel: `VITE_API_URL=https://<render-service>/api`
  - Render: `CLIENT_ORIGIN=https://<vercel-site>`

Health check:

- `GET https://<render-service>/api/health` should return `{ ok: true, name: "PitchSync API" }`

---

## 12) CORS and Production Notes

Your frontend and backend are on different domains in production, so CORS must be correct.

If you see browser errors such as:

- `No 'Access-Control-Allow-Origin' header`
- Preflight request blocked

Then verify:

1. `CLIENT_ORIGIN` exactly matches your Vercel origin (including `https://`)
2. `VITE_API_URL` points to Render `/api`
3. Both services are redeployed after env changes

For preview deployments, you may allow multiple origins in `CLIENT_ORIGIN` using a comma-separated list if your CORS logic supports it.

---

## 13) Scripts

## Backend

- `npm run dev` -> start with nodemon
- `npm start` -> start with node

## Frontend

- `npm run dev` -> local Vite dev server
- `npm run build` -> production build
- `npm run preview` -> preview built app
- `npm run lint` -> ESLint

---

## 14) Error Handling and Validation Notes

- Input validation is handled mostly in controllers
- Duplicate slot booking returns `409`
- Missing auth token returns `401`
- Invalid role access returns `403`
- Missing/invalid IDs and domain checks return `400` or `404` as appropriate

---

## 15) Current Strengths and Improvement Opportunities

## Strengths

- Clear role-based route protection
- Good domain separation (auth, booking, scorecard, match, stats)
- Practical cricket scoring logic with undo support
- Simple deployment topology (Render + Vercel)

## Improvement opportunities

- Add automated tests (unit + integration + e2e)
- Add request validation layer (e.g., zod/joi/express-validator)
- Add rate limiting and security hardening middleware
- Add API docs via OpenAPI/Swagger
- Add pagination/filtering for larger datasets
- Add CI checks (lint/test/build) before deploy

---

## 16) Quick Start (Local)

1. Backend:
   - `cd server`
   - copy `.env.example` to `.env`
   - set `MONGO_URI`, `JWT_SECRET`, and optional `CLIENT_ORIGIN`
   - `npm install && npm run dev`

2. Frontend:
   - `cd client`
   - copy `.env.example` to `.env`
   - set `VITE_API_URL=http://localhost:5000/api`
   - `npm install && npm run dev`

3. Open frontend:
   - `http://localhost:5173`

