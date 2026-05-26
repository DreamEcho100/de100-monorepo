# Post-Deploy Smoke Checklist

Run this checklist immediately after each production deploy.

If you need the full step-by-step command flow, start with `./hosted-smoke-run-procedure.md`.

## Deploy Metadata

- [ ] Deployment timestamp recorded.
- [ ] Commit SHA and release identifier recorded.
- [ ] Operator and reviewer names recorded.

## Runtime Health

- [ ] pnpm -F @de100/apps-lms-infra selfhost:health returns success.
- [ ] pnpm -F @de100/apps-lms-infra selfhost:verify returns success.
- [ ] pnpm -F @de100/apps-lms-infra selfhost:smoke:public returns success.
- [ ] App responds on /health over public HTTPS origin.

## Route And API Checks

- [ ] /en returns localized HTML.
- [ ] /ar returns localized HTML.
- [ ] /api/reference redirects to /en/api/reference.
- [ ] /api/reference/spec.json returns valid JSON.

## Authentication Checks

- [ ] Sign-in succeeds with a known account.
- [ ] Sign-out succeeds and protected route returns unauthenticated state.
- [ ] Password reset or verify-email flow succeeds on active email driver.

## Data And Media Checks

- [ ] Todo CRUD works for signed-in user.
- [ ] Media upload succeeds for configured driver.
- [ ] Public media read works.
- [ ] Private media read enforces auth and owner scope.
- [ ] Signed media URL issuance and access work before expiry.

## Service Dependency Checks

- [ ] Database operations succeed in app logs.
- [ ] Cache backend is reachable for configured driver.
- [ ] Email driver reports successful send path.

## Evidence And Sign-Off

- [ ] Evidence captured with docs/evidence/templates/hosted-deploy-smoke-template.md.
- [ ] Any failed check has linked issue and mitigation owner.
- [ ] Deployment marked accepted only when all critical checks pass.
