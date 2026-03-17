interface AniVerseLogoProps {
  size?: number;
  className?: string;
}

export default function AniVerseLogo({ size = 96, className = '' }: AniVerseLogoProps): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AniVerse logo"
      role="img"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.3" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer ring */}
      <circle
        cx="48"
        cy="48"
        r="44"
        stroke="url(#ringGradient)"
        strokeWidth="1.5"
        strokeDasharray="8 4"
        opacity="0.6"
      />

      {/* Inner circle background */}
      <circle cx="48" cy="48" r="36" fill="#0f0f1a" />
      <circle cx="48" cy="48" r="36" fill="url(#logoGradient)" opacity="0.08" />

      {/* Orbit ring (tilted ellipse) */}
      <ellipse
        cx="48"
        cy="48"
        rx="32"
        ry="10"
        stroke="url(#logoGradient)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
        transform="rotate(-25 48 48)"
      />

      {/* "A" letter mark */}
      <path
        d="M48 22 L62 66 H54 L50.5 55 H45.5 L42 66 H34 L48 22Z"
        fill="url(#logoGradient)"
        filter="url(#glow)"
      />
      <line
        x1="44"
        y1="50"
        x2="52"
        y2="50"
        stroke="#0f0f1a"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Stars / particles */}
      <circle cx="20" cy="28" r="1.5" fill="#a78bfa" opacity="0.8" />
      <circle cx="76" cy="32" r="1" fill="#f472b6" opacity="0.7" />
      <circle cx="72" cy="68" r="1.5" fill="#fb923c" opacity="0.6" />
      <circle cx="24" cy="64" r="1" fill="#a78bfa" opacity="0.5" />
      <circle cx="48" cy="10" r="1" fill="#f472b6" opacity="0.6" />
    </svg>
  );
}
