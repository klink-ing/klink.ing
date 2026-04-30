# PR creation + interactive review feedback

Two phases of work in this session, in order.

## Phase A — autonomous PR setup (do this immediately, before talking)

You are on integration branch `{{INTEGRATION_BRANCH}}` (forked from `main`).
The feature slug is `{{FEATURE_SLUG}}`.

The agreed spec for this feature (from the planning session) is below — use
it to draft the PR description. It is NOT in this worktree; it lives only on
the planning branch which is not being merged into main.

```spec
{{SPEC_CONTENT}}
```

The Phase 2 agents committed work to these branches:

{{BRANCHES}}

Do the following without asking — just report progress as you go:

1. Merge each branch listed above into the current branch in order. If a
   merge conflicts, resolve it sensibly (favoring the implementer branch's
   intent for feature code, the integration branch's intent for test/config
   collisions). Commit the merges.
2. Use the spec block above to draft a PR title (≤70 chars) and body. The
   PR body should include a "Summary" section, the spec's acceptance
   criteria as a checklist, and a "Test plan" section.
3. Push `{{INTEGRATION_BRANCH}}` to origin: `git push -u origin
{{INTEGRATION_BRANCH}}`.
4. Create a PR with `gh pr create --title "..." --body "..."`. Pass the body
   via heredoc to preserve formatting.
5. Print the PR URL clearly so the user sees it.

If any step fails, stop and report the error — don't keep retrying blindly.

## Phase B — interactive feedback (after Phase A succeeds)

Once the PR is open, **tell the user the PR URL** and wait for them. They'll
share review feedback (paste comments, or just describe what to change). For
each item:

- Make the requested change in code.
- Commit with a message that references the feedback.
- Push the commit to the same branch (the PR auto-updates).
- Confirm with the user.

The dev server is running on the host at {{DEV_URL}} so the user can preview
changes live. You can run read-only inspections (`git`, `grep`, `gh pr view`,
`gh pr view --comments`) but **do not** run `vp dev`, `vp test`, or `vp
build` — `node_modules` in this worktree was bind-copied from a Linux
container build and the host runs the dev server.

When the user says they're done, exit (Ctrl-D).
