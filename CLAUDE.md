# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

"Cybersecurity Personal Notes" — a self-hosted Fumadocs (on Next.js 16 / React 19) documentation
site that catalogs recon, enumeration, and web-application security-testing
tools and playbooks. All content is authorized-testing reference material,
organized into `content/docs/`.

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
  and exposes it as `source`. Extends the default `pageSchema` (from
  `fumadocs-core/source/schema`) with optional `wstg`/`wstgTitle`
  frontmatter fields (see "OWASP WSTG codes" below).
- `app/docs/[[...slug]]/page.tsx` — the single catch-all route that renders
  every doc page via `source.getPage()` + `generateStaticParams()`. Also
  wraps each page's MDX body in `CommandChannelProvider` (see item 6 below),
  and renders a `<WstgBadge>` under the title when `page.data.wstg` is set.
- `app/docs/layout.tsx` — the docs sidebar layout, built from `source`'s page
  tree.
- `components/mdx.tsx` — registers MDX components (`Callout`, `Card`,
  `Cards`, `CommandInput`, `ReverseShellGenerator`, `GoogleDorks`, plus
  Fumadocs' defaults) globally for all `.mdx` files via
  `getMDXComponents()`. `WstgBadge` (`components/wstg-badge.tsx`) is
  frontmatter-driven and rendered directly in `page.tsx` instead, so it is
  *not* in this list — content authors never call it from MDX.

`lib/layout.shared.tsx` holds nav config (site title, top-level links —
including an external link to the OWASP WSTG itself) shared between the
home layout and the docs layout.

### Content structure and sidebar ordering

Each `content/docs/<category>/` folder needs its own `meta.json` listing
page filenames (without `.mdx`) in sidebar order — a page not listed there
won't appear in the sidebar even if the `.mdx` file exists. The root
`content/docs/meta.json` orders the category folders themselves and can
insert separator labels (e.g. `"---OWASP WSTG Reference---"`). A category
can nest subfolders (each with its own `meta.json`) to group related pages
under a collapsible sidebar heading instead of listing everything flat —
used throughout `wstg-information-gathering/` (see taxonomy table below).

### Category taxonomy — read before adding a page

The taxonomy is built around the
[OWASP Web Security Testing Guide](https://wstg.owasp.org/latest/) (WSTG):
every category that corresponds to a WSTG chapter is named `wstg-<chapter>/`
on disk (e.g. `wstg-information-gathering/`), but its `meta.json` `title` is
a plain, code-free name (e.g. `"Information Gathering"`, not `"Information
Gathering (WSTG-INFO)"`) — the sidebar stays free of WSTG jargon, and the
chapter code only surfaces on the individual pages themselves via the
`WstgBadge` (see "OWASP WSTG codes" below). Only WSTG chapters
this reference actually has tool content for get a folder — do **not**
create an empty/placeholder folder for a WSTG chapter with nothing in it
yet (currently missing: Authentication, Authorization, Error Handling,
Business Logic, WebAssembly). A handful of categories fall
outside WSTG's testing methodology entirely (exploitation, cross-cutting
resources, multi-chapter playbooks) and are deliberately kept as separate,
non-`wstg-`-prefixed folders instead of forced into a chapter:

| Category | Contents |
| --- | --- |
| Information Gathering — `wstg-information-gathering/` (**WSTG-INFO**) | `overview`; subfolder `attack-surface-discovery/`: Amass, BBOT, Gobuster (DNS mode), FFUF (subdomain mode), Google Dorking; subfolder `content-discovery/`: Gobuster (dir mode), Dirsearch, FFUF (dir mode); subfolder `fingerprinting/`: Nmap; subfolder `network-intel/`: Whois, IP, Domains |
| Configuration & Deployment Management — `wstg-configuration-management/` (**WSTG-CONF**) | subfolder `cloud-storage/`: Bucket enumeration, Firebase enumeration; Cloudflare; Nuclei (general misconfig/CVE scanner — spans multiple WSTG chapters, filed here) |
| Identity Management — `wstg-identity-management/` (**WSTG-IDNT**) | Azure AD / Entra ID tenant enumeration |
| Session Management — `wstg-session-management/` (**WSTG-SESS**) | Session Fixation |
| Cryptography — `wstg-cryptography/` (**WSTG-CRYP**) | Cipher Suites, Certificates |
| Input Validation — `wstg-input-validation/` (**WSTG-INPV**) | Code injection probe, LFI |
| Client-side Testing — `wstg-client-side/` (**WSTG-CLNT**) | CORS (Corsy) |
| API Testing — `wstg-api-testing/` (**WSTG-APIT**) | Swagger/OpenAPI discovery, Kiterunner, Arjun, GraphQL introspection |
| Wordlists & Resources (`content/docs/wordlists-resources/`) | SecLists, Alterx |
| Reverse Shells & Payloads (`content/docs/reverse-shells/`) | Reverse shell one-liner generator |
| Playbooks & Workflows (`content/docs/playbooks/`) | Fuzzing & scanning pipeline (Chaos→HTTPX→Naabu→Nmap), Nmap→HTML report (nmap2html), CORS mass hunting, HTTrack+TruffleHog, Wayback+uro archived-file discovery, Git exposure discovery & extraction (curl→FFUF→git→HTTPX→git-dumper) |
| AI Prompts (`content/docs/ai-prompts/`) | Prompt techniques for using AI coding assistants in security work |

A playbook whose commands would substantially duplicate an existing tool
page (e.g. a decision guide that mostly re-runs Gobuster/FFUF/Corsy commands
already documented elsewhere) should point back to the canonical tool page
rather than re-documenting the same flags twice — and if it would have
nothing left but such pointers, remove it instead of keeping it as a stub
(this happened to a "Subdirectory Enumeration" decision guide once its
Gobuster/FFUF content moved to their own pages). Every playbook page opens
with a `<Callout type="info" title="Playbook">` naming the tools it chains,
linking to each one's page, and noting which WSTG chapter(s) it relates to
in plain text (e.g. "Relates to **WSTG-CLNT-07**") — playbooks span more
than one chapter, so they use a text mention rather than the `WstgBadge`
component, which is reserved for single-chapter tool pages.

### OWASP WSTG codes

A tool page filed under a `wstg-*/` category should carry `wstg` (e.g.
`"WSTG-INFO-04"`) and `wstgTitle` (e.g. `"Attack Surface Identification"`)
frontmatter fields, matching the exact chapter/test-case names from
https://wstg.owasp.org/latest/. `page.tsx` renders these as a colored
`<WstgBadge>` pill (`components/wstg-badge.tsx`, colored by chapter prefix)
linking back to that chapter on the WSTG site — content authors set the
frontmatter fields only, never call the component directly. A page whose
scope doesn't map to one specific test case (e.g. Nuclei) can still use a
chapter-level code with no numeric suffix (`"WSTG-CONF"`) plus a
descriptive `wstgTitle`. Pages outside the `wstg-*/` categories omit both
fields.

If source material is missing (an unrecoverable embedded bookmark, a tool
mentioned but never given its own page) or wrong (a typo'd flag, an
incorrect CLI option), say so explicitly in a callout — never invent a
command, flag, or link that wasn't in the source.

### Adding a new tool or playbook page

1. Pick (or create) a category folder under `content/docs/` — a `wstg-*/`
   one (nesting a subfolder if it groups with existing related pages) if
   the page matches a WSTG chapter this site already covers, otherwise one
   of the non-WSTG categories (see taxonomy table above). Don't create a
   new `wstg-*/` folder for a chapter with no other content yet.
2. Add `<slug>.mdx` with frontmatter: `title`, `description`, and — for a
   `wstg-*/` page — `wstg`/`wstgTitle` (see "OWASP WSTG codes" above).
3. Add the filename (without `.mdx`) to that folder's `meta.json` `pages`
   array.
4. Use `<Callout type="info" | "warn" | "error" | "success" | "idea">` and
   `<Cards>` / `<Card title="..." href="...">`. Only link to sources you've
   actually verified — never fabricate a URL.
5. For a copy-run command that needs a target-specific value (domain,
   target URL, email, client ID, ...), use `<CommandInput vars={{ name:
   "default" }} command={\`... {{name}} ...\`} placeholderMode />`
   (`components/command-input.tsx`, registered in `components/mdx.tsx`)
   instead of a plain fenced code block — it renders one input per
   `{{name}}` placeholder and re-highlights the command live via
   Fumadocs' `DynamicCodeBlock`. Placeholder names must match `\w+` (no
   hyphens). Don't use it for illustrative/non-runnable examples or
   compact snippets inside a table. Always pass `placeholderMode` (site
   convention as of the Nmap-page rollout): fields start empty, showing
   their default as grey placeholder text, and the command shows a
   `<name>` token (`<input-file>`/`<output-file>` for those two roles,
   bare `<name>` otherwise — see `placeholderToken()`) for any field not
   yet filled in, instead of silently substituting the default. Filling
   in every field (or clicking **Apply**, which commits the current
   value of every field — typed or still-default — into the command,
   including derived fields never directly touched) switches the
   command to the fully-substituted live version; **Reset** clears back
   to the empty/placeholder state. Both buttons carry a themed
   `<Tooltip>` (`components/tooltip.tsx`) explaining what they do —
   don't use the native `title` attribute for this, it looks out of
   place next to the rest of the design.
