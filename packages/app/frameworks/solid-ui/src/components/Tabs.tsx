/**
 * Tabs component.
 *
 * @module
 */

import {
  type Component,
  createSignal,
  createUniqueId,
  For,
  type JSX,
  Show,
  splitProps,
} from 'solid-js'

import type { TabsProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { createKeyedList } from '../utilities/keyedList.js'

/**
 * Renders the Tabs component.
 *
 * Implements the WAI-ARIA APG "automatic activation" tabs pattern: roving
 * tabindex (only the active tab is a Tab stop) with Left/Right/Home/End
 * moving BOTH focus and the active tab, so keyboard users never have to
 * Tab through every trigger to reach the one they want. Disabled tabs are
 * skipped.
 *
 * @param props - The component props.
 * @returns The rendered tabs JSX.
 */
export const Tabs: Component<TabsProps<string>> = (props) => {
  const [local] = splitProps(props, [
    'items',
    'value',
    'defaultValue',
    'onChange',
    'variant',
    'size',
    'fitted',
    'className',
    'style',
    'testId',
  ])

  const [internalValue, setInternalValue] = createSignal<string | undefined>(
    local.defaultValue || local.items[0]?.value,
  )
  const activeValue = (): string | undefined =>
    local.value !== undefined ? local.value : internalValue()

  const cm = getClassMap()
  // Per-instance id prefix: bare `tab-${value}` ids collided whenever two
  // Tabs instances on one page shared a tab value (e.g. both have an
  // "overview" tab) — aria-labelledby/aria-controls then resolved to the
  // OTHER instance's elements.
  const idBase = createUniqueId()
  const tabRefs: Record<string, HTMLButtonElement | null> = {}

  const selectTab = (tabValue: string): void => {
    if (local.value === undefined) {
      setInternalValue(tabValue)
    }
    local.onChange?.(tabValue)
  }

  const handleKeyDown = (event: KeyboardEvent & { currentTarget: HTMLDivElement }): void => {
    const enabled = local.items.filter((item) => !item.disabled)
    if (enabled.length === 0) return
    const currentIndex = enabled.findIndex((item) => item.value === activeValue())

    let nextIndex: number
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % enabled.length
        break
      case 'ArrowLeft':
        nextIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + enabled.length) % enabled.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = enabled.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    const nextValue = enabled[nextIndex].value
    selectTab(nextValue)
    tabRefs[nextValue]?.focus()
  }

  const activeItem = (): (typeof local.items)[number] | undefined =>
    local.items.find((item) => item.value === activeValue())

  // React reconciles the tab buttons by `key={item.value}`: a tab's node
  // survives an items update whose key is unchanged and moves on a reorder.
  // `<For>` keys by object identity, so the render iterates the KEYS and reads
  // each item through the lookup.
  const tabs = createKeyedList(
    () => local.items,
    (item) => item.value,
  )

  return (
    <div class={local.className} style={toStyleProps(local.style)} data-testid={local.testId}>
      <div
        class={cm.cn(
          cm.tabsList({ variant: local.variant, size: local.size }),
          local.fitted && cm.tabsFitted,
        )}
        role="tablist"
        onKeyDown={handleKeyDown}
      >
        <For each={tabs.keys()}>
          {(key) => {
            const item = (): TabsProps<string>['items'][number] => tabs.get(key)!
            const isActive = (): boolean => item().value === activeValue()
            return (
              <button
                ref={(node) => {
                  tabRefs[item().value] = node
                }}
                id={`${idBase}-tab-${item().value}`}
                type="button"
                role="tab"
                aria-selected={isActive()}
                aria-controls={`${idBase}-tabpanel-${item().value}`}
                // The ACTIVE look itself stays a `data-[state=active]` CSS
                // attribute selector baked into `cm.tabsTrigger()`'s output
                // (see core/ui's `TabsClassOptions` doc) — this attribute is
                // what those selectors key off, it is not a class option.
                data-state={isActive() ? 'active' : 'inactive'}
                // Roving tabindex: only the active tab is a Tab stop —
                // arrow keys (handled above) move focus among the rest.
                tabindex={isActive() ? 0 : -1}
                disabled={item().disabled}
                onClick={() => selectTab(item().value)}
                class={cm.cn(
                  cm.tabsTrigger({ variant: local.variant, size: local.size }),
                  local.fitted && cm.tabTriggerFitted,
                )}
              >
                <Show when={item().icon}>
                  <span class={cm.tabTriggerIcon}>{item().icon as JSX.Element}</span>
                </Show>
                {item().label as JSX.Element}
              </button>
            )
          }}
        </For>
      </div>
      <Show when={activeItem()?.content}>
        <div
          role="tabpanel"
          id={`${idBase}-tabpanel-${activeValue()}`}
          aria-labelledby={`${idBase}-tab-${activeValue()}`}
          class={cm.tabsContent({ variant: local.variant, size: local.size })}
        >
          {activeItem()?.content as JSX.Element}
        </div>
      </Show>
    </div>
  )
}
