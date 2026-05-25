# Evidence: Phase 4 Frontend Standardization Regression Check

- Timestamp (UTC): 2026-05-25T07:17:01Z
- Commit SHA: 6369f4e33cd59712d31b365d7679eb3b0e45e358
- Scope: home/about/media UI standardization after shared primitive adoption
- Locale: `en`, `ar`
- Theme: verified transitions in both locales (`System -> Light` in `en`, `Light -> Dark` in `ar`)
- Driver configuration: local runtime observed (`Backend: Local files` on media capability card)
- Runtime: local dev server (`pnpm -F @de100/apps-lms-web dev --host 127.0.0.1 --port 3000`)

## Flow coverage

1. `/en`
   - Home page loaded with shared button primitives and alert-based status surface.
2. `/en/about`
   - About page CTA actions rendered through shared buttons.
3. `/en/login` -> `/en/dashboard`
   - Signed in with seeded account `owner@lms.test` to validate protected rendering path.
4. `/en/media`
   - Media capabilities and lists rendered with standardized status/controls.
5. `/ar/media`, `/ar/about`, `/ar`
   - Arabic localized routes rendered with no visible layout breakage after component standardization.

## Network/request note

Observed successful app requests during smoke pass, including:

- `POST /api/auth/sign-in/email 200`
- `POST /api/rpc/privateData 200`
- `POST /api/rpc/todo/getAll 200`
- `POST /api/rpc/media/getCapabilities 200`
- `POST /api/rpc/media/getAll 200`
- `POST /api/rpc/healthCheck 200`

## Screenshots

- None captured for this artifact.

## Secrets hygiene check

- Used seeded demo account only.
- No secrets copied into evidence.
- No auth tokens, cookies, or env values were exported in this file.
