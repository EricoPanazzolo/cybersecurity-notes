import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

// GitHub Pages build only: the deploy workflow copies this over route.ts
// before running `next build` (see .github/workflows/deploy-pages.yml).
// GitHub Pages is a static export with no server to run live per-query
// search against, so this exports the whole search index as one static
// JSON response instead; the client (app/layout.tsx) downloads and queries
// it in the browser via the "static" search client. `dynamic` must be a
// literal here — `output: 'export'` won't accept a computed value.
export const dynamic = "force-static";

export const { staticGET: GET } = createFromSource(source, {
  language: "english",
  search: {
    boost: {
      breadcrumbs: 3,
    },
  },
});
