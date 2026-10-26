/**
 * Configuration for the in-process uptime provider.
 *
 * @module
 */

/** Options for `createProvider()`. */
export interface UptimeFetchConfig {
  /**
   * Allow probing hosts that resolve to private, loopback or link-local
   * addresses (default `false`). For pointing the probe at your OWN internal
   * targets during development. NEVER enable this on a path that takes a
   * raw user-supplied URL — a verified-public probe cannot be pointed at
   * your own network; an unverified one is an SSRF primitive.
   */
  allowPrivateTargets?: boolean

  /**
   * The `User-Agent` the probe sends (default `molecule-uptime-probe/1.0`).
   * Some sites answer a health-check agent differently; name yourself
   * honestly.
   */
  userAgent?: string

  /**
   * The host resolver the dial decision asks (default: the core's
   * `resolvePublicAddress`, public unicast only). Injection seam for tests —
   * the same pattern the render machine's guard proxy uses for its
   * upstream-failure arms; production never passes it.
   */
  resolve?: (hostname: string) => Promise<{ address: string; family: number } | null>
}
