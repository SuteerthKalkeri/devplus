# Working on DevPulse

## Keep changes easy to follow

- Put code with the feature that owns it. Share code only when there is a clear repeated responsibility.
- Prefer descriptive names, small functions, and explicit types. Comments explain decisions or constraints rather than restating the code.
- Keep controllers focused on HTTP mapping and validation. Services enforce access and own transactions. Repositories contain parameterized SQL.
- Route every project/key operation through its service; do not bypass membership checks by calling a repository from a controller.
- Keep React pages focused on composing the screen. Put asynchronous loading into hooks and generic HTTP behavior into the API client. Keep transient UI state near the component using it.
- Use shared dialog components for focus management, keyboard dismissal, pending actions, and inline errors.
- Never persist passwords, raw ingestion keys, or session cookies in browser storage or logs. Do not commit local credentials.
- Add a new Flyway migration for schema changes. Never edit an already-applied migration.

## Before finishing a change

1. Format with `npm.cmd run format`.
2. Run `npm.cmd run lint` and `npm.cmd run build` for frontend changes.
3. Run `npm.cmd run test:backend` for backend changes. These use the separate test database.
4. Run `npm.cmd run test:browser` when the account/workspace/project journey changes.

Tests should check externally meaningful behavior and failure boundaries. Add cross-account authorization cases for new protected endpoints. Avoid tests that only repeat implementation details.

## Current deliberate choices

This is one modular application, not a set of microservices. Spring JDBC keeps queries visible and will support future telemetry aggregates. React's built-in state and focused hooks are sufficient for the initial screens; introduce caching libraries when there is a concrete need. Do not add queues, Redis, or a design-system dependency just to expand the stack.
