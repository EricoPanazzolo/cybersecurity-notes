import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

export const { GET } = createFromSource(source, {
  language: "english",
  // Weight breadcrumb (category/page title) matches above body content.
  // `tags` is also boostable but unused — no page sets a `tags` frontmatter
  // field yet. This engine (ZBSearch, a fork of Orama) has no synonym
  // feature — see CLAUDE.md.
  search: {
    boost: {
      breadcrumbs: 3,
    },
  },
});
