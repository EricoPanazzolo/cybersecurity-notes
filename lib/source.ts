import { defineDocs } from 'fumadocs-mdx/macro';
import { loader } from 'fumadocs-core/source';
import { pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    lastModified: true,
    // Adds optional WSTG (OWASP Web Security Testing Guide) traceability
    // fields, rendered as a badge next to the page title when present.
    schema: pageSchema.extend({
      wstg: z.string().optional(),
      wstgTitle: z.string().optional(),
    }),
  },
});

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});
