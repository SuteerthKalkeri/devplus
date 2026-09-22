# Development milestones

The first deliverable is deliberately small. Each checkpoint must run before expanding scope.

Current implementation: checkpoints 0–4 are implemented locally. Automated tests cover authentication, project/key management, CSRF, tenant isolation, SDK privacy/retries, batched ingestion, payload/quota limits, CORS, and concurrent duplicate prevention. The browser playground sends real requests and the project page displays received events. Aggregate analytics and team invitations remain future work.

| Checkpoint | Deliverable                   | Completion evidence                                                                       |
| ---------- | ----------------------------- | ----------------------------------------------------------------------------------------- |
| 0          | Project foundation            | Dashboard runs, backend health works, database connects, first migration applies          |
| 1          | Accounts and login            | Register, log in, reload, log out; session and CSRF behavior verified                     |
| 2          | Workspace and project         | Create and revisit records; another user's project is inaccessible                        |
| 3          | Ingestion keys and onboarding | Create/show-once/list/revoke keys; project dashboard has an honest empty state            |
| 4          | Browser SDK and ingestion     | Demo sends batched HTTP events; sanitized events persist without duplicate inserts        |
| 5          | Metrics overview              | Request count, clearly defined error rates, latency percentiles, time/environment filters |
| 6          | Performance and requests      | Endpoint aggregates and paginated filtered request explorer                               |
| 7          | Exception capture             | Automatic and manual browser error events reach the backend                               |
| 8          | Issue management              | Ten identical errors produce one issue with ten occurrences; resolve and reopen work      |

Checkpoints 0–3 implement the original Stage 1. Checkpoint 4 adds the first SDK-to-database flow. See [the browser SDK guide](browser-sdk.md) for acceptance steps.

For Stage 1, the primary acceptance journey is:

```text
Register -> log in -> create workspace -> create project
-> generate ingestion key -> reload -> log out -> log in
-> workspace and project still exist
```

Run authorization checks with two separate users. A guessed project ID or key ID must not bypass organization membership checks.

Create a private deployment after the first working account/project flow, then connect the deployed demo when ingestion is available. Publish the SDK only after its integration works and a package name or scope is confirmed available; `@devpulse/browser` is a proposed name, not a reserved package.

After checkpoint 8, measure ingestion throughput and dashboard query times with representative data. Record hardware, test duration, traffic shape, latency, errors, and limits before making performance claims. Use those results to decide whether asynchronous workers, caching, or partitioning are warranted.
