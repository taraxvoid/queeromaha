#!/usr/bin/env bun
/**
 * Blocks GPL-family (and similarly "viral"/network-copyleft) production
 * dependencies across the package.
 *
 * license-checker's --production filtering walks edges from a package's
 * own "dependencies" field, so it must be run from inside that package's
 * directory (the repository root for this single-package repo).
 *
 * workspaceDirs() scans apps/* and packages/* for monorepo layouts and
 * falls back to the repository root when neither exists (this repo is a
 * single package, so its runtime dependencies are scanned directly).
 *
 * The pinned @lizenz/checker fork parses `license-checker --failOn` as a
 * semicolon-delimited list, so FAIL_ON is joined with ";".
 *
 * Usage: bun run check:licenses
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

const FAIL_ON = [
    'GPL-1.0',
    'GPL-1.0-only',
    'GPL-1.0-or-later',
    'GPL-2.0',
    'GPL-2.0-only',
    'GPL-2.0-or-later',
    'GPL-3.0',
    'GPL-3.0-only',
    'GPL-3.0-or-later',
    'AGPL-1.0',
    'AGPL-1.0-only',
    'AGPL-1.0-or-later',
    'AGPL-2.0',
    'AGPL-2.0-only',
    'AGPL-2.0-or-later',
    'AGPL-3.0',
    'AGPL-3.0-only',
    'AGPL-3.0-or-later',
    'SSPL-1.0',
    'OSL-2.1',
    'OSL-3.0',
    'CPAL-1.0',
    'EUPL-1.1',
    'EUPL-1.2',
    'CECILL-2.1',
    // LGPL is deliberately NOT in this list - it only imposes obligations on
    // modifying/statically linking the library, not on depending on it as-is.
].join(';')

function workspaceDirs(): string[] {
    const dirs: string[] = []
    for (const group of ['apps', 'packages']) {
        const groupPath = join(ROOT, group)
        if (!existsSync(groupPath)) continue
        for (const name of readdirSync(groupPath)) {
            const pkgDir = join(groupPath, name)
            if (existsSync(join(pkgDir, 'package.json'))) {
                dirs.push(pkgDir)
            }
        }
    }
    // No monorepo workspace packages: this is a single-package repo, so scan
    // the root package itself. Without this fallback the loop above would
    // scan nothing and the check would false-pass.
    if (dirs.length === 0) {
        dirs.push(ROOT)
    }
    return dirs
}

let failed = false

for (const dir of workspaceDirs()) {
    const relDir = dir === ROOT ? '.' : dir.slice(ROOT.length + 1)
    console.log(`\n> Checking licenses: ${relDir}`)
    const result = spawnSync(
        'bunx',
        ['license-checker', '--production', '--summary', '--failOn', FAIL_ON],
        {
            cwd: dir,
            stdio: 'inherit',
        },
    )
    if (result.status !== 0) {
        failed = true
    }
}

if (failed) {
    console.error(
        '\ncheck:licenses failed - a GPL-family (or similarly blocked) license was found.',
    )
    process.exit(1)
}

console.log(
    '\ncheck:licenses passed - no blocked licenses found in any workspace.',
)
