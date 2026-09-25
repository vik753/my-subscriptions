#!/usr/bin/env node
// PreToolUse(Bash): blocks git operations that would bypass the dev → PR → main workflow.
// Exit code 2 blocks the tool call and shows stderr to Claude.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const input = JSON.parse(readFileSync(0, 'utf8'))
const command = String(input.tool_input?.command ?? '')

const currentBranch = () => {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: input.cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    return ''
  }
}

// Check each chained segment separately: `a && b; c | d`.
const segments = command.split(/&&|\|\||;|\|/).map((s) => s.trim())
const problems = []

for (const seg of segments) {
  if (/^gh\s+pr\s+merge\b/.test(seg))
    problems.push('`gh pr merge` — the user merges PRs into main personally.')
  if (!/^git\s/.test(seg)) continue

  const isPush = /^git\s+push\b/.test(seg)
  const isCommit = /^git\s+commit\b/.test(seg)
  const isMerge = /^git\s+(merge|rebase|cherry-pick|reset)\b/.test(seg)

  if ((isPush || isCommit) && /(^|\s)(--no-verify|-n)(\s|$)/.test(seg))
    problems.push('`--no-verify` / `-n` — git hooks must run. Fix the failing check instead.')
  if (
    isPush &&
    /(^|\s)(--force|--force-with-lease|-f|--mirror|--delete|-d)(\s|$)|\s\+\S+/.test(seg)
  )
    problems.push('Force / mirror / delete push is forbidden.')
  if (isPush && /(\s|:|\/)main(\s|$)/.test(seg))
    problems.push('Pushing to `main` is forbidden. Push to `dev` and open a PR.')

  const branch = currentBranch()
  if (branch === 'main') {
    if (isCommit || isMerge)
      problems.push('Committing or merging on `main` is forbidden. Switch to `dev`.')
    // A bare `git push` / `git push origin` on main would push main.
    if (isPush && /^git\s+push(\s+(-u|--set-upstream))?(\s+origin)?\s*$/.test(seg))
      problems.push('Bare `git push` while on `main` is forbidden.')
  }
}

if (problems.length) {
  process.stderr.write(
    `Blocked by .claude/hooks/guard-git.mjs:\n- ${[...new Set(problems)].join('\n- ')}\n`,
  )
  process.exit(2)
}
