#!/usr/bin/env node
// PostToolUse(Edit|Write|MultiEdit): typecheck after TS edits and report errors back to Claude.
// Exit code 2 makes stderr visible to Claude; intermediate errors during multi-file changes are expected.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const input = JSON.parse(readFileSync(0, 'utf8'))
const file = String(input.tool_input?.file_path ?? '')
const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd

if (!/\.(ts|tsx)$/.test(file) || !existsSync(join(root, 'node_modules', '.bin', 'tsc')))
  process.exit(0)

const result = spawnSync('npx', ['tsc', '-b', '--noEmit', '--pretty', 'false'], {
  cwd: root,
  encoding: 'utf8',
})
if (result.status !== 0) {
  const lines = `${result.stdout}${result.stderr}`.trim().split('\n')
  process.stderr.write(
    `Typecheck failed (${lines.length} lines, first 20):\n${lines.slice(0, 20).join('\n')}\n`,
  )
  process.exit(2)
}
