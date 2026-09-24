import { Navigate } from "react-router-dom";
import { useAuth, type Role } from "@/store/auth";
import { tokens } from "@/api/client";

export function ProtectedRoute({
  children,
  allow,
}: {
  children: React.ReactNode;
  allow: Role[];
}) {
  const user = useAuth((s) => s.user);
  if (!tokens.access) return <Navigate to="/login" replace />;
  if (user && !allow.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
