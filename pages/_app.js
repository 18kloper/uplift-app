import { useEffect } from "react";
import { useRouter } from "next/router";

// Global chunk-load recovery.
// When we deploy, every JS file gets a new hashed filename. A browser still
// holding the previous build's HTML will request chunk filenames that no longer
// exist (404) and React white-screens with "a client-side exception has
// occurred." This listener detects that specific failure and reloads the page
// once (guarded against reload loops) so the browser picks up the new build.
function isChunkError(msg = "", name = "") {
  return (
    name === "ChunkLoadError" ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Loading CSS chunk/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /import\(\) failed/i.test(msg)
  );
}

function recoverOnce() {
  try {
    const KEY = "__chunk_reload_at";
    const last = Number(sessionStorage.getItem(KEY) || 0);
    // Only reload if we haven't already tried in the last 10s (avoids a loop).
    if (Date.now() - last > 10000) {
      sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
    }
  } catch {
    window.location.reload();
  }
}

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const onError = (e) => {
      const err = e?.error || e?.reason || {};
      if (isChunkError(err?.message || e?.message || "", err?.name || "")) {
        recoverOnce();
      }
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onError);

    // Next.js emits this when a route transition fails to load its chunk.
    const onRouteError = (err) => {
      if (isChunkError(err?.message || "", err?.name || "")) recoverOnce();
    };
    router.events.on("routeChangeError", onRouteError);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onError);
      router.events.off("routeChangeError", onRouteError);
    };
  }, [router]);

  return <Component {...pageProps} />;
}
