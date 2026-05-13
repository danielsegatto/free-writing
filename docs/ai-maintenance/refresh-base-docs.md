# Refresh Base Development Docs

Use when meaningful application behavior, architecture, data flow, setup, deployment, constraints, or risks have changed.

## Canonical docs to keep current

The base development documentation is split by purpose:

- `docs/README.md`
  - Entry point and documentation index.
- `docs/product/v1-product-brief.md`
  - Product intent, target devices, Version 1 goal, exclusions, core user story, and product summary.
- `docs/product/v1-features-and-screens.md`
  - Feature behavior, screens, functional requirements, non-functional requirements, and acceptance criteria.
- `docs/architecture/firebase-pwa-architecture.md`
  - Architecture decisions, data model, Firestore structure, offline behavior, sync behavior, security, privacy, and stack options.
- `docs/implementation/current-implementation.md`
  - Actual current codebase state, stack, file responsibilities, hosting/deployment, known follow-ups, and implementation-specific notes.
- `docs/prompts/first-build-prompt.md`
  - Reusable first-build prompt and suggested development order.
- `docs/qa-v1-verification.md`
  - Manual/real-browser QA scenarios, especially Firebase and offline behavior.

When refreshing docs, update only the files whose purpose matches the change. Keep product intent separate from current implementation facts.

## Prompt

```text
Please refresh the base development documentation using docs/ai-maintenance/refresh-base-docs.md as the operating guide.

Primary objective:
Keep the docs accurate, concise, and practical as long-term context for future AI-assisted development. A future AI should be able to quickly understand the current application architecture, user flows, data model, implementation patterns, known constraints, and recent meaningful changes.

Please:
1. Review the current codebase and the canonical base docs before editing:
   - docs/README.md
   - docs/product/v1-product-brief.md
   - docs/product/v1-features-and-screens.md
   - docs/architecture/firebase-pwa-architecture.md
   - docs/implementation/current-implementation.md
   - docs/prompts/first-build-prompt.md
   - docs/qa-v1-verification.md
2. Update documentation to reflect the actual current state of the app where the target doc is implementation-focused.
3. Preserve desired product behavior in the product docs unless the intended Version 1 behavior has intentionally changed.
4. Keep implementation facts in docs/implementation/current-implementation.md, not mixed into product or architecture requirements.
5. Update docs/architecture/firebase-pwa-architecture.md when auth, data model, Firestore paths, security rules, sync, offline behavior, hosting assumptions, or technology choices change.
6. Update docs/product/v1-features-and-screens.md when feature behavior, screen behavior, requirements, or acceptance criteria change.
7. Update docs/product/v1-product-brief.md only when the product goal, target devices, exclusions, core user story, or product summary changes.
8. Update docs/prompts/first-build-prompt.md only when the reusable AI-builder prompt or development order should change.
9. Update docs/README.md when the documentation map, summary, or canonical entry-point guidance changes.
10. Update docs/qa-v1-verification.md when Firebase, offline behavior, security expectations, deployment, or real-browser QA scenarios change.
11. Prioritize information that helps a future AI continue development safely and efficiently.
12. Include important architecture decisions, component responsibilities, state/data flow, storage/offline behavior, authentication assumptions, build/run/test commands, and known risks or TODOs.
13. Remove or correct stale information.
14. Keep the writing clear and dense with useful context rather than verbose.
15. Avoid rewriting unrelated documentation unless it improves future development continuity.
16. After editing, check local Markdown links and summarize what changed, including any docs that may still need follow-up.
```
