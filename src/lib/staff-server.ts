import { createServerFn } from "@tanstack/react-start";

export const verifyStaffPin = createServerFn({ method: "POST" })
  .validator((data: { pin: string }) => data)
  .handler(async ({ data }) => {
    const { unlockDesk } = await import("@/lib/staff-auth.server");
    return unlockDesk(data.pin);
  });

export const verifyStaffSession = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const { staffTokenValid } = await import("@/lib/staff-auth.server");
    return { ok: await staffTokenValid(data.token) };
  });

export const changeStaffPin = createServerFn({ method: "POST" })
  .validator((data: { token: string; pin: string }) => data)
  .handler(async ({ data }) => {
    const { setDeskPin } = await import("@/lib/staff-auth.server");
    return setDeskPin(data.token, data.pin);
  });
