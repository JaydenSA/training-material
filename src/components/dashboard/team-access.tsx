"use client";
import { OrganizationProfile, useAuth } from "@clerk/nextjs";
import { useWorkspace } from "@/components/workspace-context";
import { AccountIdentity } from "@/components/auth-controls";
export function TeamAccess() {
  const { mode } = useWorkspace();
  return mode === "demo" ? (
    <>
      <h3>Dashboard access preview</h3>
      <AccountIdentity />
      <p>
        Owners manage invitations, roles, and removals. Managers can manage
        restaurant data. Employees do not need accounts. Invitations are
        disabled in the public demo.
      </p>
    </>
  ) : (
    <ConnectedTeam />
  );
}
function ConnectedTeam() {
  const { has, isLoaded } = useAuth();
  if (!isLoaded) return <p role="status">Loading team access…</p>;
  return (
    <>
      <h3>Restaurant team access</h3>
      <p>
        Owners can invite managers, change membership roles, revoke pending
        invitations, and remove access. Select the Manager role when inviting
        dashboard users; the basic Member role does not grant restaurant
        dashboard access.
      </p>
      {has?.({ role: "org:admin" }) ? (
        <OrganizationProfile
          routing="hash"
          appearance={{
            elements: {
              rootBox: "organization-profile",
              cardBox: "organization-profile-card",
            },
          }}
        />
      ) : (
        <>
          <AccountIdentity />
          <p>
            Only the restaurant owner can change team membership. Your manager
            access does not include invitations or role changes.
          </p>
        </>
      )}
    </>
  );
}
