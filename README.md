# CinePillos

CinePillos is a small self-hosted web app for organising film nights with
friends. A group keeps a shared board of film proposals, schedules a session,
and votes on which of the proposed films to watch. One instance can host
several independent groups, and everything a group does stays private to
that group.

![Home page](docs/screenshot-home.png)

## Stack

Next.js (App Router) with React server components, Prisma over Postgres
(hosted on [Neon](https://neon.tech)), NextAuth with Google as the only
provider, and TMDB for film search, posters, metadata and avatars. No CSS framework:
design tokens in `src/app/globals.css` plus CSS Modules.

## Environment

Copy `.env.example` to `.env` and fill it in.

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Neon's pooled Postgres connection string, used by the running app. |
| `DATABASE_URL_UNPOOLED` | Neon's direct Postgres connection string, used by `prisma migrate`. Named to match what Vercel's Neon integration provisions automatically. |
| `TMDB_API_KEY` | TMDB v3 API key. Without it, search returns nothing instead of crashing. |
| `NEXTAUTH_SECRET` | Signs the session cookies. `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | Public origin of the app, no trailing slash. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth client from the Google Cloud console. Redirect URI is `<NEXTAUTH_URL>/api/auth/callback/google`. |
| `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL` | Read by `prisma db seed` to create the first administrator. `SEED_ADMIN_EMAIL` must be the Google account they sign in with — there is no password. |

## Running it locally

```bash
npm ci
npx prisma migrate dev
npx prisma db seed      # creates the admin from SEED_ADMIN_* above
npm run dev             # http://localhost:6889
```

Any reachable Postgres works for local development, including a throwaway
container:

```bash
docker run -d --name cinepillos-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=cinepillos -p 5432:5432 postgres:16-alpine
```

with `DATABASE_URL` and `DATABASE_URL_UNPOOLED` both set to
`postgresql://postgres:postgres@localhost:5432/cinepillos`.

Sign in as the seeded administrator, then create the real accounts and groups
from `/admin`.

## Accounts and groups

Signing in with Google creates an account on the spot; there is no invite
needed to use the app. From there, anyone can create their own club from
"Crear club" — that makes them its `OWNER`, the only role that can close the
voting on a session. A regular user can own up to 3 clubs, an admin up to 100
(checked server-side in `POST /api/groups`). `/admin` still exists for
pre-provisioning a user by email before their first Google sign-in and for
adding an existing user to a group by hand; it no longer creates groups
itself. Members can change their own name from `/settings`, and delete their
account entirely from there too — see `/privacy` for what that removes.

Avatars come only from TMDB: `/settings` lets a member search a film, then
pick one of its textless posters or a cast member's photo as their avatar.
There is no Google photo sync and no Gravatar fallback, and the backend never
stores a URL a client sent as-is — a poster path has to still be present in a
fresh TMDB response for that movie, and a cast photo is resolved from the
person's TMDB id rather than a path at all (`/api/users/[id]/avatar`).
Anyone without a chosen avatar gets the bundled `public/default-avatar.svg`.

An owner (or a site admin) can also invite people straight from `/g/<groupId>/members`:
generating a link there creates an `Invitation` with an expiry, and anyone who
opens `/invite/<token>` while signed in can join through it, capped at 30
members per group. Members can leave a group on their own, and an owner can
remove someone else; both go through the same
`/api/groups/<groupId>/members/<userId>` route. Accepting an invitation is the
one deliberate exception to every other group guard: it is the only route
that grants access to a group the caller is not yet a member of, and it never
touches `requireGroupMember` to do it — see `resolveInvitationState` in
`src/lib/invitations.ts`.

Every group-scoped URL carries the group id (`/g/<groupId>/...`), and every API
route under `/api/groups/<groupId>` checks membership before it reads or writes
anything. A group URL can be shared safely: a non-member gets a 403, not an
empty page.

## Deployment

The app is meant to run on [Vercel](https://vercel.com) (Hobby plan) with a
[Neon](https://neon.tech) Postgres database: push to the connected repo, set
the environment variables above in the Vercel project, and Vercel builds and
deploys on every push. There is no persistent disk to manage.

For self-hosting, `docker compose up -d` builds the image and starts both the
app (port 6889) and its own Postgres, with a named volume so the database
survives restarts. Copy `.env.example` to `.env` and fill in `TMDB_API_KEY`,
`NEXTAUTH_SECRET`, `NEXTAUTH_URL` and the Google OAuth pair — the
`DATABASE_URL`/`DATABASE_URL_UNPOOLED` in `.env` are ignored in this setup,
since `docker-compose.yml` points the app at the bundled `postgres` service
instead. The entrypoint runs `prisma migrate deploy` on every start, so the
schema is ready by the time the app comes up.

The runtime image only ships the Prisma CLI, not `tsx`, so `prisma db seed`
can't run inside the `cinepillos` container. The bundled Postgres is published
to `127.0.0.1:5432`, so seed the admin from the host instead, from a checkout
with `npm ci` already run:

```bash
DATABASE_URL="postgresql://cinepillos:cinepillos@localhost:5432/cinepillos" \
DATABASE_URL_UNPOOLED="postgresql://cinepillos:cinepillos@localhost:5432/cinepillos" \
npx prisma db seed
```

If you want to put the app behind a reverse proxy or a tunnel, or point it at
an external Postgres instead of the bundled one, add a
`docker-compose.override.yml` (not tracked by git) instead of editing
`docker-compose.yml`.

## Tests

```bash
npm run lint             # eslint, warnings included
npm test                 # unit + integration
npm run test:unit        # mocked Prisma, response shapes
npm run test:integration # real Postgres, group isolation
npm run test:e2e         # Playwright layout checks (needs npx playwright install)
```

The integration project needs a real Postgres reachable via `DATABASE_URL`/
`DATABASE_URL_UNPOOLED` — see the throwaway container command above. `global-setup.ts`
runs `prisma migrate deploy` once per `vitest` run; every test file then
shares that one database, and `resetDatabase()` (in `factories.ts`) empties it
before each individual test, so nothing leaks between tests or files. CI spins
up its own disposable Postgres via a GitHub Actions service container, so
nothing needs to be provisioned by hand there. These are where the cross-group
access rules are pinned down: a member of one group must get a 403 on every
route of another, never a 200 with empty data.

The Playwright suite starts its own dev server on a freshly seeded database and
checks the pages for elements that stick out of the viewport, at a 375px phone
width and at desktop width.

GitHub Actions runs lint, tests and build on every push and pull request.

![Voting room on a phone](docs/screenshot-mobile.png)

## License

[AGPL-3.0](LICENSE).
