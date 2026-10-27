import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { StaffAccess } from "../../domain/moderation";
import { useApp } from "../context";

const StaffContext = createContext<{
  access: StaffAccess | null; loading: boolean; error: string; reload(): void;
} | null>(null);

export function StaffAccessProvider({ children }: { children: ReactNode }) {
  const { services, identity } = useApp();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ identity: typeof identity; access: StaffAccess | null; loading: boolean; error: string }>({
    identity: null, access: null, loading: false, error: "",
  });
  useEffect(() => {
    let active = true;
    if (!identity) { setState({ identity, access: null, loading: false, error: "" }); return; }
    setState({ identity, access: null, loading: true, error: "" });
    services.moderation.access(identity?.id ?? "").then((access) => {
      if (active) setState({ identity, access, loading: false, error: "" });
    }).catch((cause) => {
      if (active) setState({ identity, access: null, loading: false, error: cause instanceof Error ? cause.message : "Staff access could not be checked." });
    });
    return () => { active = false; };
  }, [services, identity, attempt]);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  const current = state.identity === identity;
  return <StaffContext.Provider value={{ access: current ? state.access : null,
    loading: !!identity && (!current || state.loading), error: current ? state.error : "", reload }}>{children}</StaffContext.Provider>;
}
export function useStaffAccess() {
  const value = useContext(StaffContext);
  if (!value) throw new Error("Staff access must be checked inside the staff provider.");
  return value;
}
