import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ManageShell } from "@/components/shell";
import { StaffGate, staffUnlocked } from "@/components/staff-gate";

export const Route = createFileRoute("/manage")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { name: "theme-color", content: "#0b7a3b" },
      { title: "Paynote desk" },
    ],
  }),
  component: ManageLayout,
});

function ManageLayout() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.documentElement.classList.add("admin-root");
    if (staffUnlocked()) setOpen(true);
    return () => document.documentElement.classList.remove("admin-root");
  }, []);
  if (!open) {
    return <StaffGate onUnlock={() => setOpen(true)} />;
  }
  return (
    <ManageShell>
      <Outlet />
    </ManageShell>
  );
}
