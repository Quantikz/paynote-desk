import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/manage/customers")({
  component: () => <Navigate to="/manage/orders" replace />,
});
