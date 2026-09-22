import { source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/layout.shared";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...baseOptions()}
      // Fumadocs caps the whole sidebar+main+toc row at 97rem and centers
      // it, which on a wide viewport leaves the leftover space as a blank
      // flexible gutter to the sidebar's left. Raise the cap so the main
      // content column absorbs that space instead.
      containerProps={{ className: "[--fd-layout-width:2400px]" }}
    >
      {children}
    </DocsLayout>
  );
}
