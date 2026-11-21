/**
 * Props for the Vue `PlanUpdated` page — the same props (React names)
 * `@molecule/app-plan-updated-page-react` accepts.
 *
 * @module
 */

/**
 * Props for {@link PlanUpdated}. All optional — defaults reproduce the
 * original hardcoded copy, so existing `<PlanUpdated />` usages are unchanged.
 */
export interface PlanUpdatedProps {
  /** i18n key for the confirmation message. */
  messageKey?: string
  /** Default confirmation message when the key is missing. */
  messageDefault?: string
  /** i18n key for the thank-you line. */
  thankYouKey?: string
  /** Default thank-you line when the key is missing. */
  thankYouDefault?: string
  /** i18n key for the return-home action label. */
  actionKey?: string
  /** Default action label when the key is missing. */
  actionDefault?: string
  /** Href the return-home action navigates to. Defaults to `/`. */
  actionHref?: string
  /**
   * Provider name to verify the purchase with when the return URL carries no
   * `provider` parameter (older checkout sessions). Verification is skipped
   * when neither names one.
   */
  provider?: string
  /**
   * Set `false` to render the confirmation without verifying the purchase —
   * only for apps that grant the plan some other way (a provider webhook you
   * know is configured, or a manual back-office flow).
   */
  verify?: boolean
}
