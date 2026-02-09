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

## Deploy the latest (after you’ve already set up Vercel + Render)

Once the repo is connected to Vercel and Render, deploying your latest code is:

1. **Push to GitHub** (from your project folder):
   ```bash
   cd "c:\Users\kasac\Desktop\all stuf\CODES\Stream Website"
   git add .
   git commit -m "Your short message (e.g. Add default genres for admin)"
   git push origin main
   ```
2. **Frontend (Vercel)** — usually deploys automatically when you push `main`. To force a new deploy: [vercel.com](https://vercel.com) → your project → **Deployments** → **Redeploy** on the latest, or push a new commit.
3. **Backend (Render)** — usually deploys automatically when you push `main`. To force a new deploy: [render.com](https://render.com) → your **moviehive-api** service → **Manual Deploy** → **Deploy latest commit**.

Wait a few minutes for both to finish. Then test the live site and API.

---

## Step 2: Push Code to GitHub (first-time only)

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

5. **Environment Variables** — scroll to **"Environment"** / **"Environment Variables"**:
   - **Option A (Import from .env):** Click **"Add from .env"** or **"Import"**, then paste the contents of your local `env.render.txt` (in the project root). Fill it with your real values; the file is gitignored so it never gets committed. One paste adds all variables.
   - **Option B (manual):** Add each variable **one by one** (Key = name, Value = value):

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
   - **Root Directory:** set to **`apps/web`** (so Vercel detects Next.js; the web app is self-contained with no monorepo dependency)
   - **Install Command:** `npm install`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

4. Add **Environment Variables**:
   - **Import from .env:** In **Settings → Environment Variables**, click **"Import from .env"** and paste the contents of `env.vercel.example` (or a file with just `NEXT_PUBLIC_API_URL=https://YOUR-RENDER-URL.onrender.com/api`). Replace the URL with your real Render API URL.
   - Or add manually:

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

**Sign in or sign up with Google:** The same button works for both. New users get an account and a default profile automatically.

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Click on your OAuth client
3. Add to **Authorized JavaScript origins:**
   - `https://moviehive.com`
   - `https://www.moviehive.com`
   - If you use a Vercel preview URL for the app, add it too (e.g. `https://moviehive-xxx.vercel.app`)
4. Add to **Authorized redirect URIs:**
   - `https://moviehive-api.onrender.com/api/auth/google/callback` (use your actual Render API host)
5. Save

When the frontend is on a Vercel URL (`CORS_ORIGIN` contains `vercel.app`), the backend does not set a cookie domain so redirect and token-in-URL auth work correctly. For a custom domain, you can set `COOKIE_DOMAIN` (e.g. `.moviehive.com`) on the server if you want cookies to apply across subdomains.

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

## Local vs production: how it’s wired

| | Local | Production (web) |
|---|--------|------------------|
| **Frontend** | `http://localhost:3000` (or Next.js dev) | Vercel: `https://moviehive.com` or `https://xxx.vercel.app` |
| **Backend API** | `http://localhost:4000` | Render: `https://moviehive-api.onrender.com` |
| **How frontend finds API** | Uses `/api/server` → Next.js rewrites to `localhost:4000` (see `next.config.js`) | Uses `NEXT_PUBLIC_API_URL` set on Vercel (e.g. `https://moviehive-api.onrender.com/api`). If unset and on `*.vercel.app`, falls back to hardcoded Render URL. |
| **Auth cookies** | `sameSite: 'lax'`, `httpOnly` | `sameSite: 'none'`, `secure: true` so cookies work cross-origin (Vercel ↔ Render). |
| **CORS** | Allows `http://localhost:3000` | Render `CORS_ORIGIN` must list your frontend origin(s), e.g. `https://moviehive.com,https://www.moviehive.com` or your Vercel URL. |

**If the site works locally but not on the web:**

1. **Vercel env** – In Vercel → Project → Settings → Environment Variables, add:
   - `NEXT_PUBLIC_API_URL` = `https://moviehive-api.onrender.com/api` (or your real Render API URL; no trailing slash except `/api`).
   - Redeploy after changing env.
2. **Render CORS** – In Render → Service → Environment, set:
   - `CORS_ORIGIN` = your frontend URL(s), e.g. `https://moviehive.com,https://www.moviehive.com` or `https://your-app.vercel.app`.
3. **Cold start** – On Render free tier the service sleeps; the first request after 15 min can take ~30 s. Refresh or wait and try again.

---

## Multiple users and devices

The app supports **different accounts** and **multiple devices** at the same time.

- **Different accounts** – Each person has their own account (email/password or Google). User A on a phone and User B on a laptop can both be logged in and watch different content at the same time. There is no “one account for the whole app” limit.
- **Same account on multiple devices** – One account can be used on several devices (e.g. phone, tablet, TV). Each device has its own session (its own login token). Logging in on a new device does **not** log out other devices. All can watch at the same time.
- **How it works** – Each device stores its own auth token (in cookies/localStorage). The backend does not invalidate previous tokens when you log in elsewhere. Access tokens are refreshed automatically when they expire, so sessions stay active on each device.

So: different users on different devices, and the same user on different devices, can all use the app and watch different things at the same time.

---

## Video playback on production

**Why video works locally but not on the web**

- **Locally:** Uploaded videos are saved to your machine (e.g. `apps/server/uploads/videos/`). The stream URL points to `http://localhost:4000/uploads/videos/xxx.mp4`, which is served from that folder.
- **On Render:** The filesystem is **ephemeral**. Any file you upload is lost on the next deploy or when the service restarts. So `/uploads/videos/xxx.mp4` either never exists or disappears, and playback fails (404 or “format not supported” when the response isn’t a valid video).

**How to have working video on the web**

1. **Use a full video URL (recommended)**  
   Don’t upload the file to the backend. Host the video elsewhere and paste the link when adding content:
   - **Cloudinary** (free tier): upload at [cloudinary.com](https://cloudinary.com), get a URL like `https://res.cloudinary.com/your-cloud/video/upload/xxx.mp4`.
   - **AWS S3 / R2 / Backblaze B2**: make the file public or use a signed URL and put that in **Video URL** in the admin form.
   - In Admin → Content → Add/Edit content, leave “Video file” empty and paste the full URL in **“Or paste video URL”** (or the Video URL field). The app stores that URL and plays it as-is.

2. **Optional: Cloud storage from admin**  
   You can later add an upload flow that sends files from the browser to Cloudinary/S3 and then saves the returned URL into your content. The current “upload video” in admin saves to the server disk, which is only suitable for local use.

---

## Troubleshooting

- **"Too many requests" when logging in**  
  The API rate-limits requests per IP (default 500 per 15 minutes). For many users, set a higher limit on Render: **Environment** → add `RATE_LIMIT_MAX` = `2000` or `3000`. Redeploy after changing. Trade-off: higher values give more headroom for real traffic but less protection against a single abusive IP; 2000–3000 is usually fine for a growing app.

- **CORS errors:** Make sure `CORS_ORIGIN` on Render includes your exact frontend domain
- **Google OAuth fails:** Ensure the callback URL in Google Console matches `GOOGLE_CALLBACK_URL` exactly
- **Database connection fails:** Check the Neon connection string includes `?sslmode=require`
- **Build fails on Vercel:** Ensure root directory is set to `apps/web`
- **Free tier cold starts:** Render free tier sleeps after 15min of inactivity — first request takes ~30s

### Browser console: font preload, cookies, OpaqueResponseBlocking

- **“Preloaded with link preload was not used within a few seconds”**  
  The app uses `next/font` with the font applied on `<body>`. If you still see this, it’s often a timing quirk in dev or on Vercel previews and can be ignored, or try a hard refresh.

- **“Cookie __Secure-YENID / __Secure-YEC has been rejected (cross-site, SameSite Lax/Strict)”**  
  These cookies are from **Vercel** (e.g. Analytics or Speed Insights), not from your app. They are set with SameSite=Lax/Strict, so the browser rejects them in cross-site contexts (e.g. if the page is embedded or opened in a different frame). You can ignore these, or disable Vercel Analytics/Speed Insights in the Vercel project settings if you don’t need them.

- **“A resource is blocked by OpaqueResponseBlocking”** (e.g. for a `.jpg` filename)  
  Often the **Video URL** was set to a poster/image or YouTube link by mistake. The player now shows a clear error for those. Use only a **direct video URL** (MP4/WebM) in the Video URL field. Poster images go in Poster URL; YouTube links go in Trailer URL.

- **“Cross-Origin Request Blocked” for youtu.be / youtube.com** and **“Media load paused”**  
  The **Video URL** must be a direct link to an MP4/WebM file (e.g. from Cloudinary), not a YouTube page link. YouTube links cannot be played in the `<video>` element (CORS/redirects). Put YouTube links only in the **Trailer** field. The app will show a message if a YouTube or image URL is used as the video source.
