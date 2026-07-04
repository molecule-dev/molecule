import type { Plugin } from 'vite'

/**
 * The push half of the fleet's service worker.
 *
 * The fleet builds its service worker with Workbox `generateSW` (precache +
 * runtime caching) — which ships NO `push` listener, so a delivered web-push
 * used to display nothing. Rather than switching every app to
 * `injectManifest` (a per-app SW source + build-mode change), this plain-JS
 * handler file is emitted next to the build output and pulled into the
 * generated worker via the Workbox `importScripts` option
 * (`workbox.importScripts: [PUSH_SW_FILENAME]` — see `createDefaultViteConfig`).
 * One shared source reaches every app; the generated precache worker is
 * untouched.
 *
 * The handlers understand both payload conventions used by the api senders:
 * the flat `{ title, body, href }` shape (`sports-league`'s proven fan-out
 * and the other template call-sites) and `@molecule/api-push-notifications`'
 * `NotificationPayload` (`{ title, options: { body, icon, data, ... } }`).
 * A non-JSON payload degrades to text-as-title. `notificationclick` focuses
 * an existing window (navigating it to the notification's `href` when one
 * was carried) or opens a new one.
 *
 * The source is executed with `self` as the worker global — it is written as
 * an IIFE over `self` so tests can run the identical bytes against a mock.
 *
 * @module
 */

/** Public filename the push handler is served/emitted under (origin root). */
export const PUSH_SW_FILENAME = 'push-sw.js'

/**
 * Plain-JS source of the push service-worker extension. Kept dependency-free
 * (no Workbox imports) so it can be `importScripts`-ed into the generated
 * worker as-is and unit-tested by evaluating the same source.
 */
export const PUSH_SW_SOURCE = `/**
 * molecule push service-worker extension — imported into the Workbox
 * generateSW output via importScripts (see @molecule/app-vite-config-default).
 * Displays incoming web-push payloads and focuses/opens the app on click.
 */
;(function (self) {
  'use strict'

  /**
   * Normalize the two payload conventions molecule apis send:
   *   { title, body, href }                     — flat (template fan-outs)
   *   { title, options: { body, data, ... } }   — NotificationPayload
   * Returns null when no title can be derived (nothing to show).
   */
  var normalizePushPayload = function (data) {
    if (!data) return null
    var payload = null
    try {
      payload = data.json()
    } catch (_error) {
      // Not JSON — degrade to plain text as the title.
      var text = ''
      try {
        text = data.text()
      } catch (_error2) {
        text = ''
      }
      payload = text ? { title: text } : null
    }
    if (!payload || !payload.title) return null

    var options = Object.assign({}, payload.options || {})
    if (options.body === undefined && typeof payload.body === 'string') {
      options.body = payload.body
    }
    var extra = Object.assign({}, options.data || {})
    if (extra.href === undefined && typeof payload.href === 'string') {
      extra.href = payload.href
    }
    options.data = extra
    return { title: payload.title, options: options }
  }

  self.addEventListener('push', function (event) {
    var notification = normalizePushPayload(event.data)
    if (!notification) return
    event.waitUntil(
      self.registration.showNotification(notification.title, notification.options),
    )
  })

  self.addEventListener('notificationclick', function (event) {
    event.notification.close()
    var data = event.notification.data || {}
    var href = typeof data.href === 'string' && data.href ? data.href : '/'
    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(function (clients) {
          var client = clients && clients.length > 0 ? clients[0] : null
          if (!client) {
            return self.clients.openWindow(href)
          }
          var focused = client.focus()
          // Best-effort deep link; not every focused client can navigate
          // (cross-origin/uncontrolled), and focusing alone is still correct.
          if (href !== '/' && typeof client.navigate === 'function') {
            return Promise.resolve(focused)
              .then(function () {
                return client.navigate(href)
              })
              .catch(function (_error) {
                return client
              })
          }
          return focused
        }),
    )
  })
})(self)
`

/**
 * Vite plugin that ships {@link PUSH_SW_SOURCE} with the app:
 *
 * - build: emits `push-sw.js` into the bundle output (before VitePWA's
 *   `closeBundle` builds the Workbox worker that `importScripts` it);
 * - dev/preview server: serves `/push-sw.js` directly (dev builds run no
 *   service worker, but the file stays inspectable and preview servers of
 *   older builds keep working).
 *
 * @returns The configured Vite plugin.
 */
export function moleculePushServiceWorkerPlugin(): Plugin {
  const serve = (res: {
    setHeader: (name: string, value: string) => void
    end: (body: string) => void
  }): void => {
    res.setHeader('Content-Type', 'text/javascript')
    res.setHeader('Cache-Control', 'no-cache')
    res.end(PUSH_SW_SOURCE)
  }
  return {
    name: 'molecule:push-sw',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: PUSH_SW_FILENAME, source: PUSH_SW_SOURCE })
    },
    configureServer(server) {
      server.middlewares.use(`/${PUSH_SW_FILENAME}`, (_req, res) => serve(res))
    },
    configurePreviewServer(server) {
      server.middlewares.use(`/${PUSH_SW_FILENAME}`, (_req, res) => serve(res))
    },
  }
}
