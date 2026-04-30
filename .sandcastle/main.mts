// Parallel Planner with Review — four-phase orchestration loop
//
// This template drives a multi-phase workflow:
//   Phase 1 (Plan):             An opus agent analyzes open issues, builds a
//                               dependency graph, and outputs a <plan> JSON
//                               listing unblocked issues with branch names.
//   Phase 2 (Execute + Review): For each issue, a sandbox is created via
//                               createSandbox(). The implementer runs first
//                               (100 iterations). If it produces commits, a
//                               reviewer runs in the same sandbox on the same
//                               branch (1 iteration). All issue pipelines run
//                               concurrently via Promise.allSettled().
//   Phase 3 (Merge):            A single agent merges all completed branches
//                               into the current branch.
//
// The outer loop repeats up to MAX_ITERATIONS times so that newly unblocked
// issues are picked up after each round of merges.
//
// Usage:
//   npx tsx .sandcastle/main.mts
// Or add to package.json:
//   "scripts": { "sandcastle": "npx tsx .sandcastle/main.mts" }

/* eslint-disable no-await-in-loop, no-continue */
// The orchestration loop is intentionally serial: each iteration's plan
// depends on the prior iteration's merges, and merge runs after execute.

import * as sandcastle from "@ai-hero/sandcastle";
import { podman } from "@ai-hero/sandcastle/sandboxes/podman";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Maximum number of plan→execute→merge cycles before stopping.
// Raise this if your backlog is large; lower it for a quick smoke-test run.
const MAX_ITERATIONS = 10;

// Warm up Claude Code so the user's interactive session doesn't trip the
// first-run onboarding wizard. CLAUDE_CODE_OAUTH_TOKEN authenticates the
// API call, but ~/.claude.json (Claude's state file) is only populated
// after the first real claude invocation; without this warmup the
// container's fresh $HOME causes the TUI to show setup prompts.
// Haiku is the cheapest model and the prompt is intentionally trivial.
const claudeWarmup = {
  command:
    "echo init | claude --print --model claude-haiku-4-5 --output-format text -p - > /dev/null",
};

// Hooks run inside the sandbox before the agent starts each iteration.
// vp install ensures the sandbox always has fresh dependencies. Vite+ wraps
// the project's package manager (pnpm here) and understands pnpm catalogs.
const hooks = {
  sandbox: { onSandboxReady: [{ command: "vp install" }, claudeWarmup] },
};

