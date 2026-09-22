# Run DevPulse and e-commerce locally

Use four separate PowerShell terminals. Dependencies and the e-commerce DevPulse adapter are installed. The storefront sends telemetry to the existing **test** project using its **E-commerce local** ingestion key. The key is stored in the storefront's ignored `.env.local`.

| Application | Frontend              | Backend               |
| ----------- | --------------------- | --------------------- |
| DevPulse    | http://127.0.0.1:3000 | http://127.0.0.1:8081 |
| E-commerce  | http://localhost:5174 | http://localhost:8080 |

Terminal 1 — DevPulse backend and its local database:

```powershell
cd C:\Learning\DevPulse
npm.cmd run db:start
npm.cmd run backend
```

Terminal 2 — DevPulse frontend:

```powershell
cd C:\Learning\DevPulse
npm.cmd run dev
```

Terminal 3 — E-commerce backend (requires its existing PostgreSQL service on port 5432):

```powershell
cd C:\Learning\e-commerce\backend
.\mvnw.cmd spring-boot:run
```

Terminal 4 — E-commerce frontend:

```powershell
cd C:\Learning\e-commerce\frontend
npm.cmd run dev
```

Use `localhost:5174` for the storefront; the backend's CORS origins match this hostname and port. Vite uses strict port 5174 so it cannot silently switch to a port the backend rejects. Keep using `127.0.0.1:3000` for DevPulse sessions.

Open the store, browse products or change a filter, then open **test** in DevPulse. Events are batched every five seconds and the project table refreshes every five seconds. Wait up to about ten seconds for requests to appear. Only request metadata is collected; queries, cookies, headers and request/response bodies are excluded. Delivery pincodes and cart-item IDs are normalized in the monitoring module.

Stop a server with **Ctrl+C** in its terminal. If a port is already in use, stop its previous server before starting another copy. To stop DevPulse's local database after its backend stops, run `npm.cmd run db:stop` from the DevPulse root. The e-commerce database on 5432 is separate.

Monitoring files live in `C:\Learning\e-commerce\frontend\src\monitoring`. The local SDK tarball is in `frontend/vendor`; it has not been published to npm. See [the SDK guide](browser-sdk.md) for configuration and limitations.
