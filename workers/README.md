# Workers

Five Cloudflare Workers that sit between the site and its demo backends. They are one npm workspace: one `package.json`, one lockfile, shared code in `shared/`.

| Worker | Auth | Serves |
| --- | --- | --- |
| `weather-proxy` | Clerk session token | `GET /v1/weather` |
| `document-scanner-proxy` | Clerk session token | `POST /api/sessions`, `POST /api/sessions/{id}/summary`, `POST /api/sessions/{id}/chat`, `DELETE /api/sessions/{id}` |
| `llm-inference-proxy` | Clerk session token | `POST /` |
| `microagent-proxy` | Clerk session token (in `?auth=`) | WebSocket `GET /ws/run` |
| `github-stats-proxy` | none (public pages call it) | `GET /repo-stats` |

Every gated worker runs the same checks in `shared/src/gate.ts` before it calls an upstream: allowed origin (the site or `localhost`), method, a valid Clerk session token, then a per-user rate limit. Only allowlisted paths, query parameters and headers are forwarded.

## Commands

From `workers/`:

```bash
npm install          # once, installs for all five
npm test             # vitest
npm run typecheck    # tsc for each worker and for the tests
npm run build:check  # wrangler deploy --dry-run for each worker
```

From a worker's folder (`workers/<name>/`):

```bash
npm run dev      # wrangler dev
npm run deploy   # wrangler deploy
```

## Configuration

- `CLERK_ISSUER` in each gated worker's `wrangler.toml` is the Clerk Frontend API URL. It is public.
- The `[[ratelimits]]` blocks need no setup in the Cloudflare dashboard; `namespace_id` is a number chosen here.
- Secrets are set with `wrangler secret put <NAME>` from the worker's folder: `WEATHER_API_KEY` (weather), `TOKEN` (document scanner, microagent), `RUNPOD_API_KEY` (LLM), `GITHUB_TOKEN` (GitHub stats). Each folder has a `.dev.vars.example` naming what `wrangler dev` needs in `.dev.vars`.
