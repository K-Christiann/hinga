import { useEffect, useState } from "react";
import type { Notification } from "../../domain/models";
import { useApp, useData } from "../context";

export function useMemberNotifications(open: boolean) {
  const { identity, services } = useApp();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!identity) return;
    const refresh = () => { if (document.visibilityState === "visible") setTick(value => value + 1); };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [identity?.id]);
  return useData(() => identity ? services.notifications.list(identity.id) : Promise.resolve([]), [] as Notification[], [tick,open]);
}
