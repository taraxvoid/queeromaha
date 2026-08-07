export async function GET() {
    const body = `
  # As a condition of accessing this website, you agree to

# abide by the following content signals:

 

# (a)  If a content-signal = yes, you may collect content

# for the corresponding use.

# (b)  If a content-signal = no, you may not collect content

# for the corresponding use.

# (c)  If the website operator does not include a content

# signal for a corresponding use, the website operator

# neither grants nor restricts permission via content signal

# with respect to the corresponding use.

 

# The content signals and their meanings are:

 

# search: building a search index and providing search

# results (e.g., returning hyperlinks and short excerpts

# from your website's contents).  Search does not include

# providing AI-generated search summaries.

# ai-input: inputting content into one or more AI models

# (e.g., retrieval augmented generation, grounding, or other

# real-time taking of content for generative AI search

# answers).

# ai-train: training or fine-tuning AI models.

 

# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS

# RESERVATIONS OF RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN

# UNION DIRECTIVE 2019/790 ON COPYRIGHT AND RELATED RIGHTS

# IN THE DIGITAL SINGLE MARKET.

User-agent: *
Content-Signal: ai-train=no, search=yes, ai-input=yes
# Active directive per https://contentsignals.org/ (Cloudflare's
# Content Signals). Access (Allow/Disallow) and use-permissions
# (Content-Signal) are independent: these rules grant crawling but
# reserve training rights via Disallow below + the ai-train=no signal.
Allow: /

# AI *training* crawlers below are disallowed to actually enforce
# ai-train=no (these bots honor robots.txt). This does not affect
# Search: Google Search uses Googlebot, not Google-Extended.
User-agent: GPTBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Claude-Web
Disallow: /

User-agent: Anthropic-AI
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Bytespider
Disallow: /

# *Use / search* crawlers: allowed (search=yes, ai-input=yes).
User-agent: PerplexityBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: DuckAssistBot
Allow: /

Sitemap: https://queeromaha.net/sitemap-index.xml
`
    return new Response(body, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
