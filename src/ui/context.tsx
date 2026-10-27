import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useId,
  useMemo,
  type Dispatch,
  type SetStateAction,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { DraftMemory } from "../application/draftMemory";
import type { PublicPolicy } from "../domain/policy";
import type { Services } from "../application/services";
import type { Identity, Profile } from "../domain/models";

export interface ActionScope { isCurrent(): boolean }
interface AppState {
  services: Services;
  policy: PublicPolicy | null;
  policyError: string;
  identity: Identity | null;
  profile: Profile | null;
  loading: boolean;
  revision: number;
  draftMemory: DraftMemory;
  refresh(): void;
  saveProfile(profile: Omit<Profile, "id">): Promise<void>;
  removeAccount(): Promise<void>;
  act<T>(action: (scope: ActionScope) => Promise<T>, message?: string, onError?: (message: string) => void, refreshAfter?: boolean): Promise<T | undefined>;
  toast: string;
  error: string;
  clearToast(): void;
  dirty: boolean;
  setDirty(value: boolean): void;
  trackDraft(id: string, value: boolean): void;
}
const Context = createContext<AppState | null>(null);
export function AppProvider({
  services,
  children,
}: {
  services: Services;
  children: ReactNode;
}) {
  const [policy, setPolicy] = useState<PublicPolicy | null>(null);
  const [policyError, setPolicyError] = useState("");
  useEffect(() => {
    let active = true;
    const load = () => services.policy.get().then(value => { if (active) { setPolicy(value); setPolicyError(""); } }).catch(() => { if (active) { setPolicy(null); setPolicyError("Availability could not be checked. New private saves and community submissions are paused; existing data and Get Help remain available."); } });
    void load(); const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, [services]);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const draftMemory = useMemo(() => new DraftMemory(), [identity?.id]);
  const retainedDirty = useSyncExternalStore(draftMemory.subscribeAll, draftMemory.isDirty, draftMemory.isDirty);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, boolean>>({});
  const trackDraft = useCallback((id: string, value: boolean) => setDrafts((previous) => {
    if (Boolean(previous[id]) === value) return previous;
    const next = { ...previous };
    if (value) next[id] = true; else delete next[id];
    return next;
  }), []);
  const generation = useRef(0);
  const currentId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    let events = 0;
    const receive = (next: Identity | null) => {
      if (!active || currentId.current === (next?.id ?? null)) return;
      currentId.current = next?.id ?? null;
      generation.current += 1;
      setIdentity(next);
      setProfile(null);
      setDirty(false);
      setDrafts({});
      setError("");
      setToast("");
      setRevision((value) => value + 1);
      setLoading(Boolean(next));
    };
    const unsubscribe = services.auth.subscribe((next) => { events += 1; receive(next); });
    const initialEvents = events;
    services.auth
      .current()
      .then((value) => {
        if (active && events === initialEvents) receive(value);
      })
      .catch(() => {
        if (active && events === initialEvents) {
          setError(
            "Your session could not be restored. You can try again or visit Get Help.",
          );
          setLoading(false);
        }
      })
      ;
    return () => {
      active = false;
      unsubscribe();
    };
  }, [services]);
  useEffect(() => {
    if (!identity) {
      setLoading(false);
      return;
    }
    const expected = generation.current;
    let active = true;
    services.profiles
      .get(identity.id)
      .then((value) => {
        if (active && expected === generation.current) setProfile(value);
      })
      .catch((cause) => {
        if (active && expected === generation.current)
          setError(
            cause instanceof Error
              ? cause.message
              : "Your space could not load.",
          );
      })
      .finally(() => {
        if (active && expected === generation.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [identity, services]);
  useEffect(() => {
    if (!toast && !error) return;
    const timeout = window.setTimeout(() => {
      setToast("");
      setError("");
    }, 6500);
    return () => window.clearTimeout(timeout);
  }, [toast, error]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  async function act<T>(action: (scope: ActionScope) => Promise<T>, message?: string, onError?: (message: string) => void, refreshAfter = true) {
    const expected = generation.current;
    const scope = { isCurrent: () => expected === generation.current };
    setError("");
    try {
      const result = await action(scope);
      if (scope.isCurrent()) {
        if (refreshAfter) refresh();
        if (message) setToast(message);
        return result;
      }
      return undefined;
    } catch (cause) {
      const message = cause instanceof Error
          ? cause.message
          : "Something did not save. Please try again.";
      if (scope.isCurrent()) { if (onError) onError(message); else setError(message); }
      return undefined;
    }
  }
  async function saveProfile(value: Omit<Profile, "id">) {
    if (!identity) return;
    const expected = generation.current;
    const next = await services.profiles.save(identity.id, value);
    if (expected !== generation.current) throw new Error("Your account changed. Open your settings again.");
    setProfile(next);
    refresh();
  }
  async function removeAccount() {
    if (!identity) throw new Error("Please sign in before deleting your account.");
    const expected = generation.current;
    await services.accounts.remove(identity.id);
    // Only the deletion's own sign-out may produce this non-private confirmation.
    // A different account must receive neither the old result nor its message.
    if (currentId.current === null && generation.current === expected + 1)
      setToast("Your Hinga account and its live personal entries were deleted.");
  }
  return (
    <Context.Provider
      value={{
        services,
        policy, policyError,
        draftMemory,
        identity,
        profile: profile?.id === identity?.id ? profile : null,
        loading,
        revision,
        refresh,
        saveProfile,
        removeAccount,
        act,
        toast,
        error,
        clearToast: () => {
          setToast("");
          setError("");
        },
        dirty: dirty || retainedDirty || Object.values(drafts).some(Boolean),
        setDirty,
        trackDraft,
      }}
    >
      <Fragment key={identity?.id ?? "signed-out"}>{children}</Fragment>
    </Context.Provider>
  );
}
export function useApp() {
  const context = useContext(Context);
  if (!context) throw new Error("Application services are not available.");
  return context;
}
export function useDraftGuard(changed: boolean, retainedKey?: string) {
  const id = useId();
  const { trackDraft } = useApp();
  useEffect(() => {
    const key = retainedKey || id;
    trackDraft(key, changed);
    return () => trackDraft(key, false);
  }, [id, retainedKey, changed, trackDraft]);
}
/** Tab-memory only; the provider creates a new store on account changes. */
export function useRetainedState<T>(key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const { draftMemory } = useApp();
  draftMemory.initialize(key, initial);
  const value = useSyncExternalStore(notify => draftMemory.subscribe(key, notify), () => draftMemory.get<T>(key), () => draftMemory.get<T>(key));
  const update: Dispatch<SetStateAction<T>> = (next) => {
    const current = draftMemory.get<T>(key);
    draftMemory.set(key, typeof next === "function" ? (next as (previous: T) => T)(current) : next);
  };
  return [value, update];
}
export function useData<T>(
  loader: () => Promise<T>,
  fallback: T,
  dependencies: unknown[] = [],
) {
  const { revision, identity } = useApp();
  const [data, setData] = useState<T>(fallback);
  const [dataOwner, setDataOwner] = useState(identity?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    loader()
      .then((value) => {
        if (active) { setData(value); setDataOwner(identity?.id); }
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "This information could not load.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision, identity?.id, ...dependencies]);
  return { data: dataOwner === identity?.id ? data : fallback, loading, error };
}

/** Browser display settings; separate from private entries and unsaved drafts. */
export function useDisplayPreference(key: import("../domain/preferences").DisplayPreference) {
  const { services } = useApp();
  const value = useSyncExternalStore(services.preferences.subscribe, () => services.preferences.get(key), () => true);
  return [value, (next: boolean) => services.preferences.set(key, next)] as const;
}