6. By default there is no shared/pinned page-level state — every
   `<CommandInput>` is self-contained. When several command blocks on one
   page logically use the same value (e.g. `target` across three commands,
   or one playbook step's output file feeding the next step's input), give
   each block its own `vars`/`derivedVars` entry for it, with the same
   default text, even though that repeats the field across blocks. The
   reader fills in each block independently — there is deliberately no
   auto-sync between blocks *unless* a channel link (below) is used.

   For the narrower case where one block's `output` must live-update a
   *different* block's `input` as the reader types (not just share the same
   default text), opt in to a cross-block channel instead: give the
   producing block `publishChannel="some-name"` and give the consuming
   block `derivedVars={{ input: { channel: "some-name" } }}` (in place of
   the usual `{ from, template }` shape) — no `vars` entry for `target` is
   needed on the consumer if its command template never references
   `{{target}}`, but keep a plain `vars={{ input: "toolname_target.com" }}`
   default so the field still shows something sensible before the producer
   block has published. This is powered by `CommandChannelProvider`
   (`components/command-input.tsx`), which `app/docs/[[...slug]]/page.tsx`
   wraps around every page's MDX body — content authors never add the
   provider themselves, just the `publishChannel`/`channel` props. Reach
   for this only when the reader genuinely needs the two fields to track
   each other live (e.g. they may type a custom output filename); the
   default independent-blocks-with-a-note pattern (item 8) remains correct
   for the common case.
