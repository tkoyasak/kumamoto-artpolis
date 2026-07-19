# Deploy from CI, not Cloudflare's Git integration

Decided 2026-07-20.

## Context

Deployment was manual only: `bun run deploy` (`astro build && wrangler deploy
--strict`) run from a workstation. We wanted pushes to `main` to publish
automatically. Two shapes were candidates:

- **GitHub Actions** — extend the existing `ci` workflow with a deploy job that
  runs after `check`/`test`/`e2e` pass, authenticating to Cloudflare with an
  API token stored as a GitHub secret.
- **Cloudflare Workers Builds** — connect the repo in the Cloudflare dashboard
  and let Cloudflare's build containers build and deploy on push, with no
  GitHub secret.

## Decision

Deploy from GitHub Actions. A `deploy` job in `ci.yaml` `needs: verify`, runs only
on `push` (the `push` trigger is already `main`-only), reinstalls with
`--frozen-lockfile`, and reruns `bun run deploy`. Auth is `CLOUDFLARE_API_TOKEN`
(and `CLOUDFLARE_ACCOUNT_ID`) from GitHub secrets. The deploy job carries its
own `concurrency: { group: deploy, cancel-in-progress: false }` so an in-flight
deploy is never cancelled, unlike the workflow-level group.

Cloudflare Workers Builds was rejected because its build runs in Cloudflare's
container, separate from CI: it would not clear the `check`/`test`/`e2e` gate
(the e2e suite needs system Chrome), so unverified builds could ship; the build
environment would diverge from the CI one; and the build/deploy configuration
would live in the dashboard, outside git, off the review path.

## Consequences

- Only a build that passed the full CI gate — including e2e — is deployed, and
  it is built with the same pinned bun and frozen lockfile as CI.
- The deploy build reruns from a clean checkout (jobs share no filesystem), so
  `dist/` is rebuilt rather than reused from the `verify` job.
- wrangler stays the pinned devDependency; there is no separate action-pinned
  wrangler to drift.
- A one-time manual step remains: create a scoped Cloudflare API token and store
  it (with the account id) as a GitHub Actions secret.
