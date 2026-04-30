FROM node:22-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

# Rename the base image's "node" user (UID 1000) to "agent". Sandcastle's
# docker provider runs the container as the *host* UID/GID (e.g. 502:20 on
# macOS), not 1000:1000, so /home/agent must be writable for arbitrary UIDs —
# we chmod after all agent-owned installs below.
RUN usermod -d /home/agent -m -l agent node
USER agent

# Install Claude Code CLI
RUN curl -fsSL https://claude.ai/install.sh | bash

# Install Vite+ (vp). VP_NODE_MANAGER=no skips the interactive prompt and tells
# the installer not to manage its own Node (we use the base image's Node 22).
RUN curl -fsSL https://vite.plus | VP_NODE_MANAGER=no bash

# Make the entire home directory world-writable so the container — which runs
# as the host UID, not 1000 — can write npm/pnpm/git/Claude state at runtime.
# Must run after the installers above so newly created files are also chmod'd.
RUN chmod -R 0777 /home/agent

# Add Claude and Vite+ to PATH. CI=true tells pnpm (wrapped by Vite+) to run
# non-interactively — it lets pnpm purge a stale node_modules (copied from the
# host) instead of aborting on missing TTY.
ENV PATH="/home/agent/.local/bin:/home/agent/.vite-plus/bin:$PATH" \
    CI=true

WORKDIR /home/agent

# In worktree sandbox mode, Sandcastle bind-mounts the git worktree at /home/agent/workspace
# and overrides the working directory to /home/agent/workspace at container start.
# Structure your Dockerfile so that /home/agent/workspace can serve as the project root.
ENTRYPOINT ["sleep", "infinity"]