7. For a command that saves output to a file, add a `derivedVars` field
   instead of hardcoding the output file — it tracks another field's live
   value (via `lib/sanitize-filename.ts`, which strips URL schemes/paths)
   until the reader edits the derived field directly:
   `derivedVars={{ output: { from: "domain", template: "toolname_{value}.ext" } }}`.
   Naming convention: `<toolname>_{value}.<ext>`, or
   `<toolname>-<mode>_{value}.<ext>` for a page covering more than one
   mode/technique. Use `{stem}` instead of `{value}` to drop the source
   value's extension (e.g. `{stem}.html` turns `input` `scan.xml` into
   `scan.html`); a derived var can derive from another derived var if it's
   listed after it in `derivedVars`.
8. Field names signal role, not tool: a block's own generated file is
   always `output`; a file it reads in (typically a prior playbook step's
   `output`) is always `input` — never reuse `output` to mean "the file
   this block reads," and never name either field after the producing
   tool (no `chaos_output`, `naabu_output`, etc.). `lib/field-order.ts`
   orders fields as target-like field, then `input`, then `output`, then
   anything else, so this convention also keeps field order predictable.
   In a multi-step playbook, a step that consumes a prior step's output
   re-declares `input` locally (deriving it from its own `target`/`domain`
   field again, with the same template the previous step used for its
   `output`) so the default matches what that step produced — and add a
   one-line note above the block ("`input` defaults to Step N's `output`
   file — edit both if you change either away from the default.") so the
   reader notices the link between the two fields. If the two fields should
   instead track each other live as the reader types, use a channel link
   (item 6) and adjust the note accordingly (e.g. "`input` tracks this
   step's own `output` field above live — edit it directly here to break
   the link.").
9. Playbooks go under `content/docs/playbooks/` with the `<Callout
   type="info" title="Playbook">` intro described above.
10. Run `npm run build` before committing.

### Theme

Fumadocs' built-in `catppuccin` preset (`fumadocs-ui/css/catppuccin.css`),
imported in `app/globals.css` alongside Tailwind CSS v4 and
`fumadocs-ui/css/preset.css`.
