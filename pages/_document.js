// Custom document, added for one reason: webfonts.
//
// Every page was loading its Google Fonts <link> through next/head, which Next
// warns about and which does not survive hydration, so pages fell back to a
// system serif after the first paint. Stylesheets belong here instead, where
// they are part of the document shell and load once for every route.
//
// Red Hat is the program typeface: Display for headings, Text for body, Mono
// for paths and identifiers.

import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Red+Hat+Text:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Red+Hat+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
