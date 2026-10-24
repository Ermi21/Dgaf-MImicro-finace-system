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
  const fieldId = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="field" ref={containerRef} style={{ position: "relative" }}>
      <label htmlFor={fieldId} style={{ display: "block" }}>
        {label}
      </label>

      {/* Dropdown trigger button */}
      <button
        id={fieldId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 14px",
          borderRadius: "var(--radius-sm, 12px)",
          border: error
            ? "1.5px solid var(--color-rejected, #dc2626)"
            : open
            ? "1.5px solid var(--color-primary, #0f6b4c)"
            : "1.5px solid var(--color-border, #e2e8f0)",
          background: "var(--tg-surface, #ffffff)",
          color: value ? "var(--tg-text, #1c1b19)" : "var(--tg-hint, #64748b)",
          fontSize: "15px",
          fontWeight: value ? 600 : 400,
          fontFamily: "inherit",
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          boxShadow: open ? "0 0 0 3px rgba(15, 107, 76, 0.2)" : "none",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayText}
        </span>

        {/* Downward chevron indicator */}
        <span
          style={{
            fontSize: "11px",
            color: disabled ? "var(--tg-hint, #94a3b8)" : "#0f6b4c",
            transition: "transform 0.2s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            marginLeft: "8px",
            lineHeight: 1,
            userSelect: "none",
            flexShrink: 0,
          }}
        >
          ▼
        </span>
      </button>

      {/* Downward expanding dropdown menu - ALWAYS OPENS DOWN */}
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 9999,
            background: "var(--tg-surface, #ffffff)",
            border: "1.5px solid rgba(15, 107, 76, 0.25)",
            borderRadius: "12px",
            padding: "6px",
            boxShadow: "0 14px 28px rgba(0, 0, 0, 0.14), 0 4px 10px rgba(0, 0, 0, 0.08)",
            maxHeight: "230px",
            overflowY: "auto",
          }}
        >
          {placeholder && (
            <div
              role="option"
              aria-selected={!value}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              style={{
                padding: "9px 12px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: !value ? 700 : 400,
                color: !value ? "#0f6b4c" : "var(--tg-hint, #64748b)",
                background: !value ? "rgba(15, 107, 76, 0.08)" : "transparent",
                cursor: "pointer",
                transition: "background 0.12s ease",
                marginBottom: "2px",
              }}
              onMouseEnter={(e) => {
                if (value) (e.currentTarget.style.background = "rgba(0, 0, 0, 0.04)");
              }}
              onMouseLeave={(e) => {
                if (value) (e.currentTarget.style.background = "transparent");
              }}
            >
              {placeholder}
            </div>
          )}

          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  padding: "9px 12px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? "#0f6b4c" : "var(--tg-text, #1c1b19)",
                  background: isSelected ? "rgba(15, 107, 76, 0.12)" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "background 0.12s ease",
                  marginBottom: "2px",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget.style.background = "rgba(15, 107, 76, 0.05)");
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget.style.background = "transparent");
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <span style={{ color: "#0f6b4c", fontWeight: 800 }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}

      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
