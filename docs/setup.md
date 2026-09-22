# Local setup

Use the existing Node.js 22.13.1 and Java 22.0.2 installations. Node 22.13.1 satisfies Vite 8's Node 22.12+ requirement. Spring Boot 4.1.1 supports Java 22. The Maven build explicitly targets Java 22 without preview features.

## Tools detected

| Tool             | Available                                               |
| ---------------- | ------------------------------------------------------- |
| Node / npm       | 22.13.1 / 10.9.2                                        |
| Java / javac     | 22.0.2; JAVA_HOME points to the existing JDK            |
| PostgreSQL tools | 18.6, including initdb and pg_ctl                       |
| Git              | Installed                                               |
| VS Code          | Installed                                               |
| Docker / Compose | Installed, but not required for this foundation         |
| Maven            | Installed; the project uses its committed Maven Wrapper |

The npm launchers use Windows PowerShell (`powershell.exe`, included with Windows) and do not modify machine-wide environment variables. PowerShell 7 (`pwsh`) is not required. Maven's dependency cache is project-local under `.bootstrap/maven-repository`; Maven Wrapper may also cache its distribution in the normal user Maven directory.

## Start

1. Run `npm.cmd install` at the repository root.
2. Run `npm.cmd run db:start`. First startup initializes a new PostgreSQL cluster under `.local/postgres`, bound to `127.0.0.1:55432`. Credentials are randomly generated and saved in `.local/database.env`.
3. Run `npm.cmd run backend` in one terminal. Flyway creates the schema automatically.
4. Run `npm.cmd run dev` in another terminal.
5. Open `http://127.0.0.1:3000/register` and create an account. Passwords need 12–64 characters and at most 72 UTF-8 bytes.

The existing database service on port 5432 is not used or modified. Docker and cloud accounts are unnecessary.

## Ports and configuration

| Process             | Address         |
| ------------------- | --------------- |
| Dashboard           | 127.0.0.1:3000  |
| HTTP playground     | 127.0.0.1:4174  |
| Backend             | 127.0.0.1:8081  |
| DevPulse PostgreSQL | 127.0.0.1:55432 |

The backend reads `DB_URL`, `DB_USER`, and `DB_PASSWORD`. The local launcher loads them without printing them and restores the shell environment afterward. It switches to `devpulse_test` for test/package commands. `PORT` overrides the backend port; update the Vite proxy too if changing it. `COOKIE_SECURE=true` is required when deploying with HTTPS.

The app expects dashboard API requests under `/api` on the same origin. The Vite proxy provides this locally. A production reverse proxy must route `/api` to Spring Boot and serve the frontend build with SPA history fallback.

## Troubleshooting

- **Backend unavailable:** check the backend terminal and `http://127.0.0.1:8081/actuator/health`.
- **Database startup:** inspect `.local/postgres.log`; ensure port 55432 is free. `npm.cmd run db:start` is safe to run again.
- **Java mismatch:** run `java -version`, `javac -version`, and check JAVA_HOME in the shell used to launch the backend.
- **PowerShell blocks npm.ps1:** use `npm.cmd`; no machine-wide execution policy change is needed.
- **Dependency download failed:** check network access and retry the command. Maven may need `-U` when retrying cached failed downloads.
- **Missing local credentials:** restore `.local/database.env` if the existing cluster was initialized earlier. The script will not overwrite an existing cluster to reset credentials.
- **Browser test:** the default test browser is installed Microsoft Edge. Change `channel` in `playwright.config.ts` if choosing another supported browser.

`.local` contains real local data and credentials. Do not commit it or delete it to troubleshoot without first considering what data you need to preserve.

References: [Vite requirements](https://vite.dev/guide/), [Spring Boot requirements](https://docs.spring.io/spring-boot/system-requirements.html).
