/** This allowlist grants platform testing access, independently of restaurant roles. */
export const TESTING_EMAIL = "jaydenoerson95@gmail.com";

type TestingIdentity = {
  primaryEmailAddressId: string | null;
  emailAddresses: {
    id: string;
    emailAddress: string;
    verification: { status: string } | null;
  }[];
};

export function hasTestingAccess(user: TestingIdentity | null | undefined) {
  return Boolean(
    user?.emailAddresses.some(
      (email) =>
        email.id === user.primaryEmailAddressId &&
        email.verification?.status === "verified" &&
        email.emailAddress.toLowerCase() === TESTING_EMAIL,
    ),
  );
}
