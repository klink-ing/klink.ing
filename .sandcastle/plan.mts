// Interactive Plan & PR — Three-Phase Orchestration
//
// Mirrors the structure of main.mts but swaps the planner and merger:
//   Phase 1 (Plan):     An interactive session with Claude. The dev server
//                       runs on the host pointed at the temp worktree, so
//                       the user can preview live changes at localhost:4321
//                       while collaborating with Claude. Before the user
//                       exits the TUI, Claude writes:
//                         - .sandcastle/specs/<slug>.md  (the design doc)
//                         - .sandcastle/plan.json        (issues for Phase 2)
//   Phase 2 (Execute):  Same as main.mts — for each issue from the plan,
//                       implementer + reviewer run in their own sandbox.
//   Phase 3 (PR):       Instead of merging into main, an interactive Claude
//                       session merges the completed branches into a single
//                       integration branch, pushes, opens a PR via gh, and
//                       then stays interactive so the user can iterate on
//                       PR feedback (Claude commits/pushes updates).
//
// Usage:
//   vp run plan
//   (or directly: npx tsx .sandcastle/plan.mts)

/* eslint-disable no-await-in-loop, no-continue */
// The orchestration is intentionally serial: each phase depends on the
// prior phase's artifacts.

/// <reference types="node" />

import * as sandcastle from "@ai-hero/sandcastle";

import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { homedir } from "node:os";
import { join } from "node:path";
import { podman } from "@ai-hero/sandcastle/sandboxes/podman";
import { podmanWithPublish } from "./podman-publish.mts";
import process from "node:process";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEV_PORT = 4321;

// Phase 2 hooks: vp install populates the worktree's node_modules with
// Linux-native bindings so claude can run vp dev / vp test / vp build
// directly inside the sandbox.
const installHook = { command: "vp install" };

// Backgrounded dev-server start: nohup + redirected stdio detaches so the
// hook returns immediately while Astro keeps running for the container's
// lifetime. The custom provider's `publish` flag forwards the port to
// localhost on the host.
//
// We use `vp exec astro dev` (runs node_modules/.bin/astro directly)
// rather than `vp run dev` because the latter forwards a literal `--`
// to the script, which astro then mis-parses and drops the --host flag.
// Without --host, astro binds to localhost-only inside the container and
// the host port forward returns "empty reply".
const startDevHook = {
  command:
    "mkdir -p .sandcastle/logs && nohup vp exec astro dev --host 0.0.0.0 --port 4321 > .sandcastle/logs/dev-server.log 2>&1 < /dev/null &",
};

// Phase 2 (autonomous): just install. No dev server needed.
const hooks = {
  sandbox: { onSandboxReady: [installHook] },
};

// Phase 1 / Phase 3 (interactive): install + start dev server in container.
const interactiveHooks = {
  sandbox: { onSandboxReady: [installHook, startDevHook] },
};

// Mount the host's Claude Code state into every container so the in-container
// claude inherits the user's already-completed onboarding, trusted folders,
// theme, plugins, etc. — and writes session/project state back to the host.
// This avoids the first-run TUI prompts that fresh containers would otherwise
// show even with CLAUDE_CODE_OAUTH_TOKEN set.
const claudeStateMounts = [
  { hostPath: "~/.claude", sandboxPath: "~/.claude" },
  { hostPath: "~/.claude.json", sandboxPath: "~/.claude.json" },
];

// Phase 1 / Phase 3 use a custom podman provider that publishes the dev-
// server port to the host so the user's browser can hit
// http://localhost:<DEV_PORT> while the dev server runs inside the sandbox.
const interactiveSandboxProvider = () =>
  podmanWithPublish({
    mounts: claudeStateMounts,
    publish: [`${DEV_PORT}:${DEV_PORT}`],
  });

// Phase 2 (parallel autonomous implementer/reviewer) doesn't need a dev
// server, and multiple sandboxes can't all publish the same host port.
// Use sandcastle's stock podman provider — claude state is still mounted
// so commits aren't blocked by trust prompts even in --print mode.
const autonomousSandboxProvider = () => podman({ mounts: claudeStateMounts });

