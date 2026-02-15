export const BETA_CONSENT_VERSION = "v1";
const CONSENT_KEY = "lt_beta_consent_version";

export function getBetaConsentVersion(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CONSENT_KEY) ?? "";
}

export function hasAcceptedBetaConsent(): boolean {
  return getBetaConsentVersion() === BETA_CONSENT_VERSION;
}

export function acceptBetaConsent(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, BETA_CONSENT_VERSION);
}

export function clearBetaConsent(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CONSENT_KEY);
}
