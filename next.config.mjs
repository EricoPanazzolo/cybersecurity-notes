import { createMDX } from 'fumadocs-mdx/next';

// Set by the GitHub Pages deploy workflow (.github/workflows/deploy-pages.yml)
// to switch from the self-hosted Docker build (output: 'standalone') to a
// static export served under the repo's project-page path.
const isGithubPages = process.env.GITHUB_PAGES === 'true';
const repoName = 'cybersecurity-notes';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  ...(isGithubPages
    ? {
        output: 'export',
        basePath: `/${repoName}`,
        assetPrefix: `/${repoName}/`,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : { output: 'standalone' }),
};

const withMDX = createMDX();

export default withMDX(config);
