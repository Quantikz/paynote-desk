import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { DoorGate } from "@/components/door-gate";
import { HydrateGate } from "@/components/hydrate";
import { ShopTheme } from "@/components/shop-theme";
import { SurfaceGate } from "@/components/surface-gate";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

const APP_NAME = "Paynote";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content: "Paynote is a Lagos supermarket. Shop what is in stock, pay in naira.",
      },
      { name: "theme-color", content: "#3f5c4a" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="en-NG" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <HydrateGate>
            <ShopTheme />
            <DoorGate>
              <SurfaceGate>
                <Outlet />
              </SurfaceGate>
            </DoorGate>
            <Toaster
              position="top-center"
              toastOptions={{
                className: "font-sans",
              }}
            />
          </HydrateGate>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
