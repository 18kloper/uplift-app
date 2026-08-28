/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/uplift-legacy", destination: "/founder-cards.html" },
      // Speaker-facing invitation, the link that goes out to prospective speakers.
      { source: "/speak", destination: "/uplift-speak.html" },
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
