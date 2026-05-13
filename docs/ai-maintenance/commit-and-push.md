# Commit And Push Context Checkpoint

Use after documentation refreshes, AI maintainability refactors, or meaningful feature/fix work.

## Checkpoint rules

- Review both tracked and untracked files before committing.
- Treat documentation moves as first-class changes: include the new file, the deleted old file, and all reference updates together.
- If documentation changed, check local Markdown links before committing.
- Do not include local secrets, `.env` files, generated caches, or unrelated temporary files.
- If unrelated user changes are present, preserve them and only include them when they clearly belong to the requested checkpoint.

## Prompt

```text
Please review the current git changes, then create a commit and push it using docs/ai-maintenance/commit-and-push.md as the operating guide.

Primary objective:
Create a useful development checkpoint for future AI-assisted work. The commit message should clearly explain the meaningful application changes, refactors, and documentation/context updates so another AI or developer can understand why this checkpoint matters.

Please:
1. Inspect `git status` and review the diff before committing.
2. Do not revert or discard any existing user changes.
3. Include all relevant application and documentation changes that belong to this checkpoint, including renamed, deleted, and newly added docs.
4. Exclude unrelated local files, secrets, generated caches, and temporary artifacts.
5. If documentation changed, verify local Markdown links before committing.
6. Run reasonable verification first if appropriate and available.
7. Write a concise but informative commit message focused on what changed and why it matters for continued development.
8. Prefer this shape:

   Subject:
   `Update app structure and AI development context`

   Body:
   - Summarize meaningful user-facing or architectural changes.
   - Summarize refactors that make future development easier.
   - Summarize documentation updates that preserve project context.
   - Mention verification performed.

9. Commit the changes.
10. Push the commit to the current remote branch.
11. Report the commit hash, branch, high-level files changed, and whether verification passed.
```
