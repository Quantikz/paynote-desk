import { Navigate, useRouterState } from "@tanstack/react-router";
import { adminUrl, surface } from "@/lib/surface";

export function SurfaceGate({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mode = surface();

  if (mode === "admin" && !pathname.startsWith("/manage") && pathname !== "/admin") {
    return <Navigate to="/manage/scan" replace />;
  }

  if (mode === "shop" && (pathname.startsWith("/manage") || pathname === "/admin")) {
    return (
      <div className="grid min-h-dvh place-items-center px-4 text-center">
        <div>
          <p className="text-xl font-semibold">Staff desk is a separate site</p>
          <a className="mt-4 inline-flex h-11 items-center bg-primary px-4 text-primary-foreground" href={adminUrl()}>
            Open staff desk
          </a>
        </div>
      </div>
    );
  }

  return children;
}
