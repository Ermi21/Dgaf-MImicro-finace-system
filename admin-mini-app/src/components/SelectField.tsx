import { useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
  error?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  error,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const selectedOption = options.find((o) => o.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className="field" ref={containerRef} style={{ position: "relative" }}>
      <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 600, color: "var(--tg-hint, #94a3b8)" }}>
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: "#162032",
          border: error ? "1.5px solid #ef4444" : open ? "1.5px solid #10b981" : "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "7px",
          color: value ? "#ffffff" : "var(--tg-hint, #94a3b8)",
          fontSize: "13px",
          fontWeight: 500,
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          boxShadow: open ? "0 0 0 2px rgba(16, 185, 129, 0.25)" : "none",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayText}
        </span>
        <span
          style={{
            fontSize: "10px",
            color: "var(--tg-hint, #94a3b8)",
            transition: "transform 0.18s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            marginLeft: "8px",
          }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)", // ALWAYS OPENS BELOW!
            left: 0,
            right: 0,
            zIndex: 9999,
            background: "#162032",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            borderRadius: "9px",
            padding: "4px",
            boxShadow: "0 12px 30px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.12)",
            maxHeight: "220px",
            overflowY: "auto",
          }}
        >
          {/* Default / Clear option */}
          <div
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            style={{
              padding: "7px 10px",
              borderRadius: "6px",
              fontSize: "12.5px",
              fontWeight: !value ? 700 : 500,
              color: !value ? "#34d399" : "var(--tg-hint, #94a3b8)",
              background: !value ? "rgba(16, 185, 129, 0.12)" : "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{placeholder}</span>
            {!value && <span style={{ fontSize: "11px" }}>✓</span>}
          </div>

          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? "#34d399" : "#ffffff",
                  background: isSelected ? "rgba(16, 185, 129, 0.15)" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "background 0.1s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <span style={{ fontSize: "11px" }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}

      {error && <span className="field-error" style={{ fontSize: "11px", color: "#f87171", marginTop: "2px", display: "block" }}>{error}</span>}
    </div>
  );
}
