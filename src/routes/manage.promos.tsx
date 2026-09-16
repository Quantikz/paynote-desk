import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/manage/promos")({
  component: () => <Navigate to="/manage" replace />,
});
