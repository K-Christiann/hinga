import { ArrowRight, ArrowUpRight, Phone, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { emergencyResource, helpResource } from "../../data/resources";
import { LandingHeader } from "../landing/LandingHeader";
import { PhotoHero } from "../landing/PhotoHero";
import { SpaceFeatures } from "../landing/SpaceFeatures";
import "../landing/landing.css";

export function Landing({
  onLogin,
  onPrivacy,
}: {
  onLogin(): void;
  onPrivacy(): void;
}) {
  return (
    <div className="lp">
      <LandingHeader onLogin={onLogin} onPrivacy={onPrivacy} />
      <main id="main-content">
        <PhotoHero onLogin={onLogin} />
        <section
          className="lp-invitation lp-width"
          aria-labelledby="lp-invitation-heading"
        >
          <p className="lp-section-index">01 / THE IDEA</p>
          <div>
            <h2 id="lp-invitation-heading">
              Life doesn’t fit neatly
              <br />
              into <span>“I’m fine.”</span>
            </h2>
            <p>
              Some days are easy to name. Others aren’t. Hinga is a place to
              notice what’s going on, without turning it into a score to improve
              or a story you have to share.
            </p>
          </div>
        </section>
        <section
          className="lp-tools lp-width"
          aria-labelledby="lp-tools-heading"
        >
          <div className="lp-section-top">
            <p className="lp-section-index">02 / FIND YOUR STARTING POINT</p>
            <span>THREE WAYS TO MAKE ROOM</span>
          </div>
          <h2 id="lp-tools-heading" tabIndex={-1}>
            What would help
            <br />
            right now?
          </h2>
          <SpaceFeatures onLogin={onLogin} />
        </section>
        <aside
          className="lp-support-strip lp-width"
          aria-label="Support without an account"
        >
          <span className="lp-support-cross" aria-hidden="true">
            <Plus size={29} strokeWidth={1.5} />
          </span>
          <p>
            Looking for someone to talk to?
            <br />
            <span>You can go straight to support. No account needed.</span>
          </p>
          <Link to="/help">
            Open Get Help <ArrowUpRight size={22} />
          </Link>
        </aside>
        <section
          className="lp-privacy lp-width"
          aria-labelledby="lp-privacy-heading"
        >
          <div>
            <p className="lp-section-index">03 / BEFORE YOU BEGIN</p>
            <h2 id="lp-privacy-heading">
              Your space.
              <br />
              Your say.
            </h2>
            <p>
              You should know where your words go.
              <br />
              And you should get to choose.
            </p>
            <button className="lp-text-link" onClick={onPrivacy}>
              Read privacy & your choices <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="lp-questions">
            <details open>
              <summary>
                Who can see my notes and moods?
                <Plus size={20} />
              </summary>
              <p>
                Other members can’t see your mood entries or My Notes. They stay
                in your personal space and aren’t monitored for emergencies. The
                platform’s authorized operators and service providers may
                process data under its privacy rules.
              </p>
            </details>
            <details>
              <summary>
                What if I want to share a thought?
                <Plus size={20} />
              </summary>
              <p>
                Sharing is separate from your private notes. Approved thoughts
                and replies can be read by signed-in members under a discussion
                alias. Moderators review shared content. Leave out identifying
                details you don’t want others to see.
              </p>
            </details>
            <details>
              <summary>
                Does an alias make me anonymous?
                <Plus size={20} />
              </summary>
              <p>
                It hides your Google name and email from other members. The platform still knows your account identity. An alias cannot promise complete anonymity.
              </p>
            </details>
            <details>
              <summary>
                Is someone here to respond right away?
                <Plus size={20} />
              </summary>
              <p>
                Hinga is not a clinical service or a staffed crisis channel.
                Posts wait for review; personal entries aren’t watched for
                emergencies. You can open Get Help at any time without signing
                in.
              </p>
              <Link to="/help" className="lp-text-link">
                See support options <ArrowUpRight size={16} />
              </Link>
            </details>
          </div>
        </section>
        <section className="lp-closing" aria-labelledby="lp-closing-heading">
          <div className="lp-width lp-closing-inner">
            <p className="lp-section-index">
              THERE IS MORE THAN ONE WAY FORWARD.
            </p>
            <div className="lp-closing-row">
              <h2 id="lp-closing-heading">
                You don’t have to
                <br />
                do this <span>alone.</span>
              </h2>
              <div>
                <p>
                  It’s okay to seek help.
                  <br />
                  Someone cares for you.
                </p>
                <span className="lp-service-label">
                  PHILIPPINES · MENTAL HEALTH SUPPORT
                </span>
                <a
                  href={helpResource.href}
                  className="lp-button lp-button-lemon"
                  aria-label={`Call ${helpResource.name}, ${helpResource.phone}`}
                >
                  <Phone size={17} /> {helpResource.phone}
                </a>
                <span className="lp-closing-note">
                  {helpResource.name} · 24/7. No sign-in needed.
                </span>
                <p className="lp-emergency-line">
                  Immediate danger?{" "}
                  <a href={emergencyResource.href}>
                    Call {emergencyResource.phone}
                  </a>
                </p>
                <Link to="/help" className="lp-all-support">
                  All support options <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="lp-footer lp-width">
        <div className="lp-footer-top">
          <p>A space for being human.</p>
          <nav aria-label="Footer navigation">
            <Link to="/resources">
              Resources <ArrowUpRight size={14} />
            </Link>
            <button onClick={onPrivacy}>
              Privacy & choices <ArrowUpRight size={14} />
            </button>
            <button onClick={onLogin}>
              Your space <ArrowUpRight size={14} />
            </button>
          </nav>
        </div>
        <div className="lp-footer-wordmark" aria-hidden="true">
          hinga<span>.</span>
        </div>
        <div className="lp-footer-bottom">
          <span>HINGA / AT YOUR PACE</span>
          <p>
            Your private notes stay in your personal space. Shared thoughts wait for moderator approval.
          </p>
          <Link to="/help">
            Get Help <ArrowRight size={14} />
          </Link>
        </div>
      </footer>
    </div>
  );
}
