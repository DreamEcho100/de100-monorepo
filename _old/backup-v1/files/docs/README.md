# Docs

This folder is the working knowledge base for the LMS starter.

Use it for three things:

- onboarding new contributors
- recording architecture and flow decisions
- keeping an append-only implementation log as the repo changes

Current entry points:

- `onboarding.md`: repo layout, active packages, and first commands
- `setup/environment.md`: environment variables and local setup expectations
- `setup/production-deployment.md`: Alchemy + Cloudflare deployment workflow and production service configuration
- `architecture/database.md`: how DB driver selection works across local Postgres and Neon
- `architecture/frontend-styling.md`: how the shared Tailwind token layer, app CSS, and UI base styles fit together
- `architecture/media-storage.md`: Cloudflare storage primitives and the current public/private split
- `flows/media-flow.md`: how uploads and public/private reads move through the app runtime
- `flows/todo-flow.md`: how the app reads and mutates user-owned todos end to end
- `worklog.md`: chronological implementation notes

Rule of thumb:

- update `worklog.md` whenever a meaningful implementation slice lands
- add or update a focused doc when a new subsystem or flow is introduced
