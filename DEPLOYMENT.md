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

1. Go to [https://render.com](https://render.com) and sign up (use GitHub)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo (`moviehive`)
4. Configure:
   - **Name:** `moviehive-api`
   - **Region:** Oregon (or closest)
   - **Branch:** `main`
   - **Root Directory:** (leave empty)
   - **Runtime:** Node
   - **Build Command:**
     ```
     npm install && cd apps/server && npx prisma generate && cd ../.. && npm run build -w @stream/shared && npm run build -w @stream/server
     ```
   - **Start Command:**
     ```
     cd apps/server && npx prisma db push --skip-generate && node dist/index.js
     ```
   - **Plan:** Free

5. Add **Environment Variables** (click "Advanced" → "Add Environment Variable"):

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` |
   | `DATABASE_URL` | `postgresql://...` (your Neon connection string) |
   | `JWT_SECRET` | (click "Generate" for a random value) |
   | `JWT_REFRESH_SECRET` | (click "Generate" for a random value) |
   | `CORS_ORIGIN` | `https://moviehive.com,https://www.moviehive.com` |
   | `GOOGLE_CLIENT_ID` | `265156455711-u2gj4sjp6qv26f01f2k8edasd98rkf4m.apps.googleusercontent.com` |
   | `GOOGLE_CLIENT_SECRET` | (your Google client secret) |
   | `GOOGLE_CALLBACK_URL` | `https://moviehive-api.onrender.com/api/auth/google/callback` |

6. Click **"Create Web Service"** and wait for deployment
7. Note your Render URL: `https://moviehive-api.onrender.com`
8. Test: visit `https://moviehive-api.onrender.com/api/health` — should return `{"status":"ok"}`

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
