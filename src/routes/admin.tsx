import { createFileRoute, Navigate } from "@tanstack/react-router";
import { surface } from "@/lib/surface";

export const Route = createFileRoute("/admin")({
  component: AdminRedirect,
});

function AdminRedirect() {
  if (surface() === "shop") return <Navigate to="/" replace />;
  return <Navigate to="/manage/scan" replace />;
}
