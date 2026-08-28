/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/uplift-legacy", destination: "/founder-cards.html" },
      // Speaker-facing invitation. /expert is the link that goes out ("Uplift
      // Expert Sessions", matching what past sessions were called); /speak is
      // kept as an alias so links already shared keep working.
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
