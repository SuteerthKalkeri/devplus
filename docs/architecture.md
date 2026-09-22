# Initial architecture decisions

Checkpoints 0–4 are implemented: accounts, sessions, workspaces, projects, ingestion-key management, browser HTTP capture, sanitized ingestion, retention, and a recent-events view. Analytics and error-monitoring sections describe later milestones.

## One backend, clear boundaries

The backend is one Spring Boot application organized by feature: `auth`, `organization`, `project`, `ingestionkey`, and `telemetry`. Controllers validate HTTP input, services own authorization and transactions, and repositories own SQL. `OrganizationAccess` is the shared tenant authorization boundary. Telemetry separates ingestion, storage, and dashboard queries; ingestion uses a stateless security chain distinct from dashboard sessions.

React with Vite handles presentation. Vite proxies `/api` to Spring Boot during development, keeping cookies on the same browser origin. Production needs an equivalent reverse proxy; Vite's development server is not a production server.

The database layer uses Spring JDBC's `JdbcClient` instead of JPA. Explicit, parameterized SQL keeps the initial model easy to read and fits the aggregation queries planned for telemetry. Flyway owns schema changes. Do not modify an applied migration; add a new numbered migration.

The frontend separates `pages`, `layouts`, shared `components`, data `hooks`, API transport and types, and styles grouped by screen. Form/modal state stays in the owning component. Hooks manage loading and server data. Plain React state is enough for this stage; TanStack Query can be introduced when analytics needs polling and cache invalidation.

Use a single repository and npm workspaces for JavaScript packages. Build the Java backend with Maven Wrapper. Redis, queues, and separate workers come only after measurements identify a need.

## Dashboard authentication

Spring Security manages login/logout, session rotation, and CSRF protection. Spring Session JDBC persists sessions in PostgreSQL. The session cookie is HttpOnly and SameSite=Lax; set COOKIE_SECURE=true for an HTTPS deployment. Passwords use BCrypt with a work factor of 12. Registration requires at least 12 characters and enforces BCrypt's 72-byte limit. SameSite is an additional protection, not a substitute for CSRF checks.

This web dashboard does not need custom JWT refresh-token machinery for V1. The session design replaces `/auth/refresh`; use register, login, logout, me, and a CSRF-token retrieval flow. Expired sessions return an authentication error and the UI offers login.

References: [Spring Security CSRF integration](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html).

## Browser ingestion keys are public

A key embedded in customer JavaScript can be copied by any visitor. Label it an ingestion key, with permission only to submit telemetry for its project. It must never grant access to dashboard APIs or existing telemetry. Store a hash, show the full value only when created, and support revocation, while making no claim that this keeps a browser key secret.

Before exposing ingestion publicly, enforce per-key and per-source limits, project quotas, request-size and batch-size limits, and validation. An origin allowlist can limit browser usage but cannot authenticate arbitrary clients or prevent forged server requests.

## Tenant isolation

Every dashboard resource lookup must check organization membership and role. Test cross-user reads, updates, deletion, and key management. Add database uniqueness constraints for normalized user email, organization membership, organization slug, and project slug within an organization.

Use one project across environments; attach environment and release to events. Optionally scope ingestion keys to an environment. Avoid storing one mandatory environment on a project if its dashboard should compare production and staging.

## SDK correctness and privacy

- Exclude DevPulse ingestion requests from fetch capture to prevent recursion.
- Make initialization idempotent and preserve customer fetch behavior, errors, and cancellation.
- Bound the queue, batch bytes, and retries; use backoff and drop telemetry when limits are reached.
- Strip URL query strings, fragments, and credentials by default. Paths and exception messages can also contain sensitive data, so support a redaction hook. Do not capture bodies, cookies, or authorization headers.
- Define browser fetch duration as time until the response becomes available, not backend processing time or necessarily the full response-body download.
- Capture network failures separately from HTTP 4xx and 5xx responses.
- Treat delivery as best-effort, with duplicate prevention on `(project_id, event_id)`.

`sendBeacon()` cannot set a custom Authorization header. Start with fetch-based transport and small `keepalive` requests for best-effort final flushing; test the cross-origin preflight behavior. If beacon transport is later added, explicitly design how its public ingestion key is carried. Do not assume that delivery on tab close is guaranteed.

Reference: [MDN sendBeacon](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon).

## Telemetry storage and analytics

V2 stores allowlisted HTTP fields in typed columns, with no raw JSON metadata. Event time and server receipt time use UTC. A unique project/event constraint makes retries idempotent; a project/received-time index serves recent events. Raw events are retained for 14 days, with scheduled cleanup every six hours. Daily quotas use an atomic PostgreSQL upsert; key-row locking coordinates ingestion with revocation. See the SDK guide for delivery and capacity limits.

Define each displayed metric precisely. Label a 5xx-only percentage as a server-error rate; show network failures and 4xx separately. Use server-side aggregation and paginated request lists. Do not average precomputed percentile values to obtain a combined percentile.

## Error monitoring

Group occurrences using a versioned fingerprint and a unique project/fingerprint constraint. Use transactional updates so duplicate delivery or concurrent events do not inflate counts. Keep lifecycle status to unresolved, resolved, and ignored; reopening sets unresolved again.

Production JavaScript stacks may be minified. Source-map upload and processing are a later feature; V1 should not promise original TypeScript filenames and line numbers. Label release information as 'first seen in release', since first observation does not prove when a bug was introduced.

## Incremental delivery

Deploy a private end-to-end slice before completing all four stages to uncover HTTPS, cookies, proxy, and cross-origin integration problems early. Build automated authorization tests from the first protected endpoint. Delay public signup until abuse controls and account recovery are ready.
