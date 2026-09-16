import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/manage/register")({
  component: () => <Navigate to="/manage/orders" search={{ sale: true }} replace />,
});
