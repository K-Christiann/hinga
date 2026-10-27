import { OperatorNotice } from "./OperatorNotice";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  HeartHandshake,
  LockKeyhole,
  MessageCircle,
  NotebookPen,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context";
import { BotanicalArt } from "./BotanicalArt";
import { Button, FlowerMark, Modal } from "./Primitives";

export function GoogleMark() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.23-2.5c-.89.6-2.03.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.92A6.01 6.01 0 0 1 6.1 12c0-.67.11-1.32.31-1.92V7.49H3.07A10 10 0 0 0 2 12c0 1.61.38 3.14 1.07 4.51l3.34-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"
      />
    </svg>
  );
}
export function AuthDialog({
  open,
  onClose,
  onPrivacy,
}: {
  open: boolean;
  onClose(): void;
  onPrivacy(): void;
}) {
  const { services, act } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="A little space for you."
      eyebrow="WELCOME TO HINGA"
      className="auth-modal"
    >
      <FlowerMark size={58} className="auth-flower" />
      <p className="modal-lead">
        Come as you are. Sign in to create your own space or return to it.
      </p>
      <Button
        className="google-button"
        tone="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await act(() => services.auth.google());
          setBusy(false);
        }}
      >
        <GoogleMark />
        {busy ? "Opening Google…" : "Continue with Google"}
      </Button>
      <div className="auth-privacy">
        <LockKeyhole size={17} />
        <p>
          Your Google name and email aren’t shown to other members. Your mood
          entries and notes stay in your personal space. Shared thoughts are
          visible to members and moderators.
        </p>
      </div>
      <button className="text-link subtle-link" onClick={onPrivacy}>
        Read about privacy and your choices <ArrowRight size={14} />
      </button>

      <p className="auth-bottom">
        Just looking for support?{" "}
        <button
          onClick={() => {
            onClose();
            navigate("/help");
          }}
        >
          Get Help is always available.
        </button>
      </p>
    </Modal>
  );
}
export function PrivacyDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose(): void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your privacy, in plain words."
      eyebrow="YOUR CHOICES MATTER"
    >
      <OperatorNotice />
    </Modal>
  );
}
export function Onboarding({ onPrivacy }: { onPrivacy(): void }) {
  const { identity, profile, services, policy, saveProfile, act } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [alias, setAlias] = useState("Quiet Fern");
  const [understood, setUnderstood] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (profile) {
      setAlias(profile.alias);
      setConsent(profile.healthConsent);
    }
  }, [profile?.id]);
  const leaveIntroduction = async () => {
    if (busy) return;
    setBusy(true);
    const signedOut = await act(async () => { await services.auth.signOut(); return true; });
    setBusy(false);
    if (signedOut) navigate("/");
  };
  const titles = [
    "Come as you are.",
    "Make this space your own.",
    "You don’t have to do this alone.",
  ];
  return (
    <Modal
      open={Boolean(identity && profile && !profile.onboardingComplete)}
      onClose={() => { void leaveIntroduction(); }}
      closeLabel="Sign out and close introduction"
      title={titles[step]}
      eyebrow={`A GENTLE INTRODUCTION · ${step + 1} OF 3`}
      className="onboarding-modal"
    >
      <p className="small-copy onboarding-exit-note">Leaving this introduction signs you out. You can return with Google whenever you’re ready.</p>
      <div className="step-dots" aria-label={`Step ${step + 1} of 3`}>
        {[0, 1, 2].map((index) => (
          <span key={index} className={index <= step ? "done" : ""} />
        ))}
      </div>
      {step === 0 ? (
        <>
          <p className="modal-lead">
            There’s no perfect way to start. First, a name that feels like you.
          </p>
          <label className="field-label" htmlFor="alias">
            What should we call you?
          </label>
          <input
            id="alias"
            className="input"
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            maxLength={40}
            autoComplete="off"
          />
          <p className="field-hint">
            This is your private greeting. Shared discussions use a separate
            alias.
          </p>
          <div className="onboarding-privacy-list">
            <p>
              <LockKeyhole size={18} />
              <span>
                <strong>Your notes and moods are private in the app.</strong>
                <br />
                They are not monitored for emergency response.
              </span>
            </p>
            <p>
              <MessageCircle size={18} />
              <span>
                <strong>Sharing is always a choice.</strong>
                <br />
                Approved thoughts are visible to members and moderators.
              </span>
            </p>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={understood}
              onChange={(event) => setUnderstood(event.target.checked)}
            />
            <span>
              I am at least {policy?.minimumAge || 18} years old and understand how personal and shared spaces work.{" "}
              <button className="inline-link" onClick={onPrivacy} type="button">
                Privacy & choices
              </button>
            </span>
          </label>
        </>
      ) : step === 1 ? (
        <>
          <p className="modal-lead">
            Choose a small beginning. You don’t need to share how you feel
            before you’re ready.
          </p>
          <div className="tour-features">
            <p>
              <span className="feature-icon sage">
                <Sprout size={22} />
              </span>
              <span>
                <strong>Notice your days</strong>
                <br />A personal mood calendar, without streaks or pressure.
              </span>
            </p>
            <p>
              <span className="feature-icon peach">
                <NotebookPen size={22} />
              </span>
              <span>
                <strong>Keep a little note</strong>
                <br />
                Write just for yourself. Your words don’t have to be tidy.
              </span>
            </p>
            <p>
              <span className="feature-icon lavender">
                <MessageCircle size={22} />
              </span>
              <span>
                <strong>Share when you choose</strong>
                <br />
                Text-only thoughts and replies, reviewed before sharing.
              </span>
            </p>
          </div>
          <label className="checkbox-row consent-choice">
            <input
              type="checkbox"
              disabled={!policy?.privateCollectionOpen}
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>
              Enable private mood tracking and notes. I agree to keep these
              entries for my own reflection as described in Privacy & choices.{" "}
              <small>
                Optional. If private tools are temporarily unavailable, you can turn them on later in Settings.
              </small>
            </span>
          </label>
        </>
      ) : (
        <>
          <div className="onboarding-art">
            <BotanicalArt variant="pair" />
          </div>
          <p className="welcome-encouragement">
            It’s okay to seek help.
            <br />
            <em>Someone cares for you.</em>
          </p>
          <p className="modal-lead">
            You can find support at any time. The community and private tools
            are not a live crisis service.
          </p>
          <button
            className="text-link"
            onClick={() => {
              navigate("/help");
            }}
          >
            See support options <ExternalLink size={14} />
          </button>
        </>
      )}
      <div className="modal-actions">
        <Button
          tone="ghost"
          disabled={busy}
          onClick={() => {
            if (step > 0) setStep(step - 1);
            else void leaveIntroduction();
          }}
        >
          {step > 0 ? "Back" : busy ? "Please wait…" : "Sign out for now"}
        </Button>
        <Button
          disabled={busy || (step === 0 && (!understood || !alias.trim()))}
          onClick={async () => {
            if (step < 2) {
              setStep(step + 1);
              return;
            }
            setBusy(true);
            await act(async () => {
              await saveProfile({
                alias,
                timezone: profile!.timezone,
                onboardingComplete: true,
                healthConsent: consent,
              });
              navigate("/dashboard");
            });
            setBusy(false);
          }}
        >
          {busy
            ? "Opening your space…"
            : step === 2
              ? "Enter your space"
              : "Continue"}
          {step === 2 ? <Check size={17} /> : <ArrowRight size={17} />}
        </Button>
      </div>
      <button className="onboarding-help" onClick={() => navigate("/help")}>
        <HeartHandshake size={14} /> Get Help is always available
      </button>
    </Modal>
  );
}