// Sandcastle bind-mounts the worktree to /home/agent/workspace inside the
// container — but the host has never opened that path in claude, so the
// mounted ~/.claude.json doesn't list it as a trusted project. Without
// pre-trusting it, the interactive TUI shows "Is this a project you trust?"
// for every fresh sandbox. This idempotently adds the container-internal
// workspace path to the host's trusted-projects list.
interface ClaudeJson {
  projects?: Record<string, { hasTrustDialogAccepted?: boolean } | undefined>;
}

const ensureSandboxWorkspaceTrusted = () => {
  const claudeJsonPath = join(homedir(), ".claude.json");
  if (!existsSync(claudeJsonPath)) {
    return;
  }
  const content: ClaudeJson = JSON.parse(readFileSync(claudeJsonPath, "utf8"));
  const projects = content.projects ?? {};
  const sandboxPath = "/home/agent/workspace";
  if (projects[sandboxPath]?.hasTrustDialogAccepted === true) {
    return;
  }
  projects[sandboxPath] = {
    ...projects[sandboxPath],
    hasTrustDialogAccepted: true,
  };
  content.projects = projects;
  writeFileSync(claudeJsonPath, JSON.stringify(content, undefined, 2));
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pad2 = (n: number) => String(n).padStart(2, "0");
const ts = () => {
  const d = new Date();
  return (
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}` +
    `-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
  );
};

interface Plan {
  featureSlug: string;
  issues: { id: string; title: string; branch: string }[];
}

// ---------------------------------------------------------------------------
// Phase 1: Interactive Plan
// ---------------------------------------------------------------------------

ensureSandboxWorkspaceTrusted();

const planBranch = `sandcastle/plan-${ts()}`;
console.log(`\n=== Phase 1: Interactive Plan ===\n`);
console.log(`Planning branch: ${planBranch}`);

const planSandbox = await sandcastle.createSandbox({
  branch: planBranch,
  sandbox: interactiveSandboxProvider(),
  // vp install runs Linux-native bindings into node_modules so claude can
  // run vp dev / vp test / vp build directly inside the sandbox.
  hooks: interactiveHooks,
});

console.log(`Dev server starting in sandbox at http://localhost:${DEV_PORT}`);

await planSandbox.interactive({
  agent: sandcastle.claudeCode("claude-opus-4-6"),
  promptFile: "./.sandcastle/plan-prompt-interactive.md",
  name: "planner",
  promptArgs: { DEV_URL: `http://localhost:${DEV_PORT}` },
});

// Read the plan that Claude wrote before exiting.
const planJsonPath = join(planSandbox.worktreePath, ".sandcastle", "plan.json");
if (!existsSync(planJsonPath)) {
  console.error(`\nPlanner did not produce ${planJsonPath}. Aborting before Phase 2.`);
  await planSandbox.close();
  process.exit(1);
}

const plan: Plan = JSON.parse(readFileSync(planJsonPath, "utf8"));

// Capture the spec doc before closing — Phase 2 branches fork from main and
// won't carry the planning branch's commits, so we forward the spec content
// into Phase 3's prompt.
const specPath = join(planSandbox.worktreePath, ".sandcastle", "specs", `${plan.featureSlug}.md`);
const specContent = existsSync(specPath)
  ? readFileSync(specPath, "utf8")
  : "(no spec doc found — planner did not write one)";

await planSandbox.close();

if (!plan.issues || plan.issues.length === 0) {
  console.log("\nNo issues planned. Exiting.");
  process.exit(0);
}

console.log(`\nPlan accepted. ${plan.issues.length} issue(s) to implement in parallel:`);
for (const issue of plan.issues) {
  console.log(`  ${issue.id}: ${issue.title} → ${issue.branch}`);
}

