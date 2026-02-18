/**
 * Tabs component.
 *
 * @module
 */

import { type Component, createSignal,For, type JSX, Show, splitProps } from 'solid-js'

import type { TabsProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Tabs component.
 * @param props - The component props.
 * @returns The rendered component element.
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

  const cm = getClassMap()
  const [internalValue, setInternalValue] = createSignal(
    local.defaultValue || local.items[0]?.value,
  )
  const activeValue = (): string | undefined => (local.value !== undefined ? local.value : internalValue())

  const handleTabClick = (tabValue: string): void => {
    if (local.value === undefined) {
      setInternalValue(tabValue)
    }
    local.onChange?.(tabValue)
  }

  const activeItem = (): (typeof local.items)[number] | undefined => local.items.find((item) => item.value === activeValue())

  return (
    <div class={local.className} style={local.style} data-testid={local.testId}>
      <div class={cm.cn(cm.tabsList, local.fitted && cm.tabsFitted)} role="tablist">
        <For each={local.items}>
          {(item) => {
            const isActive = (): boolean => item.value === activeValue()
            return (
              <button
                type="button"
                role="tab"
                aria-selected={isActive()}
                aria-controls={`tabpanel-${item.value}`}
                data-state={isActive() ? 'active' : 'inactive'}
                disabled={item.disabled}
                onClick={() => handleTabClick(item.value)}
                class={cm.cn(cm.tabsTrigger, local.fitted && cm.tabTriggerFitted)}
              >
                <Show when={!!item.icon}>
                  <span class={cm.tabTriggerIcon}>{item.icon as JSX.Element}</span>
                </Show>
                {item.label as JSX.Element}
              </button>
            )
          }}
        </For>
      </div>
      <Show when={!!activeItem()?.content}>
        <div
          role="tabpanel"
          id={`tabpanel-${activeValue()}`}
          aria-labelledby={activeValue()}
          class={cm.tabsContent}
        >
          {activeItem()!.content as JSX.Element}
        </div>
      </Show>
    </div>
  )
}
