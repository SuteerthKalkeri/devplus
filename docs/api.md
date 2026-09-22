# DevPulse API

All dashboard routes are under `/api`. Authentication is a server session stored in PostgreSQL. Requests after login carry the HttpOnly `SESSION` cookie automatically.

For every mutation, first call `GET /api/auth/csrf` and copy its `token` into the response's `headerName` header (currently `X-CSRF-TOKEN`). Tokens are refreshed after login/logout. The frontend client performs this step automatically. CSRF protection applies to registration, login, logout, and resource changes.

| Method | Path                            | Request / behavior                                                   |
| ------ | ------------------------------- | -------------------------------------------------------------------- |
| GET    | /auth/csrf                      | Public CSRF token response                                           |
| POST   | /auth/register                  | JSON: name, email, password; returns account, 201                    |
| POST   | /auth/login                     | URL-encoded email/password; establishes session, 204                 |
| GET    | /auth/me                        | Current account: id, name, email                                     |
| POST   | /auth/logout                    | Invalidates session, 204                                             |
| GET    | /organizations                  | Organizations where the user is a member                             |
| POST   | /organizations                  | JSON: name; creates organization and OWNER membership                |
| GET    | /projects                       | Projects visible to the user                                         |
| POST   | /organizations/{id}/projects    | JSON: name; requires OWNER or ADMIN                                  |
| GET    | /projects/{id}                  | Requires organization membership                                     |
| PATCH  | /projects/{id}                  | JSON: name; OWNER or ADMIN                                           |
| DELETE | /projects/{id}                  | Deletes project, events and keys; OWNER or ADMIN; 204                |
| GET    | /projects/{id}/api-keys         | Metadata only; never returns raw keys or hashes                      |
| POST   | /projects/{id}/api-keys         | JSON: name; OWNER or ADMIN; returns key metadata and one-time apiKey |
| DELETE | /projects/{id}/api-keys/{keyId} | Revokes the key; OWNER or ADMIN; 204; repeat revocation is safe      |

`GET /actuator/health` is a public health check outside `/api`, with details hidden.

Successful creation returns 201. Invalid input returns 400, anonymous access 401, insufficient role/invalid CSRF 403, inaccessible or missing resources 404, and duplicate records 409. Application errors use a `message` field; unexpected server errors do not expose stack traces.

UUIDs identify resources. Display names allow up to 100 characters. Generated slugs include a random ID suffix and stay stable on rename. Project/key lists are intended for the initial small-workspace scope; pagination is future work.

Browser ingestion keys are public identifiers with intended write-only ingestion scope. The stateless ingestion endpoint accepts these keys; dashboard routes still require a session. Possession of an ingestion key never authenticates dashboard API requests.

## HTTP telemetry

`POST /v1/ingest/events` uses `Authorization: Bearer <ingestion key>`, `Content-Type: application/json`, no session cookie, and no CSRF token. Accepted batches return 202 with `{ "accepted": 1, "duplicates": 0 }` after the database transaction commits. Keys resolve the project; callers cannot choose another project in the payload.

```json
{
  "schemaVersion": 1,
  "events": [
    {
      "eventId": "27630ec4-bc2a-4a9f-8026-2d56601b1ff9",
      "type": "HTTP_REQUEST",
      "timestamp": "2026-09-22T12:00:00Z",
      "environment": "development",
      "release": "0.1.0",
      "http": {
        "method": "GET",
        "url": "/api/products",
        "statusCode": 200,
        "durationMs": 42.5,
        "outcome": "HTTP_RESPONSE"
      },
      "page": { "url": "/shop" }
    }
  ]
}
```

Use a current timestamp and a stable UUID for each logical event. Outcome is `HTTP_RESPONSE` with status 100–599, or `NETWORK_ERROR`/`ABORTED` with status 0. Environment contains 1–32 letters, digits, hyphens, or underscores. Release is optional (100 characters maximum). Duration is finite and between 0 and 3,600,000 ms. Paths are limited to 2,048 characters.

Invalid batches return 400 without partial insertion; invalid/revoked keys return 401, disallowed browser origins 403, payloads over 64 KiB 413, and exhausted limits 429. Per-minute limits include `Retry-After`. At most 50 events are accepted per batch. Daily quota counts submitted events including duplicates. See [SDK limits](browser-sdk.md) for retry and retention behavior.

`GET /api/projects/{id}/telemetry` requires the normal dashboard session and organization membership. It returns `summary: { receivedEvents, lastReceivedAt }` and up to 20 `recentEvents`. Each recent event includes event/receive times, environment/release, method/path/status/outcome/duration, and page path. `receivedEvents` counts currently retained rows; it is not a lifetime total or an aggregate request-rate metric. Inaccessible projects return 404.
