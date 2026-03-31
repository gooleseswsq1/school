/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "100.115.158.11",
    "localhost",
    "192.168.1.23",
    "192.168.1.0/24",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "169.254.83.107",
    "169.254.0.0/16"
  ],
  outputFileTracingExcludes: {
    "/*": [
      "./backup/**",
      "./md_fil/**",
      "./prisma/dev.db",
      "./prisma/prisma/**",
      "./public/videos/**",
      "./public/interactive/**",
      "./response*.json",
      "./src/app.rar",
      "./*.zip",
      "./*.pdf",
      "./*.docx",
      "./test_upload.docx"
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  webpack: (config, {isServer}) => {
    // Ensure CSS from node_modules is properly handled
    if (!isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        katex: {
          test: /[\\/]node_modules[\\/]katex[\\/]/,
          name: 'katex',
          priority: 10,
          reuseExistingChunk: true,
        },
      };
    }
    return config;
  },
  turbopack: {},
};

export default nextConfig;
