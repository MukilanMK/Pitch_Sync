# PitchSync Deployment Guide (Render + Vercel)

This project has two parts:

- `server/` -> Express API (deploy to Render)
- `client/` -> Vite React app (deploy to Vercel)

Follow the steps in order.

## 1) Prepare your repository

1. Push your code to GitHub/GitLab/Bitbucket.
2. Make sure both folders are present in the same repo:
   - `server`
   - `client`

## 2) Create MongoDB database (Atlas)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and create a cluster.
2. Create a DB user (username/password).
3. In Network Access, allow access (`0.0.0.0/0`) for initial setup.
4. Copy your connection string from Atlas Driver connection.
5. Replace placeholders like `<password>` and keep the full URI.

You will use this as `MONGO_URI` in Render.

## 3) Deploy backend (`server`) on Render

1. Go to [Render](https://render.com) -> New -> Web Service.
2. Connect and select your repo.
3. Configure:
   - Root Directory: `server`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add environment variables:
   - `MONGO_URI` = your Atlas URI
   - `JWT_SECRET` = long random secret string
   - `JWT_EXPIRES_IN` = `7d` (optional)
   - `CLIENT_ORIGIN` = leave empty for now (set after Vercel deploy)
5. Click Deploy.
6. After deploy, copy your backend URL:
   - Example: `https://your-api.onrender.com`
7. Test health endpoint:
   - `https://your-api.onrender.com/api/health`
   - It should return JSON with `"ok": true`.

## 4) Deploy frontend (`client`) on Vercel

1. Go to [Vercel](https://vercel.com) -> Add New -> Project.
2. Import the same repository.
3. Configure:
   - Root Directory: `client`
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variable:
   - `VITE_API_URL` = `https://your-api.onrender.com/api`
5. Deploy project.
6. Copy your Vercel app URL:
   - Example: `https://your-app.vercel.app`

## 5) Final CORS setup on Render

1. Open your Render backend service.
2. Set environment variable:
   - `CLIENT_ORIGIN` = your Vercel URL (no trailing slash)
   - Example: `https://your-app.vercel.app`
3. Save and redeploy/restart the Render service.

## 6) Verify end-to-end

1. Open your Vercel frontend URL.
2. Test signup/login.
3. Check browser network tab:
   - Requests should go to Render `/api/...` endpoints.
4. If you see CORS error:
   - Re-check `CLIENT_ORIGIN` on Render exactly matches your Vercel URL.

## 7) Troubleshooting quick fixes

- Backend does not start on Render:
  - Check `MONGO_URI` and `JWT_SECRET` are set.
- Frontend still calling localhost:
  - Update `VITE_API_URL` in Vercel and redeploy.
- Mongo connection fails:
  - Confirm Atlas network access and DB user credentials.
- Slow first API request:
  - Render free tier can cold-start after inactivity.

## Required environment variables summary

### Render (`server`)

- `MONGO_URI` (required)
- `JWT_SECRET` (required)
- `CLIENT_ORIGIN` (required in production for strict CORS)
- `JWT_EXPIRES_IN` (optional, default `7d`)

### Vercel (`client`)

- `VITE_API_URL` (required, must end with `/api`)

