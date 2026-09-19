# ComplxSimple

Interactive CS learning platform for Cassandra Carter's students.
Built with Next.js 16, Convex, Clerk, Tailwind CSS, and Resend.

## Features

- **DevOps & Cloud Tracks**: Linux, AWS, Azure, Git/GitHub, Docker, Kubernetes, Terraform, Ansible, CI/CD, and Monitoring
- **Supplementary Foundations**: Hardware, AI, and Cybersecurity
- **Interactive Lessons**: Content, quizzes, games, and mandatory activities
- **Progress Tracking**: % completion per track, scores, assignment-based levels, and streaks
- **Class Videos**: Teachers upload long recordings (Cloudflare R2); students watch on `/videos`
- **Stark**: Course-aware AI chat with RAG over lessons, homework, quizzes, and teacher knowledge docs
- **Teacher Dashboard**: Scores, students, homework, calendar, email, quote of the week, knowledge base
- **Dark / Light Mode**: System preference + manual toggle
- **Responsive**: Mobile, tablet, and desktop

## Architecture documentation

- [Stark RAG implementation guide](docs/rag/README.md)
- [Public Stark RAG architecture case study](https://github.com/shawn76ersfan/stark-rag-docs)
- [Branching workflow](docs/BRANCHING.md) — `main` is production; work happens on `feature/*` branches and lands via PR

---

## Quick Setup

### 1. Clone & install

```bash
npm install
```

### 2. Set up Convex

```bash
npx convex dev
```

This will open a browser to log in to Convex and create a deployment.
Copy the `NEXT_PUBLIC_CONVEX_URL` it prints into `.env.local`.

### 3. Set up Clerk

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) → Create Application
2. Copy **Publishable Key** and **Secret Key** to `.env.local`
3. Go to **JWT Templates** → **New template** → choose **Convex**
4. Copy the **Issuer URL** (e.g. `https://xxx.clerk.accounts.dev`)
5. In your **Convex dashboard** → Settings → Environment Variables, add:
   - `CLERK_JWT_ISSUER_DOMAIN` = the Issuer URL from step 4
   - `ADMIN_EMAILS` = Cassandra's and the developer's exact sign-up emails, comma-separated (see [Roles & cohorts](#roles--cohorts))
   - **Email (pick one):**
     - **Gmail:** `EMAIL_PROVIDER=gmail`, `GMAIL_USER`, `GMAIL_APP_PASSWORD` (Google [App Password](https://myaccount.google.com/apppasswords))
     - **Resend:** `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `FROM_EMAIL` on a verified domain
   - **Class videos (R2):** `R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_TOKEN` — see `.env.example` for setup notes (Cloudflare R2 bucket + CORS)

### 4. Set up email (Teacher Hub)

**Gmail (typical for Cassandra’s Gmail inbox)**

1. [Google Account → Security](https://myaccount.google.com/security) → enable **2-Step Verification**
2. **App passwords** → create one for **Mail**
3. On **Convex** (dev and `--prod`):

```bash
npx convex env set EMAIL_PROVIDER gmail
npx convex env set GMAIL_USER you@gmail.com
npx convex env set GMAIL_APP_PASSWORD "your app password"
npx convex env set EMAIL_FROM_NAME ComplxSimple
# repeat with --prod for production
```

**Resend** (if you use a verified domain instead): see `.env.example` for `RESEND_API_KEY` and `FROM_EMAIL`.

### 5. Protect public registrations with Turnstile

1. Create a [Cloudflare Turnstile widget](https://dash.cloudflare.com/?to=/:account/turnstile) for your production and local hostnames.
2. Add the public site key to `.env.local` and Vercel:

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key
```

3. Add the secret key to both Convex deployments:

```bash
npx convex env set TURNSTILE_SECRET_KEY your_secret_key
npx convex env set TURNSTILE_SECRET_KEY your_secret_key --prod
```

The backend verifies every token before it can call the internal info-session registration mutation. Duplicate registrations, honeypot submissions, and more than three active registrations per email in 24 hours are also blocked.

### 6. Create `.env.local`

```bash
cp .env.example .env.local
# Fill in all values
```

### 7. Seed initial content

After `npx convex dev` is running, in the Convex dashboard:
- Go to **Functions** → `seed.seedAll` → **Run**

This creates the foundation content. Opening the Teacher Hub as the configured
teacher idempotently adds the DevOps/cloud curriculum, homework, crosswords,
and refreshes Stark's RAG index.

### 7. Start the app

```bash
npm run dev:all
```

Or run `npx convex dev` and `npm run dev` in separate terminals.

Open [http://localhost:3000](http://localhost:3000).

---

## Roles & cohorts

There are three roles:

| Role | Who | Can |
|------|-----|-----|
| **admin** | Cassandra + the developer (`ADMIN_EMAILS`) | Everything: create cohorts, assign instructors, invite teachers, edit curriculum, Stark knowledge, info sessions, quote of the week. Sees every cohort ("Whole program"). |
| **teacher** | Invited from Teacher Hub → Cohorts → Staff, or listed in `TEACHER_EMAILS` | Only the cohorts an admin assigns them to: roster, scores, homework, grading, videos, calendar, announcements, feedback, email. |
| **student** | Invited into a cohort | Their cohort's content plus anything posted program-wide. |

Set `ADMIN_EMAILS` on the Convex deployment (`npx convex env set ADMIN_EMAILS "a@x.com,b@x.com"`, and again with `--prod`). If it is unset, everyone in `TEACHER_EMAILS` (or the legacy `TEACHER_EMAIL`) is treated as an admin, so an existing deployment keeps working.

Students belong to **cohorts** (a class with a start/end date, schedule and meeting link). Assignments, videos, calendar events and announcements can be posted to one cohort or program-wide. Students see their class on the dashboard and at `/cohort`; staff switch cohorts from the strip at the top of the Teacher Hub.

Cassandra's 1:1 office hours use `NEXT_PUBLIC_CALENDLY_URL` (defaults to `https://calendly.com` until her real link is set).

---

## Hosting (Vercel is fine; you are not locked in)

The **website** is Next.js. The **database, auth, files, and email** live on Convex, Clerk, R2, and Gmail/Resend. If Vercel is down, students cannot load the UI, but data is still safe. If Convex is down, the UI loads but live data will not.

Stay on Vercel for day-to-day. If you want a second place you can run yourself:

1. `npm run build` then `node .next/standalone/server.js` (standalone output is enabled in `next.config.ts`).
2. Point that box at the **same** Convex + Clerk env vars as Vercel (`NEXT_PUBLIC_CONVEX_URL`, Clerk keys, `NEXT_PUBLIC_APP_URL` / `SITE_URL`).
3. Put the extra host behind your domain later (Cloudflare DNS can fail over if Vercel is unreachable).

Good second hosts: **Railway**, **Fly.io**, or a cheap **VPS** (Hetzner/DigitalOcean) with Docker. Do **not** try to self-host Convex — keep the backend on Convex Cloud.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npx convex dev` | Start Convex dev server (run in separate terminal) |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
