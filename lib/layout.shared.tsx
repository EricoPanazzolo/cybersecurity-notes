import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'The Toolbox',
    },
    links: [
      {
        text: 'Docs',
        url: '/docs',
      },
    ],
  };
}
