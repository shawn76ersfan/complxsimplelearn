# Branching workflow

`main` is production. Vercel deploys every push to `main`, so nothing lands there
without going through a pull request. All work happens on branches.

## Branch map

| Branch | Owns | Key paths |
|---|---|---|
| `main` | Production. Merge target for every PR. | — |
| `feature/stark` | Stark AI chat, RAG index, resume coach | `src/app/(auth)/stark`, `src/components/stark`, `convex/chat.ts`, `convex/conversations.ts`, `convex/embeddings.ts`, `convex/knowledge.ts`, `convex/resumeCoach.ts`, `convex/resumePdf.ts`, `convex/starkResumeFiles.ts` |
| `feature/curriculum` | Tracks, lessons, quizzes, games, curriculum CMS, seed content | `src/app/(auth)/learn`, `src/components/learn`, `src/components/game`, `convex/tracks.ts`, `convex/lessons.ts`, `convex/curriculum.ts`, `convex/curriculumAdmin.ts`, `convex/attempts.ts`, `convex/seed.ts` |
| `feature/homework` | Assignments, submissions, grading | `src/app/(auth)/homework`, `convex/assignments.ts`, `convex/submissions.ts` |
| `feature/teacher-hub` | Teacher dashboard, students, calendar, email, quote of the week, feedback inbox, invitations, enrollments | `src/app/(teacher)`, `src/components/teacher`, `convex/calendar.ts`, `convex/email.ts`, `convex/emailMutations.ts`, `convex/quotes.ts`, `convex/feedback.ts`, `convex/invitations.ts`, `convex/enrollments.ts` |
| `feature/videos` | Class video uploads and playback (Cloudflare R2) | `src/app/(auth)/videos`, `src/components/videos`, `convex/videos.ts` |
| `feature/marketing` | Landing page, pamphlet, info-session registration | `src/app/page.tsx`, `src/app/pamphlet`, `src/components/marketing`, `convex/infoSessions.ts`, `convex/infoSessionActions.ts` |
| `feature/auth-profile` | Sign-in/up, onboarding, profile, student dashboard, user sync | `src/app/sign-in`, `src/app/sign-up`, `src/app/(auth)/profile`, `src/app/(auth)/dashboard`, `src/app/(auth)/layout.tsx`, `convex/users.ts`, `convex/init.ts` |

Shared code (`convex/schema.ts`, `src/components/layout`, `src/app/layout.tsx`,
`next.config.ts`) belongs to whichever feature needs the change. Keep those
edits small and call them out in the PR description.

## Day-to-day

Start from an up-to-date feature branch:

```bash
git checkout feature/stark
git pull
```

Do the work, commit in small pieces, push:

```bash
git add -A
git commit -m "Stark: keep the composer pinned while streaming."
git push
```

Open a PR into `main` when the slice is ready:

```bash
gh pr create --base main --fill
```

Vercel builds a preview deployment for the PR. Check it, merge on GitHub, then
sync your branch back to `main` so the next slice starts clean:

```bash
git checkout main
git pull
git checkout feature/stark
git merge main
git push
```

## Short-lived branches

For a fix or chore that does not fit one feature, branch off `main` with a
descriptive prefix and delete it after the PR merges:

- `fix/<what>` — bug fix (`fix/stark-scroll-lock`)
- `chore/<what>` — tooling, deps, docs (`chore/upgrade-next`)
- `hotfix/<what>` — urgent production fix, merged straight to `main`

## Convex and Clerk on branches

- Feature branches share the same Convex dev deployment. Schema changes in
  `convex/schema.ts` deploy as soon as `npx convex dev` picks them up, so keep
  schema edits backward-compatible until they merge.
- The Vercel build is plain `next build`; it does not deploy Convex. When a PR
  merged to `main` touches `convex/`, run `npx convex deploy` yourself so the
  production backend matches the production frontend.
- Vercel preview deployments talk to whichever `NEXT_PUBLIC_CONVEX_URL` is set
  for the Preview environment in Vercel. Point that at the dev deployment so a
  preview never writes to production data.
- New environment variables go in `.env.example` in the same PR that needs them.

## Rules of thumb

- One feature area per PR. If a change touches two areas, split it.
- Rebase or merge `main` into your branch before opening a PR so the diff is
  only your work.
- Never force-push `main`.
- `npm run lint` and `npm run build` should pass before you open the PR.
