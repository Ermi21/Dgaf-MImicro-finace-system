interface DigafLogoProps {
  size?: number;
  showText?: boolean;
  adminBadge?: boolean;
  className?: string;
}

export function DigafLogo({
  size = 32,
  showText = true,
  adminBadge = false,
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
          <linearGradient id="digaf-gradient-mark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        {/* Dot at bottom-left */}
        <rect x="2" y="22" width="10" height="11" rx="2.5" fill="url(#digaf-gradient-mark)" />
        {/* Stylized D */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M16 7h13c7.732 0 14 6.044 14 13.5S36.732 34 29 34H16V7zm8.5 6.5v14h4.5c3.59 0 6.5-3.134 6.5-7s-2.91-7-6.5-7h-4.5z"
          fill="url(#digaf-gradient-mark)"
        />
      </svg>

      {/* Wordmark */}
      {showText && (
        <span
          style={{
            color: "#ffffff",
            fontSize: Math.round(size * 0.68),
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          Digaf
        </span>
      )}

      {/* Optional Admin Badge */}
      {adminBadge && (
        <span
          style={{
            background: "rgba(16, 185, 129, 0.18)",
            color: "#34d399",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            fontSize: Math.max(10, Math.round(size * 0.32)),
            fontWeight: 800,
            padding: "2px 7px",
            borderRadius: 6,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            lineHeight: 1.2,
          }}
        >
          Admin
        </span>
      )}
    </div>
  );
}

export function DigafIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return <DigafLogo size={size} showText={false} className={className} />;
}
