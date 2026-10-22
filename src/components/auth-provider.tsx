"use client";
import { createContext, useContext, type ReactNode } from "react";
const Authentication = createContext(false);
export function AuthenticationProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <Authentication.Provider value={enabled}>
      {children}
    </Authentication.Provider>
  );
}
export function useAuthenticationEnabled() {
  return useContext(Authentication);
}
