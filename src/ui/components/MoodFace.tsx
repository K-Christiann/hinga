import type { MoodValue } from "../../domain/models";
export function MoodFace({
  value,
  size = 42,
}: {
  value: MoodValue;
  size?: number;
}) {
  const mouth =
    value === 1
      ? "M15 31 Q24 21 33 31"
      : value === 2
        ? "M16 30 Q24 24 32 30"
        : value === 3
          ? "M17 28 L31 28"
          : value === 4
            ? "M16 26 Q24 33 32 26"
            : "M15 25 Q24 38 33 25";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="21" fill="currentColor" fillOpacity=".12" />
      <circle
        cx="24"
        cy="24"
        r="18.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M17 19v2m14-2v2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d={mouth}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
