# Security Review (Initial Pass)

Date: 2025-09-17
Scope: capital-ladder-app (Node.js/Express, Prisma, SQLite for tests)
Methodology: BMAD Method – document-first audit with actionable fixes

Summary
- Strengths
  - Centralized security configuration (config/security.js) with environment validation
  - JWT-based authentication and role checks present in middleware/auth.js
  - Helmet enabled globally in server.js
  - Rate limiting in place via express-rate-limit
- Risks and Findings
  1) Secrets
     - Ensure JWT_SECRET is 32+ chars in every environment. Tests set this; verify .env and CI.
  2) Rate Limiting
     - Rate limiter now skips in tests to prevent timeouts; ensure it’s enabled in non-test envs.
     - Consider per-route or stricter admin endpoint limits in production.
  3) CORS and Headers
     - Helmet enabled; verify CSP and HSTS in production per frontend needs.
     - CORS: use explicit allowlist in production (CORS_ORIGINS env).
  4) Error Messages
     - Error handler returns consistent JSON; avoid leaking stack traces in production.
  5) Dependencies
     - Run npm audit routinely. Track and patch moderate+ vulns.
  6) File Uploads
     - Multer limits present. Ensure only accepted MIME types and extensions; log rejects.
  7) Logging
     - Winston logger present. File logging disabled by default except production; consider rotating logs.
  8) Prisma/DB
     - Ensure migrations and schema indices for performance and minimized exposure. Guard raw queries.

Recommendations
- Add .env.example with required variables and guidance:
  - JWT_SECRET, DATABASE_URL, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, CORS_ORIGINS, ENABLE_FILE_LOGGING
- Add CSP/HSTS only in production; document frontend adjustments.
- Add separate stricter rate limit for admin endpoints (e.g., /api/analytics, /api/notifications/test, /metrics).
- Add unit tests to assert presence of key security headers in production-mode simulation.
- Enable security:audit in CI (npm audit --audit-level=moderate).

Next Steps (Suggested)
- Implement per-route rate limiting configuration.
- Add tests for security headers under NODE_ENV=production with app factory.
- Establish rotating file logs in production (winston-daily-rotate-file).
- Review and pin critical dependencies; enable Renovate/Dependabot.
