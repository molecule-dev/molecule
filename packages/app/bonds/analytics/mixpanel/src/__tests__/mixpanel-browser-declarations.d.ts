// The part of the mixpanel-browser API these tests drive that the SDK's
// bundled index.d.ts does not declare, verified against the mixpanel-browser
// 2.84.0 runtime sources: MixpanelLib.prototype.init_batchers /
// start_batch_senders / stop_batch_senders and the request_batchers map live in
// src/mixpanel-core.js, and track_marketing is a default config option there.
// Augmenting the exported Mixpanel and Config interfaces keeps the members in
// the SDK's own shape. An `await import('mixpanel-browser')` in these ESM tests
// types its default export as the module namespace, where only the d.ts's
// named exports are visible — so the tests hold the initialized instance
// through the SDK's own `loaded` callback (declared as `Mixpanel` itself)
// instead of the namespace. Types only: no runtime effect.

declare module 'mixpanel-browser' {
  /** In-memory queue behind one request batcher; tests assert its length. */
  interface MixpanelBatcherQueue {
    memQueue: unknown[]
  }

  /** One SDK request batcher (events / people / groups). */
  interface MixpanelRequestBatcher {
    flush(options?: { unloading?: boolean }): Promise<void>
    queue: MixpanelBatcherQueue
  }

  interface Mixpanel {
    /** Batching pipelines created at init; batch_requests defaults to true. */
    request_batchers: {
      events: MixpanelRequestBatcher
      people: MixpanelRequestBatcher
      groups: MixpanelRequestBatcher
    }

    /** Create the request batchers without starting their senders. */
    init_batchers(): void

    /** Start the senders for the batchers created by init_batchers. */
    start_batch_senders(): void

    /** Stop the batch senders; flush pending queues manually afterwards. */
    stop_batch_senders(): void
  }

  interface Config {
    /**
     * Attach utm/referrer marketing properties to tracked events.
     *
     * @default true
     */
    track_marketing?: boolean
  }
}

// Makes this file a module, so the block above AUGMENTS the resolved SDK
// declaration instead of shadowing it as an ambient module (which would drop
// every export the SDK's own index.d.ts declares).
export {}
