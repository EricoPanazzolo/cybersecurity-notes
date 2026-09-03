# Task: Build "Cybersecurity Personal Notes" — a Fumadocs-based recon/security tool reference

## Goal

Build a self-hosted documentation site that mirrors my personal Notion
"Tools" page (a recon/enumeration/web-security-testing reference) using
**Fumadocs** (https://www.fumadocs.dev) — a Next.js documentation framework
— not a hand-rolled static site. Use Fumadocs' actual templates, layouts,
and conventions throughout. Ship it with Docker.

---

## Phase 0 — Read the current Fumadocs docs first

Fumadocs is an actively evolving framework (APIs, config file conventions,
and even the Tailwind version it depends on change between versions). Before
writing any code:

1. Fetch and read these pages from https://www.fumadocs.dev/docs, in this order:
   - `/docs` (Quick Start — confirms current Next.js/Tailwind prerequisites)
   - `/docs/manual-installation/next` (exact setup steps, file names, imports)
   - `/docs/page-conventions` (`meta.json` syntax, folder/slug rules, separators)
   - `/docs/markdown` (Callout, Cards, code block syntax available in MDX)
   - `/docs/ui/theme` (built-in theme presets and how to import them)
   - `/docs/navigation` and `/docs/ui/layouts/docs` (sidebar/layout options)
   - `/docs/deploying` (Docker-specific notes — e.g. which config files must
     be present in the Docker build context for Fumadocs MDX to work)
2. Do not assume prior knowledge of exact package names, file paths, or
   config syntax is still accurate — confirm against what you just fetched.
   If anything below conflicts with what the current docs say, follow the
   current docs.

---

## Phase 1 — Gather the source content

1. Search my Notion workspace for a page titled **"Tools"** (it's nested
   under a "Cybersecurity" workspace/database).
2. Fetch that page and **every child page it links to** (it will link out
   to ~20 sub-pages — individual tools and technique write-ups). Read each
   one in full: don't skip any, and don't summarize/paraphrase technical
   content (commands, flags, payloads) — preserve exact syntax.
3. For each page, extract:
   - Tool/technique name
   - One-line summary
   - Every command block, with an explanation of what it does
   - Every flag/argument table
   - Any caveats, warnings, or "notes" callouts
   - Any links to official documentation, GitHub repos, or external tools

---

## Phase 2 — Analyze and regroup (don't just copy the Notion structure)

The Notion page's own grouping mixes two fundamentally different kinds of
content. Separate them explicitly:

- **Single-tool references** — pages that document one tool's flags/usage
  (e.g. Nmap, Amass, FFUF, Nuclei).
- **Playbooks / workflows** — pages that chain multiple *separate* CLI
  tools together into one recipe (e.g. piping Chaos → HTTPX → Naabu → Nmap,
  or mirroring a site with HTTrack then scanning it with TruffleHog). These
  are not a tool's manual — group them into their own **"Playbooks &
  Workflows"** section so a multi-tool recipe is never mistaken for a
  single tool's reference.

When I ran this analysis, it produced this structure (reproduce it unless
the current Notion content has materially changed — in which case, apply
the same single-tool-vs-playbook logic to whatever you find):

| Category | Contents |
| --- | --- |
| Wordlists & Resources | SecLists, Alterx |
| Subdomain & Attack Surface Discovery | Subdomain enumeration overview, Amass, BBOT |
| Port & Service Scanning | Nmap |
| Web Content & Directory Fuzzing | Gobuster, Dirsearch, FFUF |
| Cloud & Identity Enumeration | Azure AD / Entra ID tenant enumeration, Bucket enumeration, Firebase enumeration |
| Web Application Vulnerabilities | Nuclei, CORS (Corsy), Code injection probe, LFI |
| Network & Certificate Intelligence | Certificates / WHOIS / IP / domain intel (Censys, SSL Labs, whois) |
| Playbooks & Workflows | Fuzzing & scanning pipeline (Chaos→HTTPX→Naabu→Nmap), Subdirectory enumeration (Gobuster+FFUF decision guide), CORS mass hunting, HTTrack+TruffleHog, Archived/404 file discovery (Wayback+uro) |

Flag explicitly (in a Callout on the relevant pages) any page whose content
nearly duplicates another page's commands — treat it as a decision guide
pointing at the canonical tool pages rather than re-documenting the same
flags twice.

---

## Phase 3 — Scaffold the Fumadocs project

Using whatever the current manual-installation guide says, but at minimum:

1. `create-next-app` (or manual `package.json`) for a **Next.js App Router**
   project, on the Next.js + Tailwind CSS major versions Fumadocs currently
   requires.
2. Install `fumadocs-ui`, `fumadocs-core`, `fumadocs-mdx`, `@types/mdx`.
3. Set up the content source (`lib/source.ts` or `source.config.ts`,
   whichever the current docs specify) pointed at `content/docs`.
4. Wrap the app in Fumadocs' `RootProvider`; wire up Tailwind v4 with a
   Fumadocs theme import (pick a dark, technical-feeling built-in theme —
   e.g. `emerald` or `ocean` — and confirm it's still in the current theme
   list before using it).
5. Build the required routes: a `(home)` route group with a simple landing
   page, `app/docs/layout.tsx` (sidebar layout from the page tree),
   `app/docs/[[...slug]]/page.tsx` (catch-all MDX renderer with
   `generateStaticParams`/`generateMetadata`), and `app/api/search/route.ts`
   (Fumadocs' built-in search endpoint).
6. Create `mdx-components.tsx` registering the default Fumadocs MDX
   components (`Callout`, `Cards`, code blocks, etc.) globally so individual
   `.mdx` files don't need per-file imports.

---

## Phase 4 — Write the content

1. One `.mdx` file per tool/technique, organized into folders matching the
   categories from Phase 2, each with frontmatter (`title`, `description`
   at minimum).
2. A `meta.json` per folder controlling display title and page order (only
   pages listed in `meta.json` appear in the sidebar — don't forget any).
3. A root `content/docs/meta.json` ordering the categories, using section
   separators (check current syntax — likely `"---Label---"`) to visually
   group e.g. "Reconnaissance" categories vs "Workflows".
4. A `content/docs/index.mdx` landing/overview page for `/docs` that links
   out to each category (use `<Cards>`/`<Card>` if that's still the current
   component for this) and states the scope/authorization disclaimer.
5. Within each tool page: exact commands in fenced code blocks (language
   hinted, e.g. `bash`, `json`), flag references as Markdown tables, and
   `<Callout type="warn">` (or whatever severity levels the current docs
   define) for anything risky, noisy, or requiring authorization. Use
   `<Cards>` for links to official documentation/GitHub repos — never
   fabricate a URL; only link to sources actually referenced in the source
   material.
6. On every Playbook page, add a `<Callout type="info" title="Playbook">`
   at the top explicitly stating it chains multiple tools and linking to
   each tool's canonical page.
7. Cross-link related pages with relative Markdown links and verify every
   internal link resolves to a real page before finishing.

---

## Phase 5 — Dockerize

1. Add `output: 'standalone'` to the Next.js config.
2. Write a multi-stage `Dockerfile` (deps → builder → runner pattern) that
   produces a minimal production image running `node server.js`, not `next
   dev`. Confirm from the current Fumadocs deploying docs whether any extra
   config files (e.g. a Fumadocs MDX config file) need to be explicitly
   copied into the Docker build context — Fumadocs MDX has needed this in
   the past.
3. Write a `docker-compose.yml` that builds the image and exposes it on
   port 3000.
4. Add a `.dockerignore` excluding `node_modules`, `.next`, `.git`, and the
   Fumadocs MDX build cache directory.

---

## Phase 6 — Validate before calling it done

Since you (Claude Code) have real npm/network access, actually run these —
don't just write the files and assume they work:

1. `npm install` — resolve and fix any dependency/version issues.
2. `npm run dev` — confirm the app boots, the sidebar renders all
   categories, and search works. Fix any build/runtime errors.
3. `npm run build` — confirm a production build succeeds (this will catch
   MDX/frontmatter errors that dev mode sometimes tolerates).
4. `docker compose up --build` — confirm the containerized build boots and
   serves the site on port 3000.
5. Spot-check a handful of pages in the browser (or via `curl`) — especially
   the longest one (whichever page has the most commands/tables) — to make
   sure nothing overflows or fails to render.

---

## Deliverables

- A working Next.js + Fumadocs project in the current directory, runnable
  via both `npm run dev` and `docker compose up --build`.
- A `README.md` documenting: how to run it (both ways), the project
  structure, the category/playbook reasoning from Phase 2, and how to add a
  new tool page later.
- Nothing left broken: no dead internal links, no `meta.json` referencing a
  file that doesn't exist (or vice versa), no failing build.

## Constraints

- This documents tools for **authorized** security testing only — make sure
  that disclaimer is visible on the docs landing page, not buried.
- Never invent a command, flag, or documentation link that wasn't in the
  source Notion content — if something is genuinely missing or unclear,
  leave a note rather than fabricating detail.
