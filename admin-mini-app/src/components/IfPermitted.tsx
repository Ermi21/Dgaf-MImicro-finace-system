import type { ReactNode } from "react";
import { hasPermission } from "../services/api";

export function IfPermitted({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  if (!hasPermission(permission)) return null;
  return <>{children}</>;
}
