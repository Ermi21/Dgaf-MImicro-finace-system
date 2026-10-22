import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function Button({ variant = "primary", className, ...rest }: ButtonProps) {
  const variantClass = variant === "primary" ? "btn-primary" : "btn-secondary";
  return <button className={`btn ${variantClass} ${className ?? ""}`} {...rest} />;
}
