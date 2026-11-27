/**
 * Resolves native elements' relative URLs against the same public document.
 *
 * @module
 */

import { useEffect, useState } from 'react'

const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i
let publicDocumentUrl: string | undefined

/**
 * Configures the public web document used by relative URLs on a device.
 *
 * @param url - An absolute HTTP(S) document URL, or `undefined` to clear the setting.
 */
export function setPublicDocumentUrl(url: string | undefined): void {
  publicDocumentUrl = url
}

/**
 * Whether a literal URL can be handed to the native platform without a base.
 *
 * @param href - The caller's URL.
 * @returns True for absolute schemes, including data URIs.
 */
export function hasUrlScheme(href: string): boolean {
  return URL_SCHEME.test(href.trim())
}

/**
 * Resolves a relative resource or navigation URL. Absolute values, including data URIs, are
 * returned verbatim.
 *
 * @param href - The caller's URL.
 * @returns The absolute URL, a promise for a relative URL, or undefined without a configured base.
 */
export function resolvePublicDocumentUrl(href: string): string | Promise<string> | undefined {
  if (hasUrlScheme(href)) return href
  const documentUrl = publicDocumentUrl
  if (documentUrl === undefined) return undefined
  return import('react-native-url-polyfill').then((polyfill) => {
    const base = new polyfill.URL(documentUrl)
    if (base.protocol !== 'http:' && base.protocol !== 'https:') {
      throw new TypeError('setPublicDocumentUrl() requires an absolute HTTP(S) document URL.')
    }
    return new polyfill.URL(href, base).href
  })
}

/**
 * Resolves an image source for a native element, dropping a pending result when the URI changes.
 *
 * @param href - The caller's image URI.
 * @param label - The name of the element's image prop for diagnostics.
 * @returns An absolute URI when it is available.
 */
export function useImageSource(href: string, label: string): string | undefined {
  const [resolved, setResolved] = useState<{ href: string; url: string }>()
  const absolute = hasUrlScheme(href)
  useEffect(() => {
    if (!href || absolute) return
    let active = true
    /** Applies the configured URL to the image if it still has this source. */
    async function load(): Promise<void> {
      try {
        const url = await resolvePublicDocumentUrl(href)
        if (!active) return
        if (url === undefined) {
          console.error(
            'Cannot load ' +
              label +
              ' ' +
              JSON.stringify(href) +
              ' without a public document URL. Call setPublicDocumentUrl() at app startup.',
          )
        } else {
          setResolved({ href, url })
        }
      } catch (error) {
        if (active)
          console.error('Could not resolve ' + label + ' ' + JSON.stringify(href) + '.', error)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [absolute, href, label])
  return absolute ? href : resolved?.href === href ? resolved.url : undefined
}
