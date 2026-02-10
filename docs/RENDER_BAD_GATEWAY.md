# Fix Render "Bad Gateway" / Service Unavailable

If you see **Bad Gateway** or **This service is currently unavailable** when opening `https://moviehive-api.onrender.com` (or your API URL), the API service is not running. Follow these steps.

## 1. Fix the Start Command (most common cause)

Render may be using an **old start command** that fails (e.g. runs `prisma db push` without `--accept-data-loss` and the process exits before the server starts).

1. Go to **[Render Dashboard](https://dashboard.render.com)** → open your **moviehive-api** (or API) service.
2. Click **Settings** in the left sidebar.
3. Scroll to **Build & Deploy**.
4. Set **Start Command** to **exactly**:
   ```bash
   cd apps/server && node dist/index.js
   ```
5. Set **Pre-Deploy Command** to (runs after build, before start; applies DB schema):
   ```bash
   cd apps/server && npx prisma db push --accept-data-loss --skip-generate
   ```
   If your service was created from the repo’s `render.yaml`, this may already be set when you sync the Blueprint.
6. Click **Save Changes**.
7. Go to **Manual Deploy** → **Deploy latest commit** (or wait for the next auto deploy).

The start command only runs the Node server. The pre-deploy command runs Prisma so the schema (including the `slug` column) is applied before each deploy. If the start command was the old `npx prisma db push --skip-generate && node dist/index.js`, it failed on the schema change and the service never started → Bad Gateway.

## 2. Check the logs

1. In Render → your API service → **Logs**.
2. Look for:
   - **"Server running on http://localhost:4000"** → API started; if you still get Bad Gateway, wait 30–60 s (cold start) and try again.
   - **"Use the --accept-data-loss flag"** or **"Exited with status 1"** → Start command is wrong; use step 1.
   - **"Error: P1001: Can't reach database"** → `DATABASE_URL` is wrong or Neon DB is paused; fix the env var or wake the DB in Neon.

## 3. Confirm environment variables

In Render → **Environment**:

- **DATABASE_URL** – Neon connection string (e.g. `postgresql://...?sslmode=require`).
- **CORS_ORIGIN** – Your frontend URL, e.g. `https://your-app.vercel.app` (no trailing slash).
- **JWT_SECRET** and **JWT_REFRESH_SECRET** – Set (Render can generate).

Save and redeploy if you change any.

## 4. Test the API

After a deploy, open:

- `https://YOUR-API-URL.onrender.com/api/health`

You should see: `{"status":"ok","timestamp":"..."}`. If you get 502 or timeout, check the logs again; the first request after a cold start can take ~30 seconds on the free tier.
