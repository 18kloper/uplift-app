/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/uplift-legacy", destination: "/founder-cards.html" },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals]),
        "pdfkit",
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
