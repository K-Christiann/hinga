import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Download,
  LockKeyhole,
  RotateCcw,
  Settings2,
  Trash2,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { BlockedAccount } from "../../domain/models";
import { useApp, useData, useDraftGuard } from "../context";
import { Button, ErrorLine, Modal } from "./Primitives";
import { Pagination } from "./Pagination";
import { usePagination } from "../hooks/pagination";

function downloadJson(data: unknown) {
  const blob = data instanceof Blob ? data : new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "hinga-my-personal-data.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function SettingsDialog({
  open,
  onClose,
  onPrivacy,
}: {
  open: boolean;
  onClose(): void;
  onPrivacy(): void;
}) {
  const { profile, identity, services, policy, saveProfile, removeAccount, dirty, act } = useApp();
  const navigate = useNavigate();
  const [alias, setAlias] = useState(profile?.alias || "");
  const [timezone, setTimezone] = useState(profile?.timezone || "Asia/Manila");
  const [consent, setConsent] = useState(profile?.healthConsent || false);
  const [section, setSection] = useState("preferences");
  const baseline = useRef({ alias: profile?.alias || "", timezone: profile?.timezone || "Asia/Manila", consent: profile?.healthConsent || false });
  const settingsChanged = alias !== baseline.current.alias || timezone !== baseline.current.timezone || consent !== baseline.current.consent;
  useDraftGuard(open && settingsChanged);
  const confirmDiscard = () => !settingsChanged || window.confirm("Discard your unsaved settings changes?");

  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState("");
  const [operationError, setOperationError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const closeSettings = () => { if (!busy && confirmDiscard()) onClose(); };
  const { data: blocked, error } = useData(
    () =>
      identity ? services.community.blocked(identity.id) : Promise.resolve([]),
    [] as BlockedAccount[],
    [open],
  );
  const blockedPage = usePagination(blocked, 6, `${identity?.id}:${open}`);
  useEffect(() => {
    if (open && profile) {
      baseline.current = { alias: profile.alias, timezone: profile.timezone, consent: profile.healthConsent };
      setSection("preferences");
      setAlias(profile.alias);
      setTimezone(profile.timezone);
      setConsent(profile.healthConsent);
      setOperationError(""); setOperation(""); setDeleteOpen(false); setConfirmation("");
    }
  }, [open, profile?.id]);
  return (
    <>
      <Modal
        open={open}
        onClose={closeSettings}
        title="Make this space yours."
        eyebrow="YOUR SETTINGS"
        className="settings-modal"
      >
        <nav className="settings-navigation" aria-label="Settings sections">
          {[["preferences", "Preferences"], ["data", "Privacy & data"], ["blocked", "Blocked members"], ["account", "Account"]].map(([id, label]) => <button type="button" key={id} disabled={busy} aria-pressed={section === id} aria-controls={`settings-${id}`} onClick={() => setSection(id)}>{label}</button>)}
        </nav>
        {settingsChanged && section !== "preferences" && <p className="settings-unsaved" role="status">You have unsaved preference changes. <button type="button" className="inline-link" onClick={() => setSection("preferences")}>Return to save choices</button></p>}
        <form id="settings-preferences" hidden={section !== "preferences"} aria-label="Preferences"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!profile || busy) return;
            setBusy(true);
            setOperation("save"); setOperationError("");
            const saved = await act(async () => {
              await saveProfile({
                alias,
                timezone,
                healthConsent: consent,
                onboardingComplete: profile.onboardingComplete,
              });
              return true;
            }, "Your choices have been saved.", setOperationError);
            setBusy(false);
            setOperation("");
            if (saved) onClose();
          }}
        >
          <h3 className="settings-panel-title">Your preferences</h3>
          <fieldset className="settings-fields" disabled={busy}>
          <div className="settings-grid">
            <label className="field-label" htmlFor="settings-alias">
              Private greeting alias
              <input
                id="settings-alias"
                className="input"
                value={alias}
                maxLength={40}
                onChange={(event) => setAlias(event.target.value)}
              />
              <span className="field-hint">
                Shared discussions use a separate generated alias.
              </span>
            </label>
            <label className="field-label" htmlFor="settings-zone">
              Your calendar timezone
              <select
                id="settings-zone"
                className="input"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
              >
                {[
                  "Asia/Manila",
                  "UTC",
                  "Asia/Tokyo",
                  "America/Los_Angeles",
                ].map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                Previous check-ins keep their recorded day.
              </span>
            </label>
          </div>
          {!policy?.privateCollectionOpen && <p className="inline-notice" role="status">New private entries are temporarily unavailable. You can still turn private tools off and manage saved entries.</p>}
          <label className="checkbox-row settings-consent">
            <input
              type="checkbox"
              disabled={!consent && !policy?.privateCollectionOpen}
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>
              <strong>Enable private mood tracking and notes.</strong>
              <br />I agree to keep these entries for my personal reflection, as
              explained in Privacy & choices. These tools are not monitored for
              emergencies.
              <small>
                Turning this off pauses new entries. Use the controls below to
                remove existing data.
              </small>
            </span>
          </label>
          <div className="modal-actions">
            <Button tone="ghost" onClick={closeSettings} type="button">
              Cancel
            </Button>
            <Button disabled={!alias.trim() || busy} type="submit">
              {busy ? "Saving…" : "Save my choices"}
              <ArrowRight size={15} />
            </Button>
          </div>
          </fieldset>
        </form>
        <ErrorLine>{operationError}</ErrorLine>
        {busy && <p className="small-copy" role="status" aria-live="polite">{operation === "signout" ? "Signing out…" : operation === "export" ? "Preparing your export…" : operation === "delete" ? "Removing your account…" : "Saving your choices…"}</p>}
        <div className="settings-section" id="settings-data" hidden={section !== "data"}>
          <h3>
            <LockKeyhole size={17} /> Privacy and your data
          </h3>
          <button className="settings-action" disabled={busy} onClick={onPrivacy}>
            <span>Read privacy & your choices</span>
            <ArrowRight size={16} />
          </button>
          <button
            className="settings-action"
            disabled={busy}
            onClick={async () => {
              if (busy || !identity) return;
              setBusy(true); setOperation("export"); setOperationError("");
              await act(async (scope) => {
                const data = await services.accounts.export(identity!.id);
                if (scope.isCurrent()) downloadJson(data);
              }, "Your personal data export download has started.", setOperationError);
              setBusy(false); setOperation("");
            }}
          >
            <span>{busy && operation === "export" ? "Preparing export…" : "Export my personal data"}</span>
            <Download size={16} />
          </button>
          <button
            className="settings-action"
            disabled={busy}
            onClick={async () => {
              if (!confirmDiscard()) return;
              setBusy(true); setOperation("save"); setOperationError("");
              const saved = await act(async () => {
                await saveProfile({ ...profile!, onboardingComplete: false });
                return true;
              }, undefined, setOperationError);
              setBusy(false); setOperation("");
              if (saved) { onClose(); navigate("/dashboard"); }
            }}
          >
            <span>Replay the welcome introduction</span>
            <RotateCcw size={16} />
          </button>
        </div>
        <div className="settings-section" id="settings-blocked" hidden={section !== "blocked"}>
          <h3>Blocked members</h3>
          <ErrorLine>{error}</ErrorLine>
          <div id="blocked-members-list">{blocked.length ? (
            blockedPage.items.map((item) => (
              <div className="blocked-row" key={item.id}>
                <span>{item.alias}</span>
                <Button
                  tone="ghost"
                  disabled={busy}
                  onClick={() => {
                    void act(
                      () => services.community.unblock(identity!.id, item.id),
                      "Member unblocked.",
                    );
                  }}
                >
                  Unblock
                </Button>
              </div>
            ))
          ) : (
            <p className="small-copy">You haven’t blocked anyone.</p>
          )}</div>
          {blocked.length > 0 && <Pagination {...blockedPage} label="Blocked members" controls="blocked-members-list" onChange={blockedPage.setPage} />}
        </div>
        <div id="settings-account" hidden={section !== "account"}>
        <div className="settings-section">
          <h3>Your session</h3>
          <Button tone="secondary" disabled={busy} onClick={async () => {
            if ((dirty || settingsChanged) && !window.confirm("Sign out and discard unsaved drafts and settings changes in this tab?")) return;
            setBusy(true); setOperation("signout"); setOperationError("");
            const signedOut = await act(async () => { await services.auth.signOut(); return true; }, undefined, setOperationError);
            setBusy(false); setOperation("");
            if (signedOut) { onClose(); navigate("/"); }
          }}><LogOut size={16} />{operation === "signout" ? "Signing out…" : "Sign out"}</Button>
        </div>
        <div className="settings-section delete-account-section">
          <h3>Leave this space</h3>
          <p>
            Remove your Hinga account and its associated data. This does not
            delete your Google account.
          </p>
          <Button
            tone="danger"
            disabled={busy}
            onClick={() => {
              setConfirmation("");
              setOperationError("");
              setDeleteOpen(true);
            }}
          >
            <Trash2 size={15} /> Delete my account
          </Button>
        </div>
        </div>
      </Modal>
      <Modal
        open={deleteOpen}
        onClose={() => { if (!busy) setDeleteOpen(false); }}
        title="Delete your Hinga account?"
        eyebrow="YOUR DATA, YOUR CHOICE"
      >
        <p className="modal-lead">
          This removes the account and associated personal entries. Your Google
          account will remain. This permanently deletes your Hinga sign-in and its live notes, moods and associated account data. Export anything you want to keep first.
        </p>
        <p className="small-copy">Deletion is complete only after the server confirms it. If the connection fails, this dialog will keep the error visible so you can retry. Connected accounts may need to sign in again first.</p>
        <label className="field-label" htmlFor="delete-confirmation">
          Type DELETE to confirm
        </label>
        <input
          id="delete-confirmation"
          className="input"
          value={confirmation}
          autoComplete="off"
          disabled={busy}
          onChange={(event) => setConfirmation(event.target.value)}
        />
        <div className="modal-actions">
          <Button tone="secondary" disabled={busy} onClick={() => setDeleteOpen(false)}>
            Keep my account
          </Button>
          <Button
            tone="danger"
            disabled={confirmation !== "DELETE" || busy}
            onClick={async () => {
              setBusy(true);
              setOperation("delete"); setOperationError("");
              await act(async () => {
                await removeAccount();
              }, "Your Hinga space was removed.", setOperationError);
              setBusy(false);
              setOperation("");
            }}
          >
            {busy ? "Removing…" : "Delete my account"}
            <Trash2 size={15} />
          </Button>
        </div>
        <ErrorLine>{operationError}</ErrorLine>
      </Modal>
    </>
  );
}
