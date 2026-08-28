/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/uplift-legacy", destination: "/founder-cards.html" },
      // Speaker-facing invitation. /share-your-expertise is the link that goes
      // out; /expert and /speak stay as aliases so anything already shared
      // keeps working.
      { source: "/share-your-expertise", destination: "/uplift-speak.html" },
      { source: "/expert", destination: "/uplift-speak.html" },
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
