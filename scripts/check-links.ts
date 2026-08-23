#!/usr/bin/env bun
/**
 * Local link checker — parses dist/ HTML and markdown for external links,
 * tests them against the live web, and reports failures.
 *
 * Mirrors .lychee.toml policy: only 404/410 are "dead". 401/403/405/429 and
 * 5xx are treated as OK. .lycheeignore patterns are skipped.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const DIST_DIR = 'dist'
const MD_LINK_RE = /\[[^\]]*\]\((https?:\/\/[^)]+)\)/g
const HTML_HREF_RE = /href="(https?:\/\/[^"]+)"/g
const IGNORE_RE: RegExp[] = loadIgnorePatterns()

const ACCEPTED_STATUS = new Set([
    200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 299, 401, 403, 405, 429,
    500, 502, 503, 504,
])
const DEAD_STATUS = new Set([404, 410])

const CONCURRENCY = 16
const TIMEOUT_MS = 15_000
const MAX_RETRIES = 2

interface LinkResult {
    url: string
    source: string
    status: number | null
    error: string | null
}

function loadIgnorePatterns(): RegExp[] {
    try {
        const content = readFileSync('.lycheeignore', 'utf8')
        return content
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith('#'))
            .map((pattern) => {
                const cleaned = pattern.replace(/\s.*$/, '')
                try {
                    return new RegExp(cleaned)
                } catch {
                    return null
                }
            })
            .filter((r): r is RegExp => r !== null)
    } catch {
        return []
    }
}

function shouldIgnore(url: string): boolean {
    return IGNORE_RE.some((re) => re.test(url))
}

function* walkDir(dir: string): Generator<string> {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        const stat = statSync(full)
        if (stat.isDirectory()) {
            yield* walkDir(full)
        } else if (entry.endsWith('.html') || entry.endsWith('.md')) {
            yield full
        }
    }
}

function extractLinks(content: string, isMarkdown: boolean): string[] {
    const re = isMarkdown ? MD_LINK_RE : HTML_HREF_RE
    const links: string[] = []
    let match = re.exec(content)
    while (match !== null) {
        links.push(match[1])
        match = re.exec(content)
    }
    return links
}

function getExternalLinks(): Map<string, Set<string>> {
    const urls = new Map<string, Set<string>>()

    for (const file of walkDir(DIST_DIR)) {
        const content = readFileSync(file, 'utf8')
        const isMarkdown = file.endsWith('.md')
        const links = extractLinks(content, isMarkdown)

        for (const raw of links) {
            const url = raw.replace(/\\n$/, '').trim()
            if (!url.startsWith('http')) continue
            if (shouldIgnore(url)) continue

            const relPath = relative(process.cwd(), file)
            const existing = urls.get(url)
            if (!existing) {
                urls.set(url, new Set([relPath]))
            } else {
                existing.add(relPath)
            }
        }
    }

    return urls
}

async function checkUrl(
    url: string,
): Promise<{ status: number | null; error: string | null }> {
    let lastError: string | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

            const res = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (compatible; link-checker/1.0; +https://github.com/taraxvoid/queeromaha)',
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                },
                redirect: 'follow',
            })

            clearTimeout(timer)
            return { status: res.status, error: null }
        } catch (e) {
            lastError = e instanceof Error ? e.message : String(e)
            if (attempt < MAX_RETRIES) {
                await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
            }
        }
    }

    return { status: null, error: lastError }
}

async function checkAllLinks(
    urls: Map<string, Set<string>>,
): Promise<LinkResult[]> {
    const entries = [...urls.entries()]
    const results: LinkResult[] = []
    let completed = 0
    const total = entries.length

    async function worker() {
        while (entries.length > 0) {
            const entry = entries.shift()
            if (!entry) break
            const [url, sources] = entry
            const { status, error } = await checkUrl(url)
            for (const source of sources) {
                results.push({ url, source, status, error })
            }
            completed++
            process.stdout.write(`\r  Testing links: ${completed}/${total}`)
        }
    }

    const workers = Array.from({ length: CONCURRENCY }, () => worker())
    await Promise.all(workers)
    process.stdout.write('\n')

    return results
}

async function main() {
    console.log('Scanning dist/ for external links...\n')

    const links = getExternalLinks()
    if (links.size === 0) {
        console.log('  No external links found.')
        process.exit(0)
    }

    console.log(`  Found ${links.size} unique external links\n`)

    const results = await checkAllLinks(links)

    const failures = results.filter((r) => {
        if (r.error?.includes('abort')) return false
        if (r.status === null) return false
        return (
            DEAD_STATUS.has(r.status) ||
            (!ACCEPTED_STATUS.has(r.status) && r.status >= 400)
        )
    })

    const networkErrors = results.filter(
        (r) =>
            r.error !== null && !r.error.includes('abort') && r.status === null,
    )

    // Group by URL so one dead link showing up on N pages lists once with N sources
    const failureMap = new Map<
        string,
        { status: number; sources: Set<string> }
    >()
    for (const f of failures) {
        if (!f.status) continue
        const existing = failureMap.get(f.url)
        if (existing) {
            existing.sources.add(f.source)
        } else {
            failureMap.set(f.url, {
                status: f.status,
                sources: new Set([f.source]),
            })
        }
    }

    const errorMap = new Map<string, { error: string; sources: Set<string> }>()
    for (const f of networkErrors) {
        if (!f.error) continue
        const existing = errorMap.get(f.url)
        if (existing) {
            existing.sources.add(f.source)
        } else {
            errorMap.set(f.url, {
                error: f.error,
                sources: new Set([f.source]),
            })
        }
    }

    const uniqueFailures = [...failureMap.entries()].map(
        ([url, { status, sources }]) => ({
            url,
            status,
            sourceCount: sources.size,
        }),
    )

    if (uniqueFailures.length > 0) {
        console.log(`\n${uniqueFailures.length} dead link(s) found:\n`)
        for (const f of uniqueFailures) {
            console.log(
                `  [${f.status}] ${f.url} (${f.sourceCount} page${f.sourceCount === 1 ? '' : 's'})`,
            )
        }
    }

    if (errorMap.size > 0) {
        console.log(
            `\n${errorMap.size} link(s) could not be reached (skipped):\n`,
        )
        for (const [url, { error, sources }] of errorMap) {
            console.log(
                `  ${url} — ${error} (${sources.size} page${sources.size === 1 ? '' : 's'})`,
            )
        }
    }

    if (uniqueFailures.length === 0 && errorMap.size === 0) {
        console.log(`\nAll ${links.size} links passed.`)
    } else if (uniqueFailures.length === 0) {
        console.log(`\nNo dead links detected.`)
    }

    console.log(
        `\n  Tested: ${links.size} unique URLs | Dead: ${uniqueFailures.length} | Network errors: ${errorMap.size}`,
    )

    process.exit(uniqueFailures.length > 0 ? 1 : 0)
}

main()
