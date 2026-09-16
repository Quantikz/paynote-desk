import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/manage/run")({
  component: () => <Navigate to="/manage/orders" replace />,
});
