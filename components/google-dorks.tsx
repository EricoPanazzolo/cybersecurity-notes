"use client";

import { useId, useState } from "react";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";

interface Dork {
  /** Query template, with the target domain written as `{{domain}}`. */
  query: string;
  purpose: string;
}

interface Category {
  name: string;
  dorks: Dork[];
}

const DEFAULT_DOMAIN = "domain.com";

const CATEGORIES: Category[] = [
  {
    name: "General Footprinting",
    dorks: [
      { query: `site:{{domain}}`, purpose: "List all indexed pages on the domain" },
      { query: `site:{{domain}} -www`, purpose: "Exclude www results to focus on other paths" },
      { query: `site:{{domain}} inurl:admin`, purpose: "Find admin panel pages" },
      { query: `site:{{domain}} inurl:login`, purpose: "Find login pages" },
      { query: `site:{{domain}} intitle:"index of"`, purpose: "Find open directory listings" },
    ],
  },
  {
    name: "Exposed Files",
    dorks: [
      { query: `site:{{domain}} filetype:env`, purpose: "Look for leaked environment files" },
      { query: `site:{{domain}} filetype:log`, purpose: "Look for leaked log files" },
      { query: `site:{{domain}} filetype:sql`, purpose: "Look for leaked database dumps" },
      { query: `site:{{domain}} filetype:bak`, purpose: "Look for leaked backup files" },
      { query: `site:{{domain}} filetype:json`, purpose: "Look for leaked JSON config/data files" },
      { query: `site:{{domain}} filetype:xml`, purpose: "Look for leaked XML config/data files" },
      { query: `site:{{domain}} filetype:config`, purpose: "Look for leaked configuration files" },
      { query: `site:{{domain}} filetype:yml OR filetype:yaml`, purpose: "Look for leaked YAML config files" },
      { query: `site:{{domain}} "index of /" "parent directory"`, purpose: "Find open directory listings with parent links" },
    ],
  },
  {
    name: "Config/Source Leakage",
    dorks: [
      { query: `site:{{domain}} inurl:.git`, purpose: "Find exposed .git directories" },
      { query: `site:{{domain}} inurl:.svn`, purpose: "Find exposed .svn directories" },
      { query: `site:{{domain}} inurl:wp-config`, purpose: "Find exposed WordPress config files" },
      { query: `site:{{domain}} ext:php intitle:phpinfo "PHP Version"`, purpose: "Find exposed phpinfo() pages" },
      { query: `site:{{domain}} inurl:swagger OR inurl:api-docs`, purpose: "Find exposed API documentation" },
    ],
  },
  {
    name: "Error Messages",
    dorks: [
      { query: `site:{{domain}} "SQL syntax" OR "mysql_fetch" OR "ORA-01756"`, purpose: "Find pages leaking SQL error messages" },
      { query: `site:{{domain}} "Warning:" "on line"`, purpose: "Find pages leaking PHP warnings/paths" },
      { query: `site:{{domain}} "stack trace"`, purpose: "Find pages leaking application stack traces" },
    ],
  },
  {
    name: "Parameters",
    dorks: [
      { query: `site:{{domain}} inurl:? intext:"select"`, purpose: "Find pages with query params near SQL-like text" },
      { query: `site:{{domain}} inurl:id=`, purpose: "Find pages with id parameter (possible IDOR/SQLi test point)" },
      { query: `site:{{domain}} inurl:.php?`, purpose: "Find PHP pages with query parameters" },
    ],
  },
  {
    name: "Docs & Credentials",
    dorks: [
      { query: `site:{{domain}} filetype:pdf OR filetype:doc OR filetype:docx`, purpose: "Find indexed documents" },
      { query: `site:{{domain}} "password" filetype:xls OR filetype:xlsx`, purpose: "Find spreadsheets mentioning passwords" },
      { query: `site:{{domain}} "api_key" OR "apikey" OR "secret"`, purpose: "Find pages mentioning API keys or secrets" },
    ],
  },
  {
    name: "Related Recon",
    dorks: [
      { query: `site:{{domain}} -site:www.{{domain}}`, purpose: "Discover other subdomains of the domain" },
      { query: `site:{{domain}} intitle:"index of"`, purpose: "Find open directory listings on the domain" },
      { query: `site:pastebin.com "{{domain}}"`, purpose: "Find paste leaks mentioning the domain" },
      { query: `site:github.com "{{domain}}"`, purpose: "Find GitHub repos/code mentioning the domain" },
    ],
  },
];

function resolve(query: string, domain: string) {
  return query.replaceAll("{{domain}}", domain);
}

export function GoogleDorks() {
  const id = useId();
  const [domain, setDomain] = useState("");
  const filled = domain.trim().length > 0;

  return (
    <div className="not-prose my-4 flex flex-col gap-3">
      <div className="sticky top-(--fd-header-height) z-10 flex flex-wrap items-center gap-3 rounded-lg border border-fd-border bg-fd-background/95 px-3 py-2 shadow-sm backdrop-blur">
        <label
          htmlFor={id}
          className="flex items-center gap-2 text-sm text-fd-muted-foreground"
        >
          <span className="font-medium text-fd-foreground">domain</span>
          <input
            id={id}
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder={DEFAULT_DOMAIN}
            spellCheck={false}
            autoComplete="off"
            className="w-56 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm text-fd-foreground outline-none placeholder:text-fd-muted-foreground focus:ring-2 focus:ring-fd-ring"
          />
        </label>
        <button
          type="button"
          onClick={() => setDomain("")}
          className="ml-auto rounded-md border border-fd-border px-2 py-1 text-xs font-medium text-fd-muted-foreground transition hover:bg-fd-accent hover:text-fd-accent-foreground"
        >
          Reset
        </button>
      </div>

      <Tabs items={CATEGORIES.map((c) => c.name)}>
        {CATEGORIES.map((category) => (
          <Tab key={category.name} value={category.name.toLowerCase()}>
            <ul className="flex flex-col gap-1.5">
              {category.dorks.map((dork) => {
                const display = resolve(dork.query, filled ? domain : "<domain>");
                return (
                  <li
                    key={dork.query}
                    className="flex flex-wrap items-baseline gap-x-2 rounded-md border border-fd-border bg-fd-card px-3 py-2 text-sm"
                  >
                    {filled ? (
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(resolve(dork.query, domain))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-fd-primary underline decoration-dotted underline-offset-4 hover:decoration-solid"
                      >
                        {display}
                      </a>
                    ) : (
                      <span className="font-mono text-fd-muted-foreground">
                        {display}
                      </span>
                    )}
                    <span className="text-fd-muted-foreground">
                      — {dork.purpose}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}
