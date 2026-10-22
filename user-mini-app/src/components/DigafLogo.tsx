interface DigafLogoProps {
  size?: number;
  showText?: boolean;
  tagline?: string;
  className?: string;
}

export function DigafLogo({
  size = 32,
  showText = true,
  tagline,
  className = "",
}: DigafLogoProps) {
  const height = size;
  const iconWidth = Math.round(height * (46 / 40));

  return (
    <div
      className={`digaf-logo-container ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: Math.round(size * 0.28),
        userSelect: "none",
      }}
    >
      {/* Digaf Stylized .D Mark */}
      <svg
        width={iconWidth}
        height={height}
        viewBox="0 0 46 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, display: "block" }}
      >
        <defs>
          <linearGradient id="digaf-user-mark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        {/* Dot at bottom-left */}
        <rect x="2" y="22" width="10" height="11" rx="2.5" fill="url(#digaf-user-mark-grad)" />
        {/* Stylized D */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M16 7h13c7.732 0 14 6.044 14 13.5S36.732 34 29 34H16V7zm8.5 6.5v14h4.5c3.59 0 6.5-3.134 6.5-7s-2.91-7-6.5-7h-4.5z"
          fill="url(#digaf-user-mark-grad)"
        />
      </svg>

      {/* Wordmark & optional tagline */}
      {showText && (
        <div style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1 }}>
          <span
            style={{
              color: "#ffffff",
              fontSize: Math.round(size * 0.68),
              fontWeight: 800,
              letterSpacing: "-0.03em",
              fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            Digaf
          </span>
          {tagline && (
            <span
              style={{
                color: "#94a3b8",
                fontSize: Math.max(10, Math.round(size * 0.3)),
                fontWeight: 600,
                marginTop: 2,
                letterSpacing: "0.02em",
              }}
            >
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function DigafIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return <DigafLogo size={size} showText={false} className={className} />;
}
