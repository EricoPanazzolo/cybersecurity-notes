# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

"The Toolbox" — a self-hosted Fumadocs (on Next.js 16 / React 19) documentation
site that catalogs recon, enumeration, and web-application security-testing
tools and playbooks. All content is authorized-testing reference material
sourced from a personal Notion export, reorganized into `content/docs/`.

## Commands

```bash
npm run dev      # http://localhost:3000
npm run build    # required before committing — catches MDX syntax errors dev tolerates
npm run start    # serve a production build
npm run lint     # eslint
```

Node.js ≥ 22 is required (Fumadocs' current minimum). There is no test suite.

Docker: `docker compose up --build` runs the three-stage (`deps` → `builder` →
`runner`) Dockerfile, which builds with `output: 'standalone'` and runs
`node server.js` — no `next dev`/`next start` in the final image.

## Architecture

This is a docs-content repository more than an app: almost all future work is
adding/editing MDX under `content/docs/`, not touching the four files that
wire Fumadocs to Next.js's App Router:

- `lib/source.ts` — defines the Fumadocs MDX content source (`content/docs`)
  and exposes it as `source`.
- `app/docs/[[...slug]]/page.tsx` — the single catch-all route that renders
  every doc page via `source.getPage()` + `generateStaticParams()`.
- `app/docs/layout.tsx` — the docs sidebar layout, built from `source`'s page
  tree.
- `components/mdx.tsx` — registers MDX components (`Callout`, `Card`,
  `Cards`, plus Fumadocs' defaults) globally for all `.mdx` files via
  `getMDXComponents()`.

`lib/layout.shared.tsx` holds nav config (site title, top-level links) shared
between the home layout and the docs layout.

### Content structure and sidebar ordering

Each `content/docs/<category>/` folder needs its own `meta.json` listing
page filenames (without `.mdx`) in sidebar order — a page not listed there
won't appear in the sidebar even if the `.mdx` file exists. The root
`content/docs/meta.json` orders the category folders themselves and can
insert separator labels (e.g. `"---Reconnaissance---"`).

### Category taxonomy — read before adding a page

The source Notion content mixed single-tool manuals with playbooks (recipes
chaining several *separate* CLI tools, each step's output feeding the next).
These are deliberately kept in separate categories so a playbook is never
mistaken for one tool's reference:

| Category | Contents |
| --- | --- |
| Wordlists & Resources | SecLists, Alterx |
| Subdomain & Attack Surface Discovery | Overview, Amass, BBOT, Gobuster (DNS mode) |
| Port & Service Scanning | Nmap |
| Web Content & Directory Fuzzing | Gobuster (dir mode), Dirsearch, FFUF |
| Cloud & Identity Enumeration | Azure AD / Entra ID enumeration, Bucket enumeration, Firebase enumeration |
| Web Application Vulnerabilities | Nuclei, CORS (Corsy), Code injection probe, LFI |
| Network & Certificate Intelligence | Cipher Suites, Certificates, Whois, IP, Domains |
| Playbooks & Workflows (`content/docs/playbooks/`) | Fuzzing & scanning pipeline (Chaos→HTTPX→Naabu→Nmap), Subdirectory enumeration decision guide, CORS mass hunting, HTTrack+TruffleHog, Wayback+uro archived-file discovery |
| AI Prompts (`content/docs/ai-prompts/`) | Prompt techniques for using AI coding assistants in security work |

A playbook whose commands substantially duplicate an existing tool page
(e.g. a decision guide that mostly re-runs Gobuster/FFUF/Corsy commands
already documented elsewhere) should carry an explicit `<Callout>` flagging
it as a decision guide and linking back to the canonical tool page, rather
than re-documenting the same flags twice. Every playbook page opens with a
`<Callout type="info" title="Playbook">` naming the tools it chains and
linking to each one's page.

If source material is missing (an unrecoverable embedded bookmark, a tool
mentioned but never given its own page) or wrong (a typo'd flag, an
incorrect CLI option), say so explicitly in a callout — never invent a
command, flag, or link that wasn't in the source.

### Adding a new tool or playbook page

1. Pick (or create) a category folder under `content/docs/`.
2. Add `<slug>.mdx` with frontmatter: `title` and `description`.
3. Add the filename (without `.mdx`) to that folder's `meta.json` `pages`
   array.
4. Use `<Callout type="info" | "warn" | "error" | "success" | "idea">` and
   `<Cards>` / `<Card title="..." href="...">`. Only link to sources you've
   actually verified — never fabricate a URL.
5. For a copy-run command that needs a target-specific value (domain,
   target URL, email, client ID, ...), use `<CommandInput vars={{ name:
   "default" }} command={\`... {{name}} ...\`} />` (`components/command-input.tsx`,
   registered in `components/mdx.tsx`) instead of a plain fenced code block —
   it renders one input per `{{name}}` placeholder and re-highlights the
   command live via Fumadocs' `DynamicCodeBlock`. Placeholder names must
   match `\w+` (no hyphens). Don't use it for illustrative/non-runnable
   examples or compact snippets inside a table.
6. Playbooks go under `content/docs/playbooks/` with the `<Callout
   type="info" title="Playbook">` intro described above.
7. Run `npm run build` before committing.

### Theme

Fumadocs' built-in `catppuccin` preset (`fumadocs-ui/css/catppuccin.css`),
imported in `app/globals.css` alongside Tailwind CSS v4 and
`fumadocs-ui/css/preset.css`.
