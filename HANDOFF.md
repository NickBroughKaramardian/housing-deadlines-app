# Project handoff

Context for picking this project up on a new machine or in a fresh AI session.
Current as of 2026-10-02.

## What this is

A housing-deadlines tracker: a Create React App frontend (React 18, plain JS,
Tailwind, no router — `App.js` switches pages via `activeTab` state) backed by
an Azure Functions v4 API over Cosmos DB.

The app was migrated Firebase -> SharePoint/Graph -> Azure Functions. Only the
Azure path is live; the Firebase and SharePoint layers have been deleted.

Live data path:

```
Pages -> services/taskManager.js   (in-memory store + pub/sub)
      -> services/azureTaskService.js
      -> services/tasksApi.js -> services/apiClient.js (adds bearer token)
      -> https://cc-project-api.azurewebsites.net/api
```

Auth is MSAL / Microsoft Entra ID. `apiClient` attaches an Entra ID token to
every backend request; the backend validates it against the Microsoft JWKS
endpoint.

## Setup on a new machine

```bash
git clone https://github.com/NickBroughKaramardian/housing-deadlines-app.git
cd housing-deadlines-app
npm install
cd azure-functions && npm install && cd ..
npm run build          # verify
```

The `.git` directory is ~889 MB because of historical bloat that has since been
purged from the tree. Use `git clone --depth 1` if you do not need history.

Built with Node 24.2.0 / npm 11.11.1. `package.json` declares no `engines`.

### Local files that are gitignored

Neither contains real secrets, so both can be recreated by hand.

- `.env.local` — optional. Only `REACT_APP_API_BASE`. `apiClient.js` falls back
  to `https://cc-project-api.azurewebsites.net/api` when it is absent.
- `azure-functions/local.settings.json` — needed only for running the Functions
  host locally. Keys: `AzureWebJobsStorage`, `FUNCTIONS_WORKER_RUNTIME`,
  `COSMOS_ENDPOINT`, `COSMOS_PRIMARY_KEY`, `WEB_PUBSUB_CONNECTION_STRING`.

### Per-machine authentication

`az login`, plus `gcloud auth login` and `firebase login` only if you touch the
old Firebase project. None of this transfers between machines.

## Deploying: order matters

**Deploy the backend before the frontend.** The frontend now sends a bearer
token on every request and resolves roles from `GET /api/me`. If the frontend
ships first, task loads fail and every user falls back to MEMBER.

### Function App settings

| Setting | Required | Notes |
|---|---|---|
| `COSMOS_ENDPOINT` | yes | |
| `COSMOS_PRIMARY_KEY` | no | If unset, uses `DefaultAzureCredential`; the identity then needs the Cosmos data-contributor role |
| `COSMOS_DATABASE_ID`, `COSMOS_CONTAINER_ID` | no | Defaults in `src/database.js` |
| `ADMIN_EMAILS` | **effectively yes** | Comma-separated. See the bootstrap warning below |
| `AAD_TENANT_ID`, `AAD_CLIENT_ID` | no | Falls back to the real IDs in `src/azureConfig.js` |
| `CORS_ALLOWED_ORIGINS` | no | Added on top of the two Firebase origins + localhost:3000 |
| `MAX_TASKS_READ` | no | Defaults to 20000 |
| `WEB_PUBSUB_CONNECTION_STRING` | no | If unset, websocket endpoints return 503 |

**Bootstrap warning:** if `ADMIN_EMAILS` is unset *and* the `userAssignments`
container is empty, every authenticated user is granted ADMIN (a warning is
logged). Set `ADMIN_EMAILS` before anyone signs in. Once either exists,
unassigned users default to MEMBER.

## What the audit changed

A three-part audit (secrets, backend, frontend) found 44 issues. All are fixed
in commit `52997d1a9`.

Security:

- A Firebase Admin private key was committed and pushed. It has been deleted
  from GCP IAM and purged from git history (history was force-pushed — if you
  have an old local clone, reclone rather than merge).
- Task CRUD was fully unauthenticated with wildcard CORS; the auth layer was a
  mock accepting any bearer token. Both replaced with real Entra ID JWT
  validation and a CORS allowlist.
- Every signed-in user was hardcoded ADMIN, and RBAC lived in browser
  localStorage. Roles now come from the server
  (ADMIN / MANAGER / MEMBER / VIEWER) via a `userAssignments` container.

Data-integrity bugs that were silently corrupting data:

- Editing any field reset an Urgent task's priority to Normal.
- The calendar month view hid tasks due on the last day of the month.
- Bulk "Mark Complete" wrote every task twice.
- Recurrence generated dates a day early in timezones at/after UTC+13.

Structural: `Database.js` went 3,075 -> 1,075 lines, with the recurrence
engine, `EditableCell`, selection logic and batch orchestration extracted;
`useTasks`/`useUsers` hooks replaced six duplicated page bootstraps; ~37 dead
files from the Firebase/SharePoint eras were deleted.

### Behavior changes worth knowing

- The 30-second full-database poll is gone. Data re-verifies on window focus,
  at most once every 5 minutes. Manual actions still update instantly.
- "Never"-ending recurrences generate 2 years ahead, capped at 1,000 instances
  (was 20 years / 10,000).
- Non-admins see the Users page read-only. The first ADMIN to open it migrates
  any legacy localStorage assignments to the server automatically.

## Known remaining items

- `.git` is ~889 MB of historical objects. Shrinking it needs another history
  rewrite and force-push; cloning shallow is the easier workaround.
- 17 pre-existing lint warnings (`exhaustive-deps`, unused imports) in files the
  audit did not flag, including `MultiResponsiblePartySelector.js`.
- `azure-functions/src/recurrenceUtils.js` is syntactically valid again but
  still unwired — no endpoint calls it. Decide whether to wire it up or delete.
- The `xlsx` dependency has known prototype-pollution and ReDoS advisories with
  no fix available on npm.
- Local scratch investigation notes (`*_ANALYSIS.md`, `DIAGNOSTIC_*.md`, etc.)
  are gitignored by name in `.gitignore`, not committed.
