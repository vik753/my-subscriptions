---
name: ship
description: Verify, commit, push to dev and open or update the dev → main pull request. Use when a task is finished and should be shipped for the user's review.
---

Ship the current work. Stop at the first failure and report it — never skip or bypass a step.

1. `git switch dev` if not already on `dev` (feature branches: merge into `dev` first with `git merge --no-ff <branch>`).
2. Run checks, trimming output to failures:
   `npm run typecheck && npm run lint && npm test -- --reporter=dot 2>&1 | tail -30`
   If UI changed, also `npm run test:e2e 2>&1 | tail -30`.
3. If the diff touches `src/` beyond trivial changes, run the `reviewer` agent. Fix every blocker/major before continuing.
4. Stage only files related to the task (`git add <paths>`, never blindly `-A` if unrelated files are modified). Commit with a Conventional Commit message in English. The pre-commit hook must pass — never use `--no-verify`.
5. `git push origin dev` (first time: `git push -u origin dev`).
6. PR `dev → main`:
   - none open → `gh pr create --base main --head dev --title "<summary>" --body "<body>"`;
   - already open → `gh pr edit` to update the body.
     Body: **What changed**, **How verified** (commands run + results), **Screenshots** (UI), **Open questions**. End with the attribution line required by the session.
7. `gh pr checks --watch` is not needed; report the PR URL and remind the user that merging into `main` is theirs.

Reply in the user's language, ≤ 6 lines: commit(s), checks result, PR link.
