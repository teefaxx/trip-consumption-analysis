# Instructions for Claude

## Commits and pull requests

- Never add a `Claude-Session:` trailer or any claude.ai session link to commit
  messages, pull request descriptions or comments.
- Workflow: for every finished change, open a pull request into `main` and merge
  it once CI (lint, typecheck, tests, build) passes. Don't ask first. If CI
  fails, fix it rather than merging.
