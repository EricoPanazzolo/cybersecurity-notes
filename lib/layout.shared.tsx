import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Cybersecurity Personal Notes',
    },
    links: [
      {
        text: 'Docs',
        url: '/docs',
      },
    ],
  };
}
