#!/usr/bin/env bun

/**
 * Local link checker — parses dist/ HTML and markdown for external links,
 * tests them against the live web, and reports failures.
 *
 * Policy: 404/410 = gone (dead), 401/403 = private/restricted (inaccessible),
 * DNS resolution failure = dns-failed. 405/429 and 5xx are treated as OK
 * (temporary/method). Redirects are not followed (SSRF guard). .lycheeignore
 * patterns are skipped. Private/internal addresses are blocked.
 */

import { lookup } from 'node:dns/promises'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const DIST_DIR = 'dist'
const MD_LINK_RE = /\[[^\]]*\]\((https?:\/\/[^)]+)\)/g
const HTML_HREF_RE = /<a\s[^>]*href="(https?:\/\/[^"]+)"/g
const IGNORE_RE: RegExp[] = loadIgnorePatterns()

const DEAD_STATUS = new Set([404, 410])
const INACCESSIBLE_STATUS = new Set([401, 403])

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
        const content = readFileSync('.linkcheckignore', 'utf8')
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
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) continue
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
            yield* walkDir(full)
        } else if (entry.name.endsWith('.html') || entry.name.endsWith('.md')) {
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

const PRIVATE_NETS = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i,
    /^0\.0\.0\.0$/,
]

function isPrivateIP(ip: string): boolean {
    return PRIVATE_NETS.some((re) => re.test(ip))
}

async function isInternalURL(url: string): Promise<boolean> {
    try {
        const { hostname } = new URL(url)
        if (hostname === 'localhost' || hostname.endsWith('.local')) {
            return true
        }
        if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
            return isPrivateIP(hostname)
        }
        const addresses = await lookup(hostname, { all: true })
        return addresses.some((a) => isPrivateIP(a.address))
    } catch {
        return false
    }
}

async function checkUrl(
    url: string,
): Promise<{ status: number | null; error: string | null }> {
    if (await isInternalURL(url)) {
        return { status: null, error: 'skipped: private/internal address' }
    }

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
                redirect: 'manual',
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

    const isDNSError = (error: string | null): boolean => {
        return error?.includes('ENOTFOUND') ?? false
    }

    const failures = results.filter((r) => {
        if (r.error?.includes('abort')) return false
        if (r.error?.includes('skipped:')) return false
        if (r.status === null) return isDNSError(r.error)
        return DEAD_STATUS.has(r.status) || INACCESSIBLE_STATUS.has(r.status)
    })

    const networkErrors = results.filter(
        (r) =>
            r.error !== null &&
            !r.error.includes('abort') &&
            !isDNSError(r.error) &&
            r.status === null,
    )

    // Group by URL so one dead link showing up on N pages lists once with N sources
    const failureMap = new Map<
        string,
        { status: number | null; label: string; sources: Set<string> }
    >()
    for (const f of failures) {
        let label: string
        if (isDNSError(f.error)) {
            label = 'dns-failed'
        } else if (DEAD_STATUS.has(f.status!)) {
            label = 'dead'
        } else {
            label = 'inaccessible'
        }
        const existing = failureMap.get(f.url)
        if (existing) {
            existing.sources.add(f.source)
        } else {
            failureMap.set(f.url, {
                status: f.status,
                label,
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
        ([url, { status, label, sources }]) => ({
            url,
            status,
            label,
            sourceCount: sources.size,
        }),
    )

    if (uniqueFailures.length > 0) {
        console.log(`\n${uniqueFailures.length} failed link(s) found:\n`)
        for (const f of uniqueFailures) {
            const code = f.status ?? 'DNS'
            console.log(
                `  [${code} ${f.label}] ${f.url} (${f.sourceCount} page${f.sourceCount === 1 ? '' : 's'})`,
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
