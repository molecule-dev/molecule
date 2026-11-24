import { type Component, For } from 'solid-js'

import { PresentWhileNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { AppShellFooterProps } from './types.js'

/**
 * Bottom page footer shell. All content is optional — apps mix and match
 * logo / copyright / links / right-slot as the design demands.
 *
 * This is the Solid counterpart of `@molecule/app-nav-chrome-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link AppShellFooterProps}).
 * @returns The rendered footer.
 */
export const AppShellFooter: Component<AppShellFooterProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()
  const links = (): NonNullable<AppShellFooterProps['links']> => props.links ?? []
  /** The links nav region's accessible name (locale-reactive). */
  const navLabel = (): string => t('navChrome.aria.footer', undefined, { defaultValue: 'Footer' })

  return (
    <footer
      class={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
        cm.sp('px', 4),
        cm.sp('py', 4),
        props.className,
      )}
    >
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        {props.logo}
        <PresentWhileNode node={props.copyright}>
          {(copyright) => <span class={cm.textSize('xs')}>{copyright()}</span>}
        </PresentWhileNode>
      </div>
      {links().length > 0 && (
        <nav aria-label={navLabel()} class={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
          <For each={links()}>
            {(l) => (
              <a href={l.to ?? '#'} class={cm.cn(cm.textSize('sm'), cm.link)}>
                {l.label}
              </a>
            )}
          </For>
        </nav>
      )}
      {props.right}
    </footer>
  )
}
