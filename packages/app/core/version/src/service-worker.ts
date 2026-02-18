import { error } from '@molecule/app-logger'

import type { ServiceWorkerController, VersionEvent, VersionState } from './types.js'

/**
 * Creates a service worker controller.
 *
 * @param updateState - Function to update the version state.
 * @param emit - Function to emit events.
 * @returns The service worker controller.
 */
export const createServiceWorkerController = (
  updateState: (partial: Partial<VersionState>) => void,
  emit: <T>(event: VersionEvent, data: T) => void,
): {
  controller: ServiceWorkerController
  getRegistration: () => ServiceWorkerRegistration | null
} => {
  let registration: ServiceWorkerRegistration | null = null

  const controller: ServiceWorkerController = {
    async register(scriptUrl = '/service-worker.js') {
      if (!('serviceWorker' in navigator)) {
        return null
      }

      try {
        registration = await navigator.serviceWorker.register(scriptUrl)

        registration.addEventListener('updatefound', () => {
          const newWorker = registration?.installing

          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              updateState({ isServiceWorkerWaiting: true })
              emit('service-worker-waiting', { registration })
            }
          })
        })

        // Handle controller change (new SW activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          emit('service-worker-activated', {})
        })

        return registration
      } catch (err) {
        error('Service worker registration failed:', err)
        return null
      }
    },

    async unregister() {
      if (!registration) return false

      try {
        await registration.unregister()
        registration = null
        return true
      } catch {
        return false
      }
    },

    async update() {
      if (registration) {
        await registration.update()
      }
    },

    skipWaiting() {
      const waiting = registration?.waiting
      if (waiting) {
        waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    },

    getRegistration() {
      return registration
    },

    getWaiting() {
      return registration?.waiting || null
    },

    isWaiting() {
      return !!registration?.waiting
    },

    postMessage(message: unknown) {
      navigator.serviceWorker.controller?.postMessage(message)
    },
  }

  return {
    controller,
    getRegistration: () => registration,
  }
}
