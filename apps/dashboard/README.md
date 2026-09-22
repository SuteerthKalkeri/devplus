# Dashboard

React + TypeScript + Vite. Run commands from the repository root; see the [project README](../../README.md).

The browser calls same-origin `/api` endpoints. Vite proxies them to Spring Boot locally. Authentication uses an HttpOnly session cookie; no token is stored in localStorage.

Pages compose shared components. Data hooks own asynchronous loading and refresh. The API client adds CSRF headers to mutations and handles authentication expiry. Screen-specific styles live in `src/styles` and are formatted with Prettier.
