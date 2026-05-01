/**
 * Provider-label key/default mapping used to localize OAuth button text.
 *
 * @module
 */

import type { OAuthProviderId } from '@molecule/app-oauth-logos-react'

/**
 * Canonical i18n key + English default for each supported provider.
 *
 * Used by `<OAuthButtons />` to render the localized provider name
 * (e.g. `"Continue with {{provider}}"`). The `key` matches the
 * companion locale bond `@molecule/app-locales-oauth-buttons-react`.
 */
export const PROVIDER_LABELS: Readonly<Record<OAuthProviderId, { key: string; default: string }>> =
  Object.freeze({
    github: { key: 'oauthButtons.provider.github', default: 'GitHub' },
    gitlab: { key: 'oauthButtons.provider.gitlab', default: 'GitLab' },
    google: { key: 'oauthButtons.provider.google', default: 'Google' },
    twitter: { key: 'oauthButtons.provider.twitter', default: 'Twitter' },
    x: { key: 'oauthButtons.provider.x', default: 'X' },
    apple: { key: 'oauthButtons.provider.apple', default: 'Apple' },
    facebook: { key: 'oauthButtons.provider.facebook', default: 'Facebook' },
    microsoft: { key: 'oauthButtons.provider.microsoft', default: 'Microsoft' },
    linkedin: { key: 'oauthButtons.provider.linkedin', default: 'LinkedIn' },
    discord: { key: 'oauthButtons.provider.discord', default: 'Discord' },
  })

/**
 * Returns the i18n entry (key + English default) for a given provider id.
 *
 * Falls back to a synthesized entry for unknown ids so unrecognized
 * providers still render with a sensible English label rather than a
 * raw key string.
 *
 * @param provider - Canonical provider id (e.g. `'google'`).
 * @returns Translation key + English default for the provider.
 */
export function getProviderLabel(provider: string): { key: string; default: string } {
  const entry = PROVIDER_LABELS[provider as OAuthProviderId]
  if (entry) return entry
  return {
    key: `oauthButtons.provider.${provider}`,
    default: provider.charAt(0).toUpperCase() + provider.slice(1),
  }
}

/**
 * De-duplicates a provider list while preserving the caller's order.
 *
 * Mirrors how host apps typically pass `providers` derived from
 * `useOAuth(config).providers` plus per-page overrides — duplicates can
 * sneak in via merge-and-pass patterns.
 *
 * @param providers - Raw list (may contain duplicates).
 * @returns Ordered list with duplicates removed.
 */
export function dedupeProviders<T extends string>(providers: readonly T[]): T[] {
  const seen = new Set<T>()
  const out: T[] = []
  for (const p of providers) {
    if (!seen.has(p)) {
      seen.add(p)
      out.push(p)
    }
  }
  return out
}
