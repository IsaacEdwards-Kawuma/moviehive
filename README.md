# Movie Hive – Netflix-Style Streaming Platform

Production-ready, full-featured streaming platform with multi-profile support, watch history, My List, search, recommendations, and HLS streaming.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, Framer Motion, Zustand, TanStack Query
- **Backend:** Node.js, Express, Prisma, PostgreSQL
- **Shared:** TypeScript types and constants in `packages/shared`

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Database

Using Docker:

```bash
docker-compose up -d postgres
```

Set in `apps/server/.env`:

```env
DATABASE_URL="postgresql://stream:stream@localhost:5432/stream?schema=public"
PORT=4000
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
```

### 3. Initialize database and seed

```bash
cd apps/server
npx prisma generate
npx prisma db push
npx prisma db seed
cd ../..
```

### 4. Run development

From repo root:

```bash
npm run dev
```

- **Frontend:** http://localhost:3000  
- **API:** http://localhost:4000  

Next.js rewrites `/api/server/*` to the backend, so the frontend uses the same origin for API calls.

### 5. First use

1. Open http://localhost:3000  
2. Sign up (any email / password 8+ chars)  
3. Create a profile  
4. Browse, search, add to My List, and play (test HLS stream from seed).

### 6. Admin vs user

- **New signups** get role `USER` and see the normal app (home, profiles, browse, etc.).
- **Admins** have role `ADMIN`: after login they are redirected to **Admin Dashboard** (`/admin`) with stats and user management. They can switch to the normal app via the header “STREAM” or “Back to app”.
- To create the first admin: set one user’s `role` to `ADMIN` in the database (e.g. run `npx prisma studio` in `apps/server`, open the `User` table, edit a user and set `role` to `ADMIN`). After that, that account can promote others from the Admin dashboard.

## Project Structure

```
├── apps/
│   ├── server/          # Express API
│   │   ├── prisma/      # Schema, migrations, seed
│   │   └── src/
│   │       ├── routes/  # Auth, content, watch-history, my-list, search, etc.
│   │       ├── lib/      # Prisma, auth helpers
│   │       └── middleware/
│   └── web/             # Next.js 14 app
│       └── src/
│           ├── app/     # Pages (home, watch, title, profiles, search, my-list, browse)
│           ├── components/
│           ├── lib/     # API client, auth
│           ├── store/    # Zustand (auth, profile)
│           └── hooks/
├── packages/
│   └── shared/          # Types, constants, utils
├── docker-compose.yml   # PostgreSQL, Redis
├── package.json         # Workspace root
└── README.md
```

## API Overview

| Area        | Examples |
|------------|----------|
| Auth       | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Profiles   | `GET/POST/PUT/DELETE /api/profiles` |
| Content    | `GET /api/content`, `GET /api/content/:id`, `GET /api/content/trending` |
| Episodes   | `GET /api/content/:id/episodes` |
| Watch      | `GET/POST /api/watch-history`, `GET /api/watch-history/continue-watching` |
| My List    | `GET /api/my-list`, `POST /api/my-list`, `DELETE /api/my-list/:contentId` |
| Search     | `GET /api/search?q=...`, `GET /api/search/suggest`, `GET /api/search/genres` |
| Recommendations | `GET /api/recommendations/for-you`, `GET /api/recommendations/similar/:id` |
| Stream     | `GET /api/stream/:contentId/url`, `GET /api/stream/episode/:episodeId/url` |
| Payments   | `GET /api/payments/subscription/status`, `POST /api/payments/subscribe` |
| Notifications | `GET /api/notifications`, `PATCH /api/notifications/:id/read` |
| Ratings    | `POST /api/ratings`, `GET /api/ratings/:contentId` |

All authenticated routes expect `Authorization: Bearer <accessToken>` or cookie `accessToken`.

## Video Streaming

- Seed data uses a public test HLS URL (Mux). For production:
  - Store video files or HLS manifests on S3/R2 and serve via CDN.
  - Set `CDN_URL` in the server env; stream routes will prefix URLs with it.
- For full HLS support in all browsers, consider adding **hls.js** or **Video.js** in the frontend (e.g. in `VideoPlayer`).

## Environment variables

### Server (`apps/server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Min 32 chars; used for access tokens and stream proxy |
| `JWT_REFRESH_SECRET` | Yes | Min 32 chars; used for refresh tokens |
| `CORS_ORIGIN` | Yes (prod) | Comma-separated frontend origins (e.g. `https://moviehive.vercel.app`) |
| `PORT` | No | Default `4000` |
| `UPLOAD_DIR` | No | Path for uploaded files; default `uploads` |
| `CDN_URL` | No | Base URL for CDN (e.g. Bunny Pull Zone) |
| `RATE_LIMIT_MAX` | No | Max requests per IP per 15 min; default `500` |
| Google OAuth | No | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` (see DEPLOYMENT.md) |

### Frontend (Vercel / `.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | API base URL; when on `*.vercel.app` defaults to Render API URL |

### Health check

- **GET** `/api/health` — returns `{ status: 'ok', timestamp }`. Use this for uptime checks or load balancers.

## Deployment Checklist

- [ ] Set `DATABASE_URL` (e.g. Neon, Render PostgreSQL)
- [ ] Set `JWT_SECRET` and `JWT_REFRESH_SECRET` (strong, random)
- [ ] Set `CORS_ORIGIN` to your frontend URL(s)
- [ ] Run `prisma migrate deploy` or `db push` (in `apps/server`)
- [ ] Frontend: set `NEXT_PUBLIC_API_URL` if frontend and API are on different domains
- [ ] Video hosting: see **docs/BUNNY_SETUP.md** for Bunny CDN; set `CDN_URL` if using a CDN base URL
- [ ] Full deployment steps: see **DEPLOYMENT.md**

## Scripts

| Command        | Description                    |
|----------------|--------------------------------|
| `npm run dev`  | Run backend + frontend         |
| `npm run build`| Build shared, server, web      |
| `npm run db:push`   | Push Prisma schema (apps/server) |
| `npm run db:seed`   | Seed database (apps/server)    |
| `npm run db:studio` | Open Prisma Studio (apps/server) |

## License

MIT.
