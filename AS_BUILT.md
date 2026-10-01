# As-Built — yt-companion

Record date: 2026-10-01 (America/New_York)
Change: branch `security/env-and-secret-scan` → `main`

Only verified facts are recorded. Open items are listed separately at the end.

## 1. Secrets in this project (verified by code search)

| Secret | Read by | Required |
|---|---|---|
| `YT_API_KEY` (alias `YOUTUBE_API_KEY`) | `src/cli/content.js` → `yt-companion sync` only | No. Without it, `sync` uses the public RSS feed (about the last 15 videos) |

- The Docker image build (`Dockerfile`, `templates/site/Dockerfile`, `examples/demo/Dockerfile`) does not use any key.
- Error messages from `src/lib/youtube.js` include the API's error text or HTTP status, not the request URL, so the key is not printed.
- The key is sent as a `key=` query parameter on Google API requests (Google's documented method for API keys).

## 2. Changes

| File | Change |
|---|---|
| `.gitignore` | Ignores `.env`, `.env.*`; allows `.env.example` |
| `templates/site/gitignore` (becomes `.gitignore` in sites made by `yt-companion init`) | Same `.env` rules |
| `examples/demo/.gitignore` | Same `.env` rules |
| `.dockerignore`, `templates/site/.dockerignore`, `examples/demo/.dockerignore` | Exclude `.env`, `.env.*` from the build context |
| `.env.example` | New. `YT_API_KEY=` placeholder with usage notes |
| `Dockerfile` | Header note: no key needed at build; only `dist/` reaches the nginx image |
| `templates/site/.github/workflows/deploy.yml`, `examples/demo/.github/workflows/deploy.yml` | Comment on the optional sync step: pass `YT_API_KEY` from GitHub Actions secrets, never from files |
| `.github/workflows/secret-scan.yml` | New. gitleaks 8.21.2 (SHA-256 verified) scans full history on every push/PR |
| `.pre-commit-config.yaml` | New. gitleaks pre-commit hook (v8.21.2) |

## 3. Verification (2026-10-01)

| Check | Result |
|---|---|
| `npm test` on Node 22.23.3 | 5 passed, 0 failed (on Node 20 the CLI refuses to run by design: requires 22.12+) |
| `git check-ignore .env` | Ignored by `.gitignore` |
| `yt-companion init` → new site's `.gitignore` / `.dockerignore` | Both contain the `.env` rules |
| gitleaks full history | No leaks |
| Workflow YAML files | Parse OK |

## 4. Repository security settings (verified via GitHub API, 2026-10-01)

| Setting | State |
|---|---|
| Visibility | Public |
| Secret scanning / push protection | Enabled |
| Dependabot vulnerability alerts | Enabled |
| Dependabot security updates | Enabled, not paused |
| Branch protection on `main` | Not configured |

## 5. Open items

- Branch protection on `main` — not requested; not configured.