// ---------------------------------------------------------------------------
// Phase 2: Execute + Review
//
// Mirrors main.mts: createSandbox per issue, run implementer first, then
// run reviewer iff the implementer produced commits. Promise.allSettled so
// one failing pipeline doesn't cancel the others.
// ---------------------------------------------------------------------------

console.log(`\n=== Phase 2: Execute + Review ===\n`);

const settled = await Promise.allSettled(
  plan.issues.map(async (issue) => {
    const sandbox = await sandcastle.createSandbox({
      branch: issue.branch,
      sandbox: autonomousSandboxProvider(),
      hooks,
    });

    try {
      const implement = await sandbox.run({
        name: "implementer",
        maxIterations: 100,
        agent: sandcastle.claudeCode("claude-opus-4-6"),
        promptFile: "./.sandcastle/implement-prompt.md",
        promptArgs: {
          TASK_ID: issue.id,
          ISSUE_TITLE: issue.title,
          BRANCH: issue.branch,
        },
      });

      if (implement.commits.length > 0) {
        const review = await sandbox.run({
          name: "reviewer",
          maxIterations: 1,
          agent: sandcastle.claudeCode("claude-opus-4-6"),
          promptFile: "./.sandcastle/review-prompt.md",
          promptArgs: { BRANCH: issue.branch },
        });
        return {
          ...review,
          commits: [...implement.commits, ...review.commits],
        };
      }

      return implement;
    } finally {
      await sandbox.close();
    }
  }),
);

for (const [i, outcome] of settled.entries()) {
  if (outcome.status === "rejected") {
    console.error(
      `  ✗ ${plan.issues[i]?.id} (${plan.issues[i]?.branch}) failed: ${outcome.reason}`,
    );
  }
}

const completedIssues = settled
  .map((outcome, i) => ({ outcome, issue: plan.issues[i] }))
  .filter(
    (
      entry,
    ): entry is {
      outcome: PromiseFulfilledResult<sandcastle.SandboxRunResult>;
      issue: NonNullable<typeof entry.issue>;
    } =>
      entry.outcome.status === "fulfilled" &&
      entry.outcome.value.commits.length > 0 &&
      entry.issue !== undefined,
  )
  .map((entry) => entry.issue);

const completedBranches = completedIssues.map((i) => i.branch);

console.log(`\nExecution complete. ${completedBranches.length} branch(es) with commits:`);
for (const branch of completedBranches) {
  console.log(`  ${branch}`);
}

if (completedBranches.length === 0) {
  console.log("\nNo commits produced. Nothing to PR. Exiting.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Phase 3: Integration + PR + Interactive Feedback
//
// Replaces main.mts's merger: instead of merging into the host's current
// branch, this phase creates a fresh integration branch off main, drops the
// user back into an interactive Claude session, and tells Claude to merge
// the completed branches, push, open a PR via gh, then keep talking with
// the user to iterate on review feedback.
// ---------------------------------------------------------------------------

console.log(`\n=== Phase 3: PR + Interactive Feedback ===\n`);

const integrationBranch = `sandcastle/feature-${plan.featureSlug}-${ts()}`;

const prSandbox = await sandcastle.createSandbox({
  branch: integrationBranch,
  baseBranch: "main",
  sandbox: interactiveSandboxProvider(),
  hooks: interactiveHooks,
});

console.log(`Dev server starting in sandbox at http://localhost:${DEV_PORT}`);

await prSandbox.interactive({
  agent: sandcastle.claudeCode("claude-opus-4-6"),
  promptFile: "./.sandcastle/feedback-prompt.md",
  name: "pr-feedback",
  promptArgs: {
    BRANCHES: completedBranches.map((b) => `- ${b}`).join("\n"),
    FEATURE_SLUG: plan.featureSlug,
    INTEGRATION_BRANCH: integrationBranch,
    DEV_URL: `http://localhost:${DEV_PORT}`,
    SPEC_CONTENT: specContent,
  },
});

await prSandbox.close();

console.log("\nAll done.");
