/**
 * Configuration types for the Fly Sprites sandbox provider.
 *
 * @module
 */

import type { PolicyRule } from '@fly/sprites'

/**
 * Configuration for the Fly Sprites sandbox provider.
 */
export interface SpritesConfig {
  /**
   * Sprites API token. Falls back to `SPRITE_TOKEN`. Generate one with
   * `sprite org auth` (interactive) or `SpritesClient.createToken()` from a
   * Fly.io macaroon.
   */
  token?: string
  /** Sprites API base URL. Falls back to `SPRITES_API_URL`, then `https://api.sprites.dev`. */
  baseUrl?: string
  /**
   * Prefix for every sprite name this provider owns. Defaults to `mol-`.
   * Listing and adoption are scoped to this prefix, so two deployments sharing
   * one Sprites organization must use distinct prefixes.
   */
  namePrefix?: string
  /**
   * URL auth mode applied to created sprites: `public` (anyone with the URL —
   * required for anonymous browser previews) or `sprite` (Bearer token
   * required). Defaults to `public`.
   */
  urlAuth?: 'public' | 'sprite'
  /** Per-request timeout for Sprites API calls, in ms. Defaults to 30000. */
  requestTimeoutMs?: number
  /**
   * DNS-based egress rules applied to every sprite at creation via the Sprites
   * network Policy API. Unset means NO policy is applied and sprite egress is
   * whatever the platform default allows (observed: unrestricted) —
   * `verifyEgress()` will then report `open`, and molecule.dev's production
   * boot refuses a non-`filtered` verdict. Example:
   * `[{ domain: 'registry.npmjs.org', action: 'allow' }, { domain: 'github.com', action: 'allow' }]`.
   */
  defaultNetworkRules?: PolicyRule[]
  /**
   * Extra hostnames appended to the scaffolded Vite dev server's
   * `VITE_ALLOWED_HOSTS` (written into `/etc/mol/env` at creation).
   * `.sprites.app` is always included — without it Vite 403s every request
   * arriving through the sprite's public URL.
   */
  extraViteAllowedHosts?: string[]
  /**
   * How long `verifyEgress()` waits for a just-applied network policy to
   * propagate before concluding the canary is genuinely reachable. Defaults to
   * 30000ms. A policy is not enforced the instant `updateNetworkPolicy`
   * returns, so a one-shot canary probe can race propagation and falsely
   * report `open` (observed in production). Tests set this to 0.
   */
  egressPropagationMs?: number
}
