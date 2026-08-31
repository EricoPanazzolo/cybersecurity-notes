# The Toolbox

A self-hosted documentation site — built with [Fumadocs](https://www.fumadocs.dev)
on Next.js — that catalogs recon, enumeration, and web-application
security-testing tools and playbooks. Sourced from a personal Notion
reference and reorganized so single-tool manuals and multi-tool recipes
never get mixed together.

> **Authorized testing only.** Everything documented here is for use against
> systems and scopes you're authorized to test.

## Running it

### With npm

Requires Node.js ≥ 22 (Fumadocs' current minimum).

```bash
npm install
npm run dev      # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

### With Docker

```bash
docker compose up --build
```

Serves the site at [http://localhost:3000](http://localhost:3000). The
`Dockerfile` is a three-stage build (`deps` → `builder` → `runner`) that
produces a minimal image running `node server.js` via Next.js's
`output: 'standalone'` mode — no `next dev`/`next start` in the final image.

## Project structure

```
app/
  (home)/page.tsx          Landing page (HomeLayout)
  layout.tsx                Root layout, wraps everything in <RootProvider>
  docs/
    layout.tsx               Docs sidebar layout (DocsLayout + page tree)
    [[...slug]]/page.tsx      Catch-all MDX renderer for every doc page
  api/search/route.ts        Fumadocs' built-in search endpoint

lib/
  source.ts                  Fumadocs MDX content source (content/docs)
  layout.shared.tsx           Shared nav config for home + docs layouts

components/
  mdx.tsx                     Registers Callout/Cards/etc. globally for MDX

content/docs/
  meta.json                   Root sidebar order + section separators
  index.mdx                   /docs landing page
  <category>/
    meta.json                 Page order + folder title for that category
    *.mdx                     One file per tool/technique/playbook
```

## Category structure & reasoning

The source Notion page mixed two fundamentally different kinds of content:
single-tool manuals (one tool's flags and usage) and playbooks (recipes that
chain several *separate* CLI tools into one pipeline, each step's output
feeding the next). Mixing them made it easy to mistake a multi-tool recipe
for a single tool's reference, so they're split into dedicated sections:

| Category | Contents |
| --- | --- |
| Wordlists & Resources | SecLists, Alterx |
| Subdomain & Attack Surface Discovery | Overview, Amass, BBOT, Gobuster (DNS mode) |
| Port & Service Scanning | Nmap |
| Web Content & Directory Fuzzing | Gobuster (dir mode), Dirsearch, FFUF |
| Cloud & Identity Enumeration | Azure AD / Entra ID enumeration, Bucket enumeration, Firebase enumeration |
| Web Application Vulnerabilities | Nuclei, CORS (Corsy), Code injection probe, LFI |
| Network & Certificate Intelligence | Cipher Suites, Certificates, Whois, IP, Domains |
| **Playbooks & Workflows** | Fuzzing & scanning pipeline (Chaos→HTTPX→Naabu→Nmap), Subdirectory enumeration decision guide, CORS mass hunting, HTTrack+TruffleHog, Wayback+uro archived-file discovery |
| **AI Prompts** | Prompt techniques for using AI coding assistants in security work (e.g. auditing vibe-coded apps) |

Pages whose commands substantially duplicate another page's (e.g. the
Subdirectory Enumeration and CORS mass-hunting playbooks, which mostly
re-run Gobuster/FFUF/Corsy commands already documented on their own pages)
carry an explicit `<Callout>` flagging them as decision guides and linking
back to the canonical tool page, instead of re-documenting the same flags
twice. Every playbook page also opens with a `<Callout type="info"
title="Playbook">` naming the tools it chains and linking to each one's
page.

Where the original Notion content was missing (an unrecoverable embedded
bookmark, a tool mentioned but never given its own page, e.g. Subfinder) or
contained an error (a typo'd flag, a wrong CLI option), the MDX page says so
explicitly in a callout rather than inventing a command, flag, or link that
wasn't in the source material.

## Adding a new tool or playbook page

1. Pick (or create) a category folder under `content/docs/`.
2. Add `<slug>.mdx` with frontmatter:
   ```mdx
   ---
   title: Tool Name
   description: One-line summary.
   ---
   ```
3. Add the new filename (without `.mdx`) to that folder's `meta.json`
   `pages` array — pages not listed there won't appear in the sidebar.
4. Use `<Callout type="info" | "warn" | "error" | "success" | "idea">` for
   caveats/warnings, and `<Cards>` / `<Card title="..." href="...">` for
   links to official docs or repos. Only link to sources you've actually
   verified — never fabricate a URL.
5. For a command that needs a target-specific value (a domain, target URL,
   email, client ID, etc.), use `<CommandInput>` instead of a plain fenced
   code block — it renders an editable field per `{{placeholder}}` in the
   command and re-renders the highlighted command live as the reader types,
   so they can copy a ready-to-run command instead of hand-editing it:
   ```mdx
   <CommandInput
     vars={{ domain: "domain.com" }}
     command={`gobuster dir -u https://{{domain}} -w wordlist.txt`}
   />
   ```
   Placeholder names must match `\w+` (letters/digits/underscore — no
   hyphens). Reserve it for commands meant to be copy-run as-is; skip it for
   illustrative/non-runnable examples (e.g. a URL pattern shown to explain a
   vulnerability) and for compact inline snippets inside a table.
6. If it's a playbook (chains multiple separate tools), put it under
   `content/docs/playbooks/` and open with a
   `<Callout type="info" title="Playbook">` linking to each tool's page.
7. Run `npm run build` before committing — it will fail on MDX syntax errors
   the dev server sometimes tolerates.

## Theme

Uses Fumadocs' built-in `catppuccin` preset (`fumadocs-ui/css/catppuccin.css`)
— imported in `app/globals.css` alongside Tailwind CSS v4 and the shared
`fumadocs-ui/css/preset.css`.
