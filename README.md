# DevPulse

A developer observability platform, built one working milestone at a time.

To run DevPulse alongside the connected e-commerce storefront, use the [four-terminal startup guide](docs/run-both-apps.md).

Checkpoints 0–4 are implemented: accounts, workspaces, projects, ingestion keys, a browser SDK, batched HTTP event ingestion, and a live recent-events table. Sanitized events persist in PostgreSQL with duplicate prevention. Charts and aggregate metrics are the next checkpoint.

## Stack

- **Frontend:** React 19, TypeScript, Vite 8, React Router, Lucide, and CSS with Tailwind tooling.
- **Backend:** Spring Boot 4.1.1, Spring Security, Spring Session JDBC, Spring JDBC, and Flyway.
- **Database:** PostgreSQL 18.6, using a project-local instance on port 55432.
- **Existing runtimes:** Node.js 22.13.1, npm 10.9.2, and JDK 22.0.2. No runtime upgrade required.
- **Checks:** TypeScript, ESLint, Prettier (including Java), JUnit integration tests, and Playwright browser tests.

## Run locally on Windows

Requires Windows PowerShell (`powershell.exe`, included with Windows), Java/JAVA_HOME, Node/npm, and PostgreSQL tools on PATH. Use the repository root for all commands. PowerShell 7 is not required.

```powershell
npm.cmd install
npm.cmd run db:start
npm.cmd run backend
```

Keep the backend terminal open. In a second terminal:

```powershell
npm.cmd run dev
```

Open **http://127.0.0.1:3000** and create an account. Use the same hostname consistently so the session cookie works as expected.

The database initializer creates isolated `devpulse` and `devpulse_test` databases and a non-superuser application role. Random local credentials and database files live in ignored `.local/`. Your existing PostgreSQL service on port 5432 is not changed. Maven Wrapper and downloaded backend dependencies are used automatically.

To stop the servers, press Ctrl+C in their terminals. Stop only the project-local database with `npm.cmd run db:stop`.

## Check the code

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd run format:check
npm.cmd run test:sdk
npm.cmd run test:backend
npm.cmd run test:browser
```

Start the database before backend tests. Browser tests require the backend, dashboard, and playground (`npm.cmd run demo`) and Microsoft Edge; they use a separate headless browser profile. Backend tests use `devpulse_test` and clean up their fixtures. Browser tests create synthetic accounts/workspaces in the local application database and delete their test project.

Run `npm.cmd run format` to apply the shared style. The browser-test configuration and root tooling use the same lockfile as the dashboard.

## Code organization

```text
apps/dashboard/src/
  api/           HTTP transport and response types
  components/    Shared UI and accessible dialogs
  hooks/         Session, workspace, and key data lifecycle
  layouts/       Dashboard navigation and page frame
  pages/         Authentication, overview, projects, project details
  styles/        Readable CSS grouped by responsibility
apps/backend/src/main/java/com/devpulse/
  auth/          Accounts, password handling, session security
  organization/  Workspaces, membership, authorization
  project/       Project lifecycle
  ingestionkey/  Key creation, hashing, listing, revocation
  telemetry/     Ingestion security, validation, storage, retention, queries
  common/        Validation, errors, slug helpers
apps/backend/src/main/resources/db/migration/
packages/browser-sdk/src/  Client, fetch instrumentation, privacy, transport
demos/http-playground/    Real HTTP response demonstration
tests/browser/
scripts/
docs/
```

Backend features follow **controller → service → repository**. Authorization and transactions live in services; all SQL parameters are bound. API response models never include password hashes or key hashes. Raw ingestion keys appear only in the creation response.

## Scope

This is a local development implementation. Charts, aggregate metrics, exception capture, team invitations, password recovery, and email verification remain future work. Ingestion has request limits and a daily project quota; distributed abuse protection remains a deployment concern.

Before public deployment, configure HTTPS and secure cookies, a same-origin reverse proxy, account recovery, rate limits/quotas, production secrets, and database backups. The local scripts intentionally bind services to loopback.

Try `npm.cmd run demo` at **http://127.0.0.1:4174** with a project ingestion key. DevPulse uses backend port **8081**, leaving 8080 free for your e-commerce API. See [browser SDK and Axios integration](docs/browser-sdk.md).

See [setup](docs/setup.md), [architecture](docs/architecture.md), [API contract](docs/api.md), [contribution guide](CONTRIBUTING.md), and [roadmap](docs/roadmap.md).
