import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Aurora — Private Messaging" },
      { name: "description", content: "A premium private messaging platform with selective @mention messages, voice notes, and end-to-end conversations." },
      { name: "theme-color", content: "#0a0a14" },
      { property: "og:title", content: "Aurora — Private Messaging" },
      { property: "og:description", content: "Premium private messaging with selective @mention visibility." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: () => <Outlet />,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass rounded-3xl p-10 text-center">
        <h1 className="text-aurora font-display text-6xl font-bold">404</h1>
        <p className="mt-3 text-muted-foreground">This page drifted into the void.</p>
        <a href="/" className="mt-6 inline-block rounded-full bg-aurora px-6 py-2 font-medium text-primary-foreground">
          Back home
        </a>
      </div>
    </div>
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
