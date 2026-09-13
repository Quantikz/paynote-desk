import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import { surface } from "@/lib/surface";
import { Button } from "@/components/ui/button";

export function SurfaceGate({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mode = surface();

  if (mode === "admin" && !pathname.startsWith("/manage") && pathname !== "/admin") {
    if (pathname.startsWith("/api/")) return children;
    return <Navigate to="/manage/scan" replace />;
  }

  if (mode === "shop" && (pathname.startsWith("/manage") || pathname === "/admin")) {
    return (
      <div className="grid min-h-dvh place-items-center px-4 text-center">
        <div>
          <p className="text-xl font-semibold">We cannot find that page</p>
          <p className="mt-2 text-sm text-muted-foreground">It is not part of the shop.</p>
          <Button asChild className="mt-5">
            <Link to="/">Back to the shop</Link>
          </Button>
        </div>
      </div>
    );
  }

  return children;
}
