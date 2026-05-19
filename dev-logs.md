# Dev log

## Day 1

Well, not bad, I'm refactoring this monorepo and while haing minmum hlp from AI/LLM _(except for some code generation and some questions I had)_, I made a basic init, not ready yet even to be called a functional starter, but I'll continue working on it moving forward

It took me sometime just to make sure BiomeJs and the CI is working correctly on the project... XD

## Day 2

Started working on the basic shape/content of the `packages`

## Day 3 and Day 4

Made Copilot:

- Do the initial packages for ui/auth/api/cache/config/db/env/infra/validators with an integration on the app as a prototype.
- Do use services and enable to use locale alternatives for cases when there is no access to the service, wanting to test locally, not wanting to use the service and use a local alternative, or just want to have a fallback.
  - Redis and Redis from Upstash.
  - Postgres and Postgres from NeonDB.
- It made a basic implementation of the i18n _(even after I pointed a more capable one that I made sometime before)_, will need more refactor to enhance the typing, DX, and scalability, but it's a good start. I will continue working on it and refactor it to be more usable and scalable moving forward.

## Day 5

Working on the i18n refactor, for now I changed it form an app child package to a more generic one, did a basic types enhancement.

Still need more work on it, here are my current todos

```md
TODOS:

- [ ] I18n package:
  - [ ] Split the package more, to `@de100/apps-lms-i18n-core` and `@de100/apps-lms-i18n-solid` or something like that, to separate the core logic, dependency, and integration with solidjs.
  - [ ] Make the typing more granular, to allow for better type inference and autocompletion.
- [ ] The UI package:
  - [ ] Nest/change the `@de100/ui-solidjs` package to `@de100/ui-domains-solidjs` or something like that, to separate the domain-specific components from the generic ones.
  - [ ] Make `@de100/ui-core` package, to hold the generic components, hooks, and utilities that can be used across different domains and frameworks.
```
