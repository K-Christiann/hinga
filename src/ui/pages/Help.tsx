import {
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  HeartHandshake,
  Phone,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  emergencyResource,
  helpResource,
  readingResources,
} from "../../data/resources";
import { BotanicalArt } from "../components/BotanicalArt";
import { FlowerMark, PageIntro } from "../components/Primitives";
import "./help-contacts.css";

export function Help() {
  const showSupport = () => {
    document
      .getElementById("support-options")
      ?.scrollIntoView({ block: "start" });
    document
      .getElementById("support-contact-heading")
      ?.focus({ preventScroll: true });
  };
  return (
    <main id="main-content" className="help-page">
      <section className="help-hero">
        <div>
          <p className="eyebrow">SUPPORT IS A PLACE TO START</p>
          <h1>
            It’s okay to
            <br />
            seek help.
            <br />
            <em>
              Someone cares
              <br />
              for you.
            </em>
          </h1>
          <p>
            You don’t need the perfect words, or a certain kind of day, to reach
            out.
          </p>
          <button
            type="button"
            onClick={showSupport}
            className="button button-primary"
          >
            See support options <ArrowRight size={17} />
          </button>
          <span className="help-no-login">
            <HeartHandshake size={15} /> No sign-in needed. Take your time.
          </span>
        </div>
        <BotanicalArt variant="pair" />
      </section>
      <section id="support-options" className="support-section">
        <div className="support-heading">
          <span className="eyebrow">WHEN YOU WANT SOMEONE TO TALK TO</span>
          <h2 id="support-contact-heading" tabIndex={-1}>
            A real person. A place to start.
          </h2>
          <p>
            These options are for people in the Philippines. For immediate
            danger or a medical emergency, use emergency assistance. NCMH offers
            mental-health crisis support and someone to talk to.
          </p>
        </div>
        <article
          className="emergency-contact"
          aria-labelledby="emergency-contact-title"
        >
          <div>
            <span className="emergency-contact-label">
              PHILIPPINES · IMMEDIATE DANGER
            </span>
            <h3 id="emergency-contact-title">{emergencyResource.name}</h3>
            <p>
              {emergencyResource.description} If you cannot connect, contact
              your local emergency services or go to the nearest emergency
              department.
            </p>
            <a
              href={emergencyResource.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Government emergency information <ExternalLink size={13} />
            </a>
          </div>
          <a
            href={emergencyResource.href}
            className="button button-primary"
            aria-label={`Call ${emergencyResource.phone} for emergency assistance in the Philippines`}
          >
            <Phone size={17} />
            Call {emergencyResource.phone}
          </a>
        </article>
        <article className="hotline-card">
          <div className="hotline-icon">
            <Phone size={26} />
          </div>
          <div className="hotline-details">
            <span className="resource-country">
              PHILIPPINES · MENTAL HEALTH & CRISIS SUPPORT
            </span>
            <h3>{helpResource.name}</h3>
            <p>{helpResource.description}</p>
            <span className="service-hours">
              <span />
              {helpResource.hours}
            </span>
          </div>
          <div className="hotline-actions">
            <a className="button button-primary" href={helpResource.href}>
              <Phone size={16} /> {helpResource.phone}
            </a>
            <a
              className="text-link"
              href={helpResource.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              Service information <ExternalLink size={14} />
            </a>
          </div>
        </article>
        <p className="resource-verification">
          Directory information checked {helpResource.checked}. Service
          availability may change. This external service is not operated by
          Hinga.
        </p>
      </section>
      <section className="help-next-steps">
        <div>
          <span className="number-label">01</span>
          <h3>Start with one sentence.</h3>
          <p>
            “I’ve been having a difficult time, and I’d like someone to talk
            to.” You can choose how much to say.
          </p>
        </div>
        <div>
          <span className="number-label">02</span>
          <h3>Reach out to someone you trust.</h3>
          <p>
            You might ask a trusted person to sit with you or help you contact a
            professional.
          </p>
        </div>
        <div>
          <span className="number-label">03</span>
          <h3>Try another support option.</h3>
          <p>
            If a service is unavailable, another trusted person, qualified
            professional, or local emergency service may help.
          </p>
        </div>
      </section>
      <ResourcesSection />
      <footer className="help-footer">
        <FlowerMark size={28} />
        <p>
          Getting support is a beginning.
          <br />
          <em>You can take it one step at a time.</em>
        </p>
        <Link className="text-link" to="/">
          Back to Hinga <ArrowRight size={15} />
        </Link>
      </footer>
    </main>
  );
}
function ResourcesSection() {
  return (
    <section className="reading-resources">
      <div>
        <span className="eyebrow">A LITTLE UNDERSTANDING</span>
        <h2>Read at your own pace.</h2>
        <p>
          General information from established health organizations. These
          resources do not replace personal professional support.
        </p>
      </div>
      <div className="resource-grid">
        {readingResources.map((resource) => (
          <a
            href={resource.href}
            key={resource.title}
            target="_blank"
            rel="noopener noreferrer"
            className="resource-card"
          >
            <span className="topic-tag">{resource.tag}</span>
            <h3>{resource.title}</h3>
            <p>{resource.description}</p>
            <span className="resource-source">
              {resource.label}
              <ArrowUpRight size={18} />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
export function Resources() {
  return (
    <main id="main-content" className="resources-page">
      <PageIntro
        eyebrow="SOMEWHERE TO START"
        title="A little understanding can help."
      >
        Explore information at your own pace. You can pause or leave whenever
        you need.
      </PageIntro>
      <ResourcesSection />
      <div className="resources-help">
        <HeartHandshake size={27} />
        <div>
          <h2>Looking for someone to talk to?</h2>
          <p>You can open support options without an account.</p>
        </div>
        <Link to="/help" className="button button-primary">
          Get Help <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}
