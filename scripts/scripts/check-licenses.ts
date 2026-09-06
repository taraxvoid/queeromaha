#!/usr/bin/env bun
/**
 * Blocks GPL-family (and similarly "viral"/network-copyleft) production
 * dependencies across the monorepo.
 *
 * `license-checker --production` alone (run once from the repo root) does
 * NOT work here: license-checker's --production filtering walks edges from
 * a package's own "dependencies" field, and the root package.json has none
 * of its own (only devDependencies + a "workspaces" list) - bun's monorepo
 * layout means there's no npm-style lockfile for arborist to resolve
 * workspace-member dependency edges from the root. Run from the root,
 * --production silently resolves to just the root package itself (zero
 * deps scanned) - a false pass, not a clean bill of health.
 *
 * The fix: run `license-checker --production` once per workspace package
 * (apps/*, packages/*), invoked from inside that package's directory, where
 * its own "dependencies" field DOES resolve correctly against the shared
 * hoisted node_modules. This is verified to pick up deps from every
 * workspace (see check:licenses verification notes in the PR).
 *
 * Usage: bun run check:licenses
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const FAIL_ON = [
  "GPL-1.0",
  "GPL-1.0-only",
  "GPL-1.0-or-later",
  "GPL-2.0",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "GPL-3.0",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "AGPL-1.0",
  "AGPL-1.0-only",
  "AGPL-1.0-or-later",
  "AGPL-2.0",
  "AGPL-2.0-only",
  "AGPL-2.0-or-later",
  "AGPL-3.0",
  "AGPL-3.0-only",
  "AGPL-3.0-or-later",
  "SSPL-1.0",
  "OSL-2.1",
  "OSL-3.0",
  "CPAL-1.0",
  "EUPL-1.1",
  "EUPL-1.2",
  "CECILL-2.1",
  // LGPL is deliberately NOT in this list - it only imposes obligations on
  // modifying/statically linking the library, not on depending on it as-is.
].join(";");

function workspaceDirs(): string[] {
  const dirs: string[] = [];
  for (const group of ["apps", "packages"]) {
    const groupPath = join(ROOT, group);
    if (!existsSync(groupPath)) continue;
    for (const name of readdirSync(groupPath)) {
      const pkgDir = join(groupPath, name);
      if (existsSync(join(pkgDir, "package.json"))) {
        dirs.push(pkgDir);
      }
    }
  }
  return dirs;
}

let failed = false;

for (const dir of workspaceDirs()) {
  const relDir = dir.replace(`${ROOT}/`, "");
  console.log(`\n> Checking licenses: ${relDir}`);
  const result = spawnSync("bunx", ["license-checker", "--production", "--summary", "--failOn", FAIL_ON], {
    cwd: dir,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    failed = true;
  }
}

if (failed) {
  console.error("\ncheck:licenses failed - a GPL-family (or similarly blocked) license was found.");
  process.exit(1);
}

console.log("\ncheck:licenses passed - no blocked licenses found in any workspace.");
