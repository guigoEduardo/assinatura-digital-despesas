const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'assinatura-digital-despesas';
const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  ...(isGitHubPagesBuild ? { basePath: `/${repositoryName}` } : {}),
  images: { unoptimized: true },
};

export default nextConfig;
