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
   - `TEACHER_EMAIL` = Cassandra's exact sign-up email
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

## Teacher Access

Whoever signs up with the email set in `TEACHER_EMAIL` (env var) automatically gets the teacher role and can access `/teacher/dashboard`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npx convex dev` | Start Convex dev server (run in separate terminal) |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
