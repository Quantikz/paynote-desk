import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ManageShell } from "@/components/shell";
import { StaffGate } from "@/components/staff-gate";
import { clearStaffSession, isLocalStaffToken, staffToken, staffUnlocked } from "@/lib/staff-session";
import { verifyStaffSession } from "@/lib/staff-server";

export const Route = createFileRoute("/manage")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { name: "theme-color", content: "#0b7a3b" },
      { title: "Staff desk" },
    ],
  }),
  component: ManageLayout,
});

function ManageLayout() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("admin-root");
    let live = true;
    async function check() {
      if (!staffUnlocked()) {
        if (live) setOpen(false);
        return;
      }
      const token = staffToken();
      if (isLocalStaffToken(token) || !navigator.onLine) {
        if (live) setOpen(true);
        return;
      }
      try {
        const result = await verifyStaffSession({ data: { token } });
        if (!live) return;
        if (!result.ok) {
          clearStaffSession();
          setOpen(false);
          return;
        }
        setOpen(true);
      } catch {
        if (live && staffUnlocked()) setOpen(true);
      }
    }
    void check();
    const pulse = window.setInterval(() => void check(), 20000);
    return () => {
      live = false;
      window.clearInterval(pulse);
      document.documentElement.classList.remove("admin-root");
    };
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
