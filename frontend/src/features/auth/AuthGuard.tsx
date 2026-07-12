import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const isAuthenticated    = useAuthStore((s) => s.isAuthenticated());
  const mfaSetupRequired   = useAuthStore((s) => s.mfaSetupRequired);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but MFA not yet enrolled — block all app routes.
  if (mfaSetupRequired && location.pathname !== "/mfa-setup") {
    return <Navigate to="/mfa-setup" replace />;
  }

  return <>{children}</>;
}
