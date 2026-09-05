export function displayError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Try again later or reset the password.",
    "auth/network-request-failed": "Network connection failed. Check your connection and retry.",
    "permission-denied": "Firebase rules denied this action. Confirm this account has role: admin.",
  };
  return messages[code] ?? (error instanceof Error ? error.message : "Something went wrong. Try again.");
}
