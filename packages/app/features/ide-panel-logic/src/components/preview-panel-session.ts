/**
 * The preview panel's behaviour as a store, for frameworks without React's hooks.
 *
 * {@link createPreviewPanelSession} runs `usePreviewPanelLogic` (the code the React panel runs)
 * through the headless hooks runtime. A Vue, Svelte, Solid or Angular panel creates one session per
 * mounted panel, passes the framework's `usePreview()` state and actions to `setPreview` whenever
 * they change (the binding already subscribes to the live-preview provider, as React's `usePreview`
 * does, so the session never subscribes a second time), passes its props to `update`, renders from
 * `getState()` (re-reading it when `subscribe` fires), puts its `<iframe>` element in
 * `getState().iframeRef.current`, and wires the handlers the state carries.
 *
 * @module
 */

import { createHeadlessHooksSession } from './headless-hooks.js'
import {
  type PreviewPanelLogic,
  type PreviewPanelLogicProps,
  type PreviewPanelPreview,
  usePreviewPanelLogic,
} from './preview-panel-logic.js'

/** Options for {@link createPreviewPanelSession}. */
export interface PreviewPanelSessionOptions {
  /**
   * The live preview as the framework's `usePreview()` gives it: its state and its actions. Pass
   * actions that stay the same function across updates, as React's `usePreview()` does: the panel's
   * message listener re-binds when `recordNavigation` changes.
   */
  preview: PreviewPanelPreview
  /** The panel's first props. */
  props?: PreviewPanelLogicProps
}

/** One mounted preview panel's behaviour (see {@link createPreviewPanelSession}). */
export interface PreviewPanelSession {
  /**
   * The panel's current state and handlers. Handlers apply their updates before they return.
   * @returns The latest state.
   */
  getState(): PreviewPanelLogic
  /**
   * Listens for a new state.
   * @param listener - Called after each change.
   * @returns Stops listening.
   */
  subscribe(listener: () => void): () => void
  /**
   * Passes the panel's latest props (call it whenever they change).
   * @param props - The props.
   */
  update(props: PreviewPanelLogicProps): void
  /**
   * Passes the live preview's latest state and actions (call it whenever `usePreview()` changes).
   * @param preview - The state and actions.
   */
  setPreview(preview: PreviewPanelPreview): void
  /**
   * Mounts the panel: starts its timers and listeners.
   * @returns Unmounts it, stopping all of them.
   */
  connect(): () => void
}

/**
 * Creates one preview panel's behaviour over the framework's live preview (see the module docs).
 *
 * @param options - The live preview and the first props.
 * @returns The session.
 */
export function createPreviewPanelSession(
  options: PreviewPanelSessionOptions,
): PreviewPanelSession {
  let preview = options.preview
  let props: PreviewPanelLogicProps = options.props ?? {}
  const session = createHeadlessHooksSession((hooks) => usePreviewPanelLogic(hooks, preview, props))
  return {
    getState: () => session.getState(),
    subscribe: (listener) => session.subscribe(listener),
    update(next: PreviewPanelLogicProps): void {
      props = next
      session.rerender()
    },
    setPreview(next: PreviewPanelPreview): void {
      preview = next
      session.rerender()
    },
    connect: () => session.connect(),
  }
}
