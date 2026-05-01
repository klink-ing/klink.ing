// Custom Podman sandbox provider that adds `publish` (port-forwarding)
// support to sandcastle's built-in podman provider.
//
// Sandcastle 0.5.5's `podman()` doesn't expose a `--publish`/`-p` flag. We
// need it so a dev server running inside the sandbox is reachable from the
// host browser at localhost:<port>. Once sandcastle adds the option upstream
// this file can be replaced with a direct call to the official provider.
//
// Most of this is a near-verbatim port of
//   @ai-hero/sandcastle/sandboxes/podman.js
// with two tweaks:
//   1. Accepts `publish: string[]` (e.g. ["4321:4321"]) and emits `-p` flags.
//   2. Inlines tilde expansion + mount-existence validation since
//      `resolveUserMounts` is internal.

/* eslint-disable */
// @ts-nocheck — this file is a near-verbatim port of upstream JS; strict TS
// and lint rules conflict with the upstream shape. Future syncs stay simple.

/// <reference types="node" />

import { createBindMountSandboxProvider } from "@ai-hero/sandcastle";
import { execFile, execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";
import process from "node:process";
import { createInterface } from "node:readline";

interface MountConfig {
  hostPath: string;
  sandboxPath: string;
  readonly?: boolean;
}

interface PodmanWithPublishOptions {
  imageName?: string;
  selinuxLabel?: "z" | "Z" | false;
  userns?: "keep-id" | false;
  containerUid?: number;
  containerGid?: number;
  mounts?: readonly MountConfig[];
  /** Port-publish specs: ["host:container", ...] e.g. ["4321:4321"]. */
  publish?: readonly string[];
  env?: Record<string, string>;
  network?: string | readonly string[];
}

const SANDBOX_HOMEDIR = "/home/agent";

const expandTilde = (path: string, base: string) =>
  path.startsWith("~/") ? resolve(base, path.slice(2)) : path;

const resolveHostMount = (m: MountConfig): MountConfig => {
  const hostPath = expandTilde(m.hostPath, homedir());
  const sandboxPath = m.sandboxPath.startsWith("~/")
    ? expandTilde(m.sandboxPath, SANDBOX_HOMEDIR)
    : isAbsolute(m.sandboxPath)
      ? m.sandboxPath
      : resolve(SANDBOX_HOMEDIR, m.sandboxPath);
  if (!existsSync(hostPath)) {
    throw new Error(`Mount hostPath does not exist: ${m.hostPath}`);
  }
  return { hostPath, sandboxPath, ...(m.readonly ? { readonly: true } : {}) };
};

const formatVolumeMount = (mount: MountConfig, selinuxLabel: "z" | "Z" | false) => {
  const base = `${mount.hostPath}:${mount.sandboxPath}`;
  const opts = [
    mount.readonly ? "ro" : undefined,
    selinuxLabel === false ? undefined : selinuxLabel,
  ]
    .filter((o): o is string => o !== undefined)
    .join(",");
  return opts ? `${base}:${opts}` : base;
};

const checkPodmanMachine = () =>
  new Promise<void>((res, rej) => {
    execFile("podman", ["machine", "list", "--format", "json"], (err, stdout) => {
      if (err) {
        rej(
          new Error(
            "Podman Machine is not running. Run 'podman machine init && podman machine start' first.",
          ),
        );
        return;
      }
      try {
        const machines = JSON.parse(stdout.toString()) as { Running?: boolean }[];
        if (machines.some((m) => m.Running)) {
          res();
        } else {
          rej(
            new Error(
              "Podman Machine is not running. Run 'podman machine init && podman machine start' first.",
            ),
          );
        }
      } catch {
        rej(
          new Error(
            "Podman Machine is not running. Run 'podman machine init && podman machine start' first.",
          ),
        );
      }
    });
  });

const checkImage = (imageName: string) =>
  new Promise<void>((res, rej) => {
    execFile("podman", ["image", "inspect", imageName], (err) => {
      if (err) {
        rej(
          new Error(
            `Image '${imageName}' not found locally. Build it first with 'podman build -t ${imageName} .sandcastle'.`,
          ),
        );
      } else {
        res();
      }
    });
  });

export const podmanWithPublish = (
  options: PodmanWithPublishOptions = {},
): BindMountSandboxProvider => {
  const selinuxLabel = options.selinuxLabel ?? "z";
  const userns = options.userns ?? "keep-id";
  const containerUid = options.containerUid ?? 1000;
  const containerGid = options.containerGid ?? 1000;
  const userMounts = (options.mounts ?? []).map(resolveHostMount);
  const publishArgs = (options.publish ?? []).flatMap((p) => ["-p", p]);

  return createBindMountSandboxProvider({
    name: "podman",
    env: options.env,
    sandboxHomedir: SANDBOX_HOMEDIR,
    create: async (createOptions): Promise<BindMountSandboxHandle> => {
      const containerName = `sandcastle-${randomUUID()}`;
      const worktreePath =
        createOptions.mounts.find((m) => m.hostPath === createOptions.worktreePath)?.sandboxPath ??
        "/home/agent/workspace";

      const allMounts = [...createOptions.mounts, ...userMounts];
      const volumeArgs = allMounts.flatMap((m) => ["-v", formatVolumeMount(m, selinuxLabel)]);

      const imageName =
        options.imageName ?? `sandcastle:${createOptions.hostRepoPath.split("/").pop()}`;

      if (process.platform === "darwin" || process.platform === "win32") {
        await checkPodmanMachine();
      }
      await checkImage(imageName);

      const env = { ...createOptions.env, HOME: SANDBOX_HOMEDIR };
      const envArgs = Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]);
      const usernsArgs = userns ? [`--userns=keep-id:uid=${containerUid},gid=${containerGid}`] : [];
      const userArgs = ["--user", `${containerUid}:${containerGid}`];
      const networks = options.network
        ? Array.isArray(options.network)
          ? options.network
          : [options.network as string]
        : [];
      const networkArgs = networks.flatMap((n) => ["--network", n]);

      await new Promise<void>((res, rej) => {
        execFile(
          "podman",
          [
            "run",
            "-d",
            "--name",
            containerName,
            ...userArgs,
            ...usernsArgs,
            ...networkArgs,
            ...publishArgs,
            "-w",
            worktreePath,
            ...envArgs,
            ...volumeArgs,
            "--entrypoint",
            "sleep",
            imageName,
            "infinity",
          ],
          (err) => {
            if (err) {
              rej(new Error(`podman run failed: ${err.message}`));
            } else {
              res();
            }
          },
        );
      });

      const onExit = () => {
        try {
          execFileSync("podman", ["rm", "-f", containerName], {
            stdio: "ignore",
            timeout: 5000,
          });
        } catch {
          /* best-effort */
        }
      };
      const onSignal = () => {
        onExit();
        process.exit(1);
      };
      process.on("exit", onExit);
      process.on("SIGINT", onSignal);
      process.on("SIGTERM", onSignal);

      return {
        worktreePath,
        exec: (command, opts) => {
          const effective = opts?.sudo ? `sudo ${command}` : command;
          const args = ["exec"];
          if (opts?.stdin !== undefined) {
            args.push("-i");
          }
          if (opts?.cwd) {
            args.push("-w", opts.cwd);
          }
          args.push(containerName, "sh", "-c", effective);
          return new Promise((res, rej) => {
            const proc = spawn("podman", args, {
              stdio: [opts?.stdin !== undefined ? "pipe" : "ignore", "pipe", "pipe"],
            });
            if (opts?.stdin !== undefined) {
              proc.stdin.write(opts.stdin);
              proc.stdin.end();
            }
            const out: string[] = [];
            const errChunks: string[] = [];
            if (opts?.onLine) {
              const { onLine } = opts;
              const rl = createInterface({ input: proc.stdout });
              rl.on("line", (line) => {
                out.push(line);
                onLine(line);
              });
            } else {
              proc.stdout.on("data", (c: Buffer) => out.push(c.toString()));
            }
            proc.stderr.on("data", (c: Buffer) => errChunks.push(c.toString()));
            proc.on("error", (e) => rej(new Error(`podman exec failed: ${e.message}`)));
            proc.on("close", (code) =>
              res({
                stdout: out.join(opts?.onLine ? "\n" : ""),
                stderr: errChunks.join(""),
                exitCode: code ?? 0,
              }),
            );
          });
        },
        interactiveExec: (args, opts) =>
          new Promise((res, rej) => {
            const podmanArgs = ["exec"];
            if ("isTTY" in opts.stdin && (opts.stdin as NodeJS.ReadStream).isTTY) {
              podmanArgs.push("-it");
            } else {
              podmanArgs.push("-i");
            }
            if (opts.cwd) {
              podmanArgs.push("-w", opts.cwd);
            }
            podmanArgs.push(containerName, ...args);
            const proc = spawn("podman", podmanArgs, {
              stdio: [opts.stdin, opts.stdout, opts.stderr],
            });
            proc.on("error", (e) => rej(new Error(`podman exec failed: ${e.message}`)));
            proc.on("close", (code) => res({ exitCode: code ?? 0 }));
          }),
        copyFileIn: (hostPath, sandboxPath) =>
          new Promise((res, rej) => {
            execFile("podman", ["cp", hostPath, `${containerName}:${sandboxPath}`], (err) => {
              if (err) {
                rej(new Error(`podman cp (in) failed: ${err.message}`));
              } else {
                res();
              }
            });
          }),
        copyFileOut: (sandboxPath, hostPath) =>
          new Promise((res, rej) => {
            execFile("podman", ["cp", `${containerName}:${sandboxPath}`, hostPath], (err) => {
              if (err) {
                rej(new Error(`podman cp (out) failed: ${err.message}`));
              } else {
                res();
              }
            });
          }),
        close: async () => {
          process.removeListener("exit", onExit);
          process.removeListener("SIGINT", onSignal);
          process.removeListener("SIGTERM", onSignal);
          await new Promise<void>((res, rej) => {
            execFile("podman", ["rm", "-f", containerName], (err) => {
              if (err) {
                rej(new Error(`podman rm failed: ${err.message}`));
              } else {
                res();
              }
            });
          });
        },
      };
    },
  });
};
