import { ArrowDown, ArrowUpRight } from "lucide-react";
import parkPhoto from "../../assets/landing/park-sunlight.webp";
import "./photo-hero.css";

export function PhotoHero({ onLogin }: { onLogin(): void }) {
  const explore = () => {
    const heading = document.getElementById("lp-tools-heading");
    heading?.scrollIntoView({ block: "start" });
    heading?.focus({ preventScroll: true });
  };

  return (
    <div className="lp-cover-block">
      <section className="lp-cover" aria-labelledby="lp-title">
        <img
          className="lp-cover-photo"
          src={parkPhoto}
          width="1600"
          height="900"
          fetchPriority="high"
          decoding="async"
          alt=""
          aria-hidden="true"
        />
        <div className="lp-cover-shade" aria-hidden="true" />
        <div className="lp-cover-inner lp-width">
          <p className="lp-cover-kicker">A SPACE FOR YOUR MENTAL HEALTH.</p>
          <div className="lp-cover-content">
            <h1 id="lp-title">
              Here, as
              <br />
              <span>you are.</span>
            </h1>
            <div className="lp-cover-introduction">
              <p>You don’t have to feel a certain way to be here.</p>
              <p>
                Check in with yourself, put a thought into words, or find a way
                to reach out.
              </p>
            </div>
            <div className="lp-cover-actions">
              <button className="lp-button lp-button-lemon" onClick={onLogin}>
                Create your space <ArrowUpRight size={20} />
              </button>
              <span>
                New here or returning?
                <br />
                Use this button, then continue with Google.
              </span>
            </div>
          </div>
          <div className="lp-cover-bottom">
            <p>Not every moment has to be a turning point.</p>
            <button className="lp-cover-explore" onClick={explore}>
              Explore the space <ArrowDown size={18} />
            </button>
          </div>
        </div>
      </section>
      <div className="lp-cover-credit lp-width">
        <span>CHECK IN / WRITE / REACH OUT</span>
        <a
          href="https://unsplash.com/photos/park-path-with-trees-green-grass-and-a-bench-m0fhpFfhHBw"
          target="_blank"
          rel="noopener noreferrer"
        >
          Photography: Jesse Wilkens / Unsplash <ArrowUpRight size={12} />
        </a>
      </div>
    </div>
  );
}
