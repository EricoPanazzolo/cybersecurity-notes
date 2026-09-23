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
      {
        text: 'OWASP WSTG',
        url: 'https://wstg.owasp.org/latest/',
        external: true,
      },
      {
        text: 'jwt.io',
        url: 'https://jwt.io/',
        external: true,
      },
    ],
  };
}
