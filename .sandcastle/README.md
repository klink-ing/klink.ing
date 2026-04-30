# Sandcastle agents

Two entrypoints:

- `vp run sandcastle` — autonomous: reads open `Sandcastle`-labeled GitHub issues, plans + implements + reviews + merges them in parallel. See [main.mts](./main.mts).
- `vp run plan` — interactive: opens a Claude TUI where you collaborate on a feature with `vp dev` running on the host (preview at `localhost:4321`), then hands off to autonomous implementer/reviewer agents per sub-task, then opens a PR and stays interactive for review feedback. See [plan.mts](./plan.mts).

## One-time setup

The sandbox runtime is **Podman** (not Docker). Sandcastle's podman provider maps the host UID into UID 1000 inside the container via `--userns=keep-id`, which avoids the docker-on-macOS UID-mismatch problems and the resulting `.pnpm-store/` pollution in the repo root.

### Install Podman

```sh
brew install podman          # or: install Podman Desktop
podman machine init
podman machine start
```

Verify:

```sh
podman machine list --format json     # one machine, "Running": true
podman --version
```

If the machine isn't running when you invoke a sandcastle script, you'll get a clear error: _"Podman Machine is not running. Run 'podman machine init && podman machine start' first."_

### Build the image

```sh
podman build -t sandcastle:klinking .sandcastle
```

You only need to rebuild when [Dockerfile](./Dockerfile) changes.

### Configure secrets

Copy `.env.example` to `.env` and set:

- `CLAUDE_CODE_OAUTH_TOKEN` — generated via `claude setup-token` on the host. The OAuth token format is `sk-ant-oat...`. Do **not** put an `sk-ant-api...` API key in this slot; the sandbox runs Claude Code, which uses the OAuth flow.
- `GH_TOKEN` — a GitHub PAT with `repo` and `pull_request` scopes for the agent to read issues / open PRs.

`.sandcastle/.env` is gitignored.

## Running

```sh
vp run sandcastle     # autonomous parallel issue fan-out
vp run plan           # interactive feature planning + PR
```

Logs land in `.sandcastle/logs/<agent>.log` per phase. Worktrees are managed under `.sandcastle/worktrees/`.

## Why Podman, not Docker

Earlier iterations of this setup used Docker Desktop on macOS, which surfaced two macOS-specific problems:

1. Docker runs containers as the **host UID** (typically 502 on macOS), but the image's home directory was created for UID 1000 — required a `chmod -R 0777 /home/agent` workaround.
2. Docker's `grpcfuse` bind-mount layer presented `/home/agent/workspace` and `/home/agent` as different filesystems, so pnpm's hardlink-based store hit `EXDEV` and dropped a fallback `.pnpm-store/` in the project root.

Podman's `--userns=keep-id` solves (1) at the runtime layer and its bind-mount semantics solve (2). The Dockerfile is unchanged across the switch — Containerfiles are compatible.
