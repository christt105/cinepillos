# CinePillos

CinePillos is a small self-hosted web app for organising film nights with
friends. A group keeps a shared board of film proposals, schedules a session,
and votes on which of the proposed films to watch. One instance can host
several independent groups, and everything a group does stays private to
that group.

![Home page](docs/screenshot-home.png)

## Stack

Next.js (App Router) with React server components, Prisma over SQLite, NextAuth
with a credentials provider, and TMDB for film search, posters and metadata. No
CSS framework: design tokens in `src/app/globals.css` plus CSS Modules.

## Environment

Copy `.env.example` to `.env` and fill it in.

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | SQLite file. `file:./dev.db` locally, `file:../data/club.db` in the container. |
| `TMDB_API_KEY` | TMDB v3 API key. Without it, search returns nothing instead of crashing. |
| `NEXTAUTH_SECRET` | Signs the session cookies. `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | Public origin of the app, no trailing slash. |
| `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Read by `prisma db seed` to create the first administrator. There is no default password. |

## Running it locally

```bash
npm ci
npx prisma migrate dev
npx prisma db seed      # creates the admin from SEED_ADMIN_* above
npm run dev             # http://localhost:6889
```

Sign in as the seeded administrator, then create the real accounts and groups
from `/admin`.

## Accounts and groups

There is no open registration. An administrator creates users from `/admin`
(name, optional email, and a PIN they sign in with), creates groups, and adds
users to them. The first member of a group is its `OWNER`; only an owner can
close the voting on a session. Members can change their own name, avatar and
PIN from `/settings`.

Every group-scoped URL carries the group id (`/g/<groupId>/...`), and every API
route under `/api/groups/<groupId>` checks membership before it reads or writes
anything. A group URL can be shared safely: a non-member gets a 403, not an
empty page.

## Deployment

```bash
docker compose up -d
```

This pulls the published image (`ghcr.io/christt105/cinepillos`) and starts
the app on port 6889. To build from source instead, use
`docker compose up -d --build`.

Two directories next to the compose file are mounted into the container:

- `data/` holds `club.db`, which is the entire database. Back it up.
- `public/uploads/` holds uploaded avatars.

The container runs `prisma migrate deploy` on start, so a new migration is
applied when the image restarts. `npm run backup` (`scripts/backup-db.sh`)
writes a timestamped copy into `data/backups` and prunes copies older than a
week.

If you want to put the app behind a reverse proxy or a tunnel, add a
`docker-compose.override.yml` (not tracked by git) instead of editing
`docker-compose.yml`.

## Tests

```bash
npm run lint             # eslint, warnings included
npm test                 # unit + integration
npm run test:unit        # mocked Prisma, response shapes
npm run test:integration # real SQLite, group isolation
npm run test:e2e         # Playwright layout checks (needs npx playwright install)
```

The integration project builds a migrated template database once per run under
`.tmp/` and copies it per test file, so the tests never touch a real database
and leave nothing behind. They are where the cross-group access rules are
pinned down: a member of one group must get a 403 on every route of another,
never a 200 with empty data.

The Playwright suite starts its own dev server on a freshly seeded database and
checks the pages for elements that stick out of the viewport, at a 375px phone
width and at desktop width.

GitHub Actions runs lint, tests and build on every push and pull request.

![Voting room on a phone](docs/screenshot-mobile.png)