// Copy node_modules from the host into the worktree before each sandbox
// starts. Avoids a full npm install from scratch; the hook above handles
// platform-specific binaries and any packages added since the last copy.
const copyToWorktree = ["node_modules"];

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  // -------------------------------------------------------------------------
  // Phase 1: Plan
  //
  // The planning agent (opus, for deeper reasoning) reads the open issue list,
  // builds a dependency graph, and selects the issues that can be worked in
  // parallel right now (i.e., no blocking dependencies on other open issues).
  //
  // It outputs a <plan> JSON block — we parse that to drive Phase 2.
  // -------------------------------------------------------------------------
  const plan = await sandcastle.run({
    // Skip dependency install for the planner: it only runs `gh issue list`
    // and reasons over the result, so node_modules isn't needed. Skipping
    // also avoids hitting the 60s hook timeout on a fresh temp worktree.
    sandbox: podman(),
    name: "planner",
    // Use a temp-branch worktree instead of bind-mounting the host repo.
    // The default "head" strategy would cause the in-container `vp install`
    // hook to rewrite the host's node_modules with Linux native bindings,
    // breaking macOS host tooling until the next host-side `vp install`.
    branchStrategy: { type: "merge-to-head" },
    // One iteration is enough: the planner just needs to read and reason,
    // not write code.
    maxIterations: 1,
    // Opus for planning: dependency analysis benefits from deeper reasoning.
    agent: sandcastle.claudeCode("claude-opus-4-6"),
    promptFile: "./.sandcastle/plan-prompt.md",
  });

  // Extract the <plan>…</plan> block from the agent's stdout.
  const planMatch = /<plan>([\s\S]*?)<\/plan>/.exec(plan.stdout);
  if (!planMatch) {
    throw new Error(`Planning agent did not produce a <plan> tag.\n\n${plan.stdout}`);
  }

  // The plan JSON contains an array of issues, each with id, title, branch.
  const planJson: { issues: { id: string; title: string; branch: string }[] } = JSON.parse(
    planMatch[1] ?? "",
  );
  const { issues } = planJson;

  if (issues.length === 0) {
    // No unblocked work — either everything is done or everything is blocked.
    console.log("No unblocked issues to work on. Exiting.");
    break;
  }

  console.log(`Planning complete. ${issues.length} issue(s) to work in parallel:`);
  for (const issue of issues) {
    console.log(`  ${issue.id}: ${issue.title} → ${issue.branch}`);
  }

  // -------------------------------------------------------------------------
  // Phase 2: Execute + Review
  //
  // For each issue, create a sandbox via createSandbox() so the implementer
  // and reviewer share the same sandbox instance per branch. The implementer
  // runs first; if it produces commits, the reviewer runs in the same sandbox.
  //
  // Promise.allSettled means one failing pipeline doesn't cancel the others.
  // -------------------------------------------------------------------------

  const settled = await Promise.allSettled(
    issues.map(async (issue) => {
      const sandbox = await sandcastle.createSandbox({
        branch: issue.branch,
        sandbox: podman(),
        hooks,
        copyToWorktree,
      });

      try {
        // Run the implementer
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

        // Only review if the implementer produced commits
        if (implement.commits.length > 0) {
          const review = await sandbox.run({
            name: "reviewer",
            maxIterations: 1,
            agent: sandcastle.claudeCode("claude-opus-4-6"),
            promptFile: "./.sandcastle/review-prompt.md",
            promptArgs: {
              BRANCH: issue.branch,
            },
          });

          // Merge commits from both runs so the merge phase sees all of them.
          // Each sandbox.run() only returns commits from its own run.
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

  // Log any agents that threw (network error, sandbox crash, etc.).
  for (const [i, outcome] of settled.entries()) {
    if (outcome.status === "rejected") {
      console.error(`  ✗ ${issues[i].id} (${issues[i].branch}) failed: ${outcome.reason}`);
    }
  }

  // Only pass branches that actually produced commits to the merge phase.
  // An agent that ran successfully but made no commits has nothing to merge.
  const completedIssues = settled
    .map((outcome, i) => ({ outcome, issue: issues[i] }))
    .filter(
      (entry) => entry.outcome.status === "fulfilled" && entry.outcome.value.commits.length > 0,
    )
    .map((entry) => entry.issue);

  const completedBranches = completedIssues.map((i) => i.branch);

  console.log(`\nExecution complete. ${completedBranches.length} branch(es) with commits:`);
  for (const branch of completedBranches) {
    console.log(`  ${branch}`);
  }

  if (completedBranches.length === 0) {
    // All agents ran but none made commits — nothing to merge this cycle.
    console.log("No commits produced. Nothing to merge.");
    continue;
  }

  // -------------------------------------------------------------------------
  // Phase 3: Merge
  //
  // One agent merges all completed branches into the current branch,
  // resolving any conflicts and running tests to confirm everything works.
  //
  // The {{BRANCHES}} and {{ISSUES}} prompt arguments are lists that the agent
  // uses to know which branches to merge and which issues to close.
  // -------------------------------------------------------------------------
  await sandcastle.run({
    hooks,
    sandbox: podman(),
    name: "merger",
    maxIterations: 1,
    agent: sandcastle.claudeCode("claude-opus-4-6"),
    promptFile: "./.sandcastle/merge-prompt.md",
    promptArgs: {
      // A markdown list of branch names, one per line.
      BRANCHES: completedBranches.map((b) => `- ${b}`).join("\n"),
      // A markdown list of issue IDs and titles, one per line.
      ISSUES: completedIssues.map((i) => `- ${i.id}: ${i.title}`).join("\n"),
    },
  });

  console.log("\nBranches merged.");
}

console.log("\nAll done.");
