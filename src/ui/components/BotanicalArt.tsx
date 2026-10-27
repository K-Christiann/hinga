export function BotanicalArt({
  variant = "bloom",
  className = "",
}: {
  variant?: "bloom" | "sprig" | "pair";
  className?: string;
}) {
  return (
    <svg
      className={`botanical-art ${className}`}
      viewBox="0 0 480 480"
      fill="none"
      role="img"
      aria-label={
        variant === "pair"
          ? "Two flowers leaning gently toward one another"
          : "A gently growing flower with soft green leaves"
      }
    >
      <defs>
        <filter id={`paper-${variant}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.7"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.035" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
      </defs>
      <g filter={`url(#paper-${variant})`}>
        <path
          d="M64 365V219a176 176 0 0 1 352 0v146Z"
          fill={variant === "pair" ? "#ebdfd1" : "#e6e9dd"}
        />
        <circle cx="329" cy="135" r="49" fill="#ead0b4" />
        <path
          d="M55 376c86-46 124-54 196-20 66 31 105 23 179-18v76H55Z"
          fill="#ccd3b9"
        />
        <path
          d="M80 411c96-44 149-24 211-13 57 10 86 4 117-11v34H80Z"
          fill="#afbea0"
        />
        <path
          d="M242 390c2-80-23-136 0-230"
          stroke="#546d51"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path d="M237 312c-68-3-91-45-94-86 49 1 91 23 94 86Z" fill="#7d9470" />
        <path d="M241 348c69-8 97-54 94-91-52 6-89 37-94 91Z" fill="#647e5b" />
        <path
          d="M236 304c-32-29-54-42-75-52m83 87c28-26 50-45 74-63"
          stroke="#b7c3a7"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <g transform={variant === "sprig" ? "translate(3 15) scale(.94)" : ""}>
          <ellipse
            cx="241"
            cy="124"
            rx="36"
            ry="59"
            fill="#dcae92"
            transform="rotate(-5 241 124)"
          />
          <ellipse
            cx="190"
            cy="158"
            rx="36"
            ry="59"
            fill="#e8b99d"
            transform="rotate(-63 190 158)"
          />
          <ellipse
            cx="208"
            cy="210"
            rx="36"
            ry="59"
            fill="#e3b49b"
            transform="rotate(-139 208 210)"
          />
          <ellipse
            cx="273"
            cy="204"
            rx="36"
            ry="59"
            fill="#e8bda3"
            transform="rotate(143 273 204)"
          />
          <ellipse
            cx="291"
            cy="151"
            rx="36"
            ry="59"
            fill="#eac3a8"
            transform="rotate(67 291 151)"
          />
          <circle cx="241" cy="166" r="30" fill="#a28d53" />
          <circle cx="241" cy="166" r="22" fill="#b6a268" />
          <g fill="#7e754c">
            <circle cx="231" cy="158" r="2" />
            <circle cx="242" cy="154" r="2" />
            <circle cx="250" cy="163" r="2" />
            <circle cx="238" cy="168" r="2" />
            <circle cx="228" cy="170" r="2" />
            <circle cx="242" cy="179" r="2" />
            <circle cx="255" cy="175" r="2" />
          </g>
        </g>
        {variant === "pair" && (
          <g transform="translate(173 117) scale(.45)">
            <path
              d="M230 410c0-90 1-162 10-243"
              stroke="#546d51"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M234 341c-69-7-97-52-93-91 51 6 89 34 93 91Z"
              fill="#718665"
            />
            <g fill="#d1c7df">
              <ellipse cx="240" cy="121" rx="35" ry="59" />
              <ellipse
                cx="191"
                cy="161"
                rx="35"
                ry="59"
                transform="rotate(-65 191 161)"
              />
              <ellipse
                cx="210"
                cy="214"
                rx="35"
                ry="59"
                transform="rotate(-140 210 214)"
              />
              <ellipse
                cx="274"
                cy="210"
                rx="35"
                ry="59"
                transform="rotate(140 274 210)"
              />
              <ellipse
                cx="290"
                cy="158"
                rx="35"
                ry="59"
                transform="rotate(65 290 158)"
              />
            </g>
            <circle cx="240" cy="169" r="28" fill="#a28d53" />
          </g>
        )}
        <path
          d="m116 151 6-13m-4 22-14-4m252 142 8-12m-4 24 14-1"
          stroke="#8d9e7b"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
