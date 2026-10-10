# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- Create issues with `gh issue create --title "..." --body "..."`.
- Read issues with `gh issue view <number> --json number,title,body,labels,comments`.
- List issues with `gh issue list`, applying relevant state and label filters.
- Add or remove labels with `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- Comment with `gh issue comment <number> --body "..."`.
- Infer the repository from the GitHub remote.

## Pull requests as a triage surface

**PRs as a request surface: no.** External pull requests are not triaged as feature requests by default.

## Publishing tickets

Create one GitHub issue per ticket. Publish in dependency order; use native blocking relationships when available, otherwise include a `Blocked by: #<number>` line in each issue body. Apply `ready-for-agent` to agent-ready tickets.

## Fetching tickets

Read the referenced issue using `gh issue view`.
