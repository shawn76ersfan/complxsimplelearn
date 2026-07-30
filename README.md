# ComplxSimple

Interactive CS learning platform for Cassandra Carter's students.
Built with Next.js 16, Convex, Clerk, Tailwind CSS, and Resend.

## Features

- **Learning Tracks**: Hardware, AI, Cybersecurity, HTML, Linux (and more via seed)
- **Interactive Lessons**: Content, quizzes, games, and mandatory activities
- **Progress Tracking**: % completion per track, scores, XP, and streaks
- **Class Videos**: Teachers upload long recordings (Cloudflare R2); students watch on `/videos`
- **Stark**: Course-aware AI chat with RAG over lessons and teacher knowledge docs
- **Teacher Dashboard**: Scores, students, homework, calendar, email, quote of the week, knowledge base
- **Dark / Light Mode**: System preference + manual toggle
- **Responsive**: Mobile, tablet, and desktop

## Architecture documentation

- [Stark RAG implementation guide](docs/rag/README.md)
- [Public Stark RAG architecture case study](https://github.com/shawn76ersfan/stark-rag-architecture)

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
   - `RESEND_API_KEY` = your Resend key
   - `FROM_EMAIL` = your verified sender email
   - **Class videos (R2):** `R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_TOKEN` — see `.env.example` for setup notes (Cloudflare R2 bucket + CORS)

### 4. Set up Resend (Email)

1. Go to [resend.com](https://resend.com) → Create API key
2. Add to `.env.local` and to Convex dashboard environment variables

### 5. Create `.env.local`

```bash
cp .env.example .env.local
# Fill in all values
```

### 6. Seed initial content

After `npx convex dev` is running, in the Convex dashboard:
- Go to **Functions** → `seed.seedAll` → **Run**

This creates all 4 tracks and their lessons.

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
