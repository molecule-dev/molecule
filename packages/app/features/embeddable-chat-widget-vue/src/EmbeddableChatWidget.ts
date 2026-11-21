/**
 * Drop-in floating chat widget for third-party sites. Vue counterpart of
 * `@molecule/app-embeddable-chat-widget`'s `EmbeddableChatWidget` — the same
 * props (React names), the same DOM.
 *
 * @module
 */

import { computed, defineComponent, h, type PropType, ref, type VNode } from 'vue'

import { EmbeddableChatLauncher } from './EmbeddableChatLauncher.js'
import { EmbeddableChatPanel } from './EmbeddableChatPanel.js'
import type { EmbeddableChatWidgetConfig } from './types.js'

/** Props for {@link EmbeddableChatWidget}. */
export interface EmbeddableChatWidgetProps {
  /** Widget configuration. */
  config: EmbeddableChatWidgetConfig
  /** Optional initial expanded state (default: collapsed). */
  defaultOpen?: boolean
}

/**
 * Drop-in floating chat widget for third-party sites. Renders a
 * collapsed launcher in the configured corner; clicking expands a
 * 360x540px panel with a message list, typing indicator, and input.
 *
 * The widget is intentionally self-contained — all geometry, colors,
 * and shadows are inlined so the host site does not need to ship the
 * molecule stylesheet. Pair with `@molecule/app-locales-embeddable-chat-widget`
 * for translations.
 */
export const EmbeddableChatWidget = defineComponent({
  name: 'EmbeddableChatWidget',
  props: {
    config: { type: Object as PropType<EmbeddableChatWidgetConfig>, required: true },
    defaultOpen: { type: Boolean as PropType<boolean | undefined>, default: false },
  },
  setup(props) {
    const open = ref(props.defaultOpen)
    const position = computed(() => props.config.position ?? 'bottom-right')

    return (): VNode[] => [
      h(EmbeddableChatLauncher, {
        visible: !open.value,
        onOpen: () => {
          open.value = true
        },
        position: position.value,
        theme: props.config.theme,
      }),
      h(EmbeddableChatPanel, {
        visible: open.value,
        onClose: () => {
          open.value = false
        },
        position: position.value,
        config: props.config,
      }),
    ]
  },
})
