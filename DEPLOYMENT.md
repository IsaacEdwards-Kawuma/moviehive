# Movie Hive — Deployment Guide

Deploy Movie Hive to **moviehive.com** using free-tier services.

## Architecture

```
moviehive.com  →  Vercel (Next.js frontend)
api.moviehive.com  →  Render (Express backend)
Database  →  Neon (PostgreSQL)
Domain DNS  →  Spaceship
```

---

## Step 1: Set Up the Database (Neon)

1. Go to [https://neon.tech](https://neon.tech) and create a free account
2. Click **"New Project"** → Name it `moviehive`
3. Select a region close to you (e.g., `US East`)
4. After creation, copy the **connection string** — it looks like:
   ```
   postgresql://username:password@ep-xxxx.us-east-2.aws.neon.tech/moviehive?sslmode=require
   ```
5. Save this — you'll need it for the backend

---

## Step 2: Push Code to GitHub

1. Create a new repository on [GitHub](https://github.com/new)
   - Name: `moviehive` (or anything you like)
   - Private or Public — your choice
2. Push your code:
   ```bash
   cd "c:\Users\kasac\Desktop\all stuf\CODES\Stream Website"
   git init
   git add .
   git commit -m "Movie Hive - initial deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/moviehive.git
   git push -u origin main
   ```

---

## Step 3: Deploy the Backend (Render)

1. Go to [https://render.com](https://render.com) and sign up (use GitHub).
2. Click **"New +"** → **"Web Service"**.
3. Connect your GitHub account if needed, then select the **moviehive** repository.
4. **Where to put everything on Render:**

   **Main form (scroll down to see all fields):**
   - **Name:** `moviehive-api`
   - **Region:** Oregon (or closest to you)
   - **Branch:** `main`
   - **Root Directory:** leave **empty**
   - **Runtime:** `Node`
   - **Build Command:** paste this exactly:
     ```
     npm install && cd apps/server && npx prisma generate && cd ../.. && npm run build -w @stream/shared && npm run build:server
     ```
   - **Start Command:** paste this exactly:
     ```
     cd apps/server && npx prisma db push --skip-generate && node dist/index.js
     ```
   - **Plan:** Free

5. **Environment Variables** — scroll to the **"Environment"** or **"Environment Variables"** section, click **"Add Environment Variable"**, and add these **one by one** (Key = name, Value = value):

   | Key | Value (paste or type) |
   |-----|----------------------|
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` |
   | `DATABASE_URL` | Your Neon connection string (from Neon dashboard, e.g. `postgresql://user:pass@host/db?sslmode=require`) |
   | `JWT_SECRET` | Any long random string (e.g. 64 characters). Or in Render click "Generate" if available. |
   | `JWT_REFRESH_SECRET` | Another long random string (different from JWT_SECRET). Or "Generate" if available. |
   | `CORS_ORIGIN` | `https://moviehive.com,https://www.moviehive.com` (or use your Vercel URL for now, e.g. `https://moviehive-xxx.vercel.app`) |
   | `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID from Google Cloud Console (e.g. `xxxxx.apps.googleusercontent.com`) |
   | `GOOGLE_CLIENT_SECRET` | Your Google OAuth Client Secret from Google Cloud Console |
   | `GOOGLE_CALLBACK_URL` | **After** you create the service, Render gives you a URL like `https://moviehive-api.onrender.com`. Then set this to: `https://moviehive-api.onrender.com/api/auth/google/callback` (replace `moviehive-api` with your actual service name if different). |

   **Note:** If you don’t have a custom domain yet, set `CORS_ORIGIN` to your Vercel URL (you’ll get it in Step 4, e.g. `https://moviehive-abc123.vercel.app`). You can change it to `https://moviehive.com` later.

6. Click **"Create Web Service"** and wait for the first deploy (can take a few minutes).
7. Once live, your API URL will be something like `https://moviehive-api.onrender.com`. Open `https://YOUR-SERVICE-NAME.onrender.com/api/health` — you should see `{"status":"ok"}`.
8. If you used a placeholder for `GOOGLE_CALLBACK_URL`, go to the service **Environment** tab, set `GOOGLE_CALLBACK_URL` to `https://YOUR-SERVICE-NAME.onrender.com/api/auth/google/callback`, and save (Render will redeploy).

---

## Step 4: Deploy the Frontend (Vercel)

1. Go to [https://vercel.com](https://vercel.com) and sign up (use GitHub)
2. Click **"Add New Project"** → Import your `moviehive` repo
3. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`
   - **Build Command:** `cd ../.. && npm install && npm run build -w @stream/shared && cd apps/web && npm run build`
   - **Install Command:** `cd ../.. && npm install`
   - **Output Directory:** `.next`

4. Add **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://moviehive-api.onrender.com/api` |

5. Click **"Deploy"** and wait
6. Note your Vercel URL: `https://moviehive-xxx.vercel.app`

---

## Step 5: Configure Custom Domain on Vercel

1. In Vercel, go to your project → **Settings** → **Domains**
2. Add `moviehive.com`
3. Vercel will show you DNS records to add. Usually:
   - `A` record: `76.76.21.21` for `moviehive.com`
   - `CNAME` record: `cname.vercel-dns.com` for `www.moviehive.com`

---

## Step 6: Configure DNS on Spaceship

1. Log in to [Spaceship](https://www.spaceship.com)
2. Go to your domain `moviehive.com` → **DNS Settings**
3. Add these DNS records:

   **For the frontend (Vercel):**
   | Type | Host | Value | TTL |
   |------|------|-------|-----|
   | `A` | `@` | `76.76.21.21` | 3600 |
   | `CNAME` | `www` | `cname.vercel-dns.com` | 3600 |

   **For the backend API (optional subdomain):**
   If you want `api.moviehive.com` to point directly to Render:
   | Type | Host | Value | TTL |
   |------|------|-------|-----|
   | `CNAME` | `api` | `moviehive-api.onrender.com` | 3600 |

4. Save and wait 5-30 minutes for DNS propagation

---

## Step 7: Update Google OAuth for Production

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Click on your OAuth client
3. Add to **Authorized JavaScript origins:**
   - `https://moviehive.com`
   - `https://www.moviehive.com`
4. Add to **Authorized redirect URIs:**
   - `https://moviehive-api.onrender.com/api/auth/google/callback`
5. Save

---

## Step 8: Update Render Environment (after DNS is ready)

Once your custom domain works, update these in Render:

| Key | New Value |
|-----|-----------|
| `CORS_ORIGIN` | `https://moviehive.com,https://www.moviehive.com` |
| `GOOGLE_CALLBACK_URL` | `https://moviehive-api.onrender.com/api/auth/google/callback` |

---

## Step 9: Seed the Database

After backend deploys, seed your production database:

Option A — Use Render Shell:
1. Go to Render → your service → **Shell**
2. Run:
   ```bash
   cd apps/server && npx tsx prisma/seed.ts
   ```

Option B — Connect from local:
1. Set your local `.env` DATABASE_URL to the Neon connection string
2. Run: `npm run db:seed`

---

## Summary of URLs

| Service | URL |
|---------|-----|
| Frontend | `https://moviehive.com` |
| API | `https://moviehive-api.onrender.com` |
| Database | Neon dashboard at neon.tech |
| DNS | Spaceship dashboard |

---

## Troubleshooting

- **CORS errors:** Make sure `CORS_ORIGIN` on Render includes your exact frontend domain
- **Google OAuth fails:** Ensure the callback URL in Google Console matches `GOOGLE_CALLBACK_URL` exactly
- **Database connection fails:** Check the Neon connection string includes `?sslmode=require`
- **Build fails on Vercel:** Ensure root directory is set to `apps/web`
- **Free tier cold starts:** Render free tier sleeps after 15min of inactivity — first request takes ~30s
