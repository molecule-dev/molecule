import { useState } from 'react'

import { EmbeddableChatLauncher } from './EmbeddableChatLauncher.js'
import { EmbeddableChatPanel } from './EmbeddableChatPanel.js'
import type { EmbeddableChatWidgetConfig } from './types.js'

interface EmbeddableChatWidgetProps {
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
 *
 * @param root0 Component props.
 * @param root0.config Widget configuration.
 * @param root0.defaultOpen Whether the panel starts expanded.
 */
export function EmbeddableChatWidget({ config, defaultOpen = false }: EmbeddableChatWidgetProps) {
  const [open, setOpen] = useState(defaultOpen)
  const position = config.position ?? 'bottom-right'

  return (
    <>
      <EmbeddableChatLauncher
        visible={!open}
        onOpen={() => setOpen(true)}
        position={position}
        theme={config.theme}
      />
      <EmbeddableChatPanel
        visible={open}
        onClose={() => setOpen(false)}
        position={position}
        config={config}
      />
    </>
  )
}
