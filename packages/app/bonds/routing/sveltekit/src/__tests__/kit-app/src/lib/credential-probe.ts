/**
 * The hand-off the credential cases make to the page that consumes the one-time query
 * parameter: the page calls the bond's `useConsumedSearchParam` and publishes the value
 * and setter here (on `window`, so the case's module instance and the started app's fresh
 * one agree on the same object), and the case reads and drives them through this handle.
 *
 * @module
 */

/** What a case reads and drives on the mounted credential consumer. */
export interface CredentialProbe {
  /** The consumed value, `''` before the parameter was ever present. */
  value(): string
  /** Replaces the retained value (a form clears it after a successful submit). */
  set(value: string): void
}

declare global {
  interface Window {
    /** The handle the started app's credential page published. */
    __moleculeCredentialProbe?: CredentialProbe
  }
}

/**
 * Publishes the mounted consumer's value and setter for the running case.
 *
 * @param probe - The page's readers and its setter.
 */
export const publishCredentialProbe = (probe: CredentialProbe): void => {
  window.__moleculeCredentialProbe = probe
}

/**
 * The handle the started app's credential page published.
 *
 * @returns The handle.
 * @throws {Error} When no credential page has mounted.
 */
export const credentialProbe = (): CredentialProbe => {
  const probe = window.__moleculeCredentialProbe
  if (!probe) throw new Error('no credential page is mounted')
  return probe
}
