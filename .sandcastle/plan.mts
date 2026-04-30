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

import { createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";

import { join } from "node:path";
import { podman } from "@ai-hero/sandcastle/sandboxes/podman";
import process from "node:process";
import { spawn } from "node:child_process";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEV_PORT = 4321;

// Hooks run inside the sandbox before each agent iteration. `vp install`
// understands the project's pnpm catalogs.
const hooks = {
  sandbox: { onSandboxReady: [{ command: "vp install" }] },
};

// Copy node_modules from the host into the worktree before sandbox start
// so the in-container `vp install` only has to do a fast delta install.
const copyToWorktree = ["node_modules"];

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

interface DevServer {
  stop: () => void;
}

// Spawn `vp run dev` on the HOST in the given worktree directory. Hot-reload
// picks up edits Claude makes in the bind-mounted worktree from the sandbox.
// Skipping a sandbox-side dev server avoids needing docker port-publishing
// (the docker provider does not expose a `--publish` option).
const startDevServer = (worktreePath: string): DevServer => {
  const logsDir = join(worktreePath, ".sandcastle", "logs");
  mkdirSync(logsDir, { recursive: true });
  const log = createWriteStream(join(logsDir, "dev-server.log"), { flags: "a" });

  const proc = spawn("vp", ["run", "dev", "--", "--port", String(DEV_PORT)], {
    cwd: worktreePath,
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });
  proc.stdout.pipe(log);
  proc.stderr.pipe(log);

  console.log(`Dev server starting at http://localhost:${DEV_PORT}`);
  console.log(`  tail -f ${join(logsDir, "dev-server.log")}`);

  return {
    stop: () => {
      try {
        proc.kill("SIGTERM");
      } catch {
        /* best-effort */
      }
    },
  };
};

interface Plan {
  featureSlug: string;
  issues: { id: string; title: string; branch: string }[];
}

// ---------------------------------------------------------------------------
// Phase 1: Interactive Plan
// ---------------------------------------------------------------------------

const planBranch = `sandcastle/plan-${ts()}`;
console.log(`\n=== Phase 1: Interactive Plan ===\n`);
console.log(`Planning branch: ${planBranch}`);

const planSandbox = await sandcastle.createSandbox({
  branch: planBranch,
  sandbox: podman(),
  // No install hook here — dev server runs on the host, and skipping the
  // 60s hook on a fresh worktree gets the user into Claude immediately.
  copyToWorktree,
});

const planDev = startDevServer(planSandbox.worktreePath);

try {
  await planSandbox.interactive({
    agent: sandcastle.claudeCode("claude-opus-4-6"),
    promptFile: "./.sandcastle/plan-prompt-interactive.md",
    name: "planner",
    promptArgs: { DEV_URL: `http://localhost:${DEV_PORT}` },
  });
} finally {
  planDev.stop();
}

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
      sandbox: podman(),
      hooks,
      copyToWorktree,
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
  sandbox: podman(),
  // No install hook — the host runs `vp dev` against the bind-mounted
  // worktree, so the worktree's node_modules must stay macOS-compatible
  // (sandbox-side `vp install` would replace it with Linux bindings).
  copyToWorktree,
});

const prDev = startDevServer(prSandbox.worktreePath);

try {
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
} finally {
  prDev.stop();
}

await prSandbox.close();

console.log("\nAll done.");
