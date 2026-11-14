import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'
import { Container } from '@molecule/app-ui-solid'

import type { AppShellLayoutProps } from './types.js'

/**
 * Top-level page scaffold: header → main (constrained by Container) → footer.
 *
 * The page frame uses ClassMap tokens (`cm.page`, `cm.appLayout`) so the
 * styling library can be swapped without touching consumers. The header and
 * footer are slot props so consumers retain full control over branding,
 * navigation, and footer copy.
 *
 * This is the Solid counterpart of `@molecule/app-shell-layout-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link AppShellLayoutProps}).
 * @returns The rendered shell layout.
 */
export const AppShellLayout: Component<AppShellLayoutProps> = (props) => {
  const cm = getClassMap()
  const maxWidth = (): string => props.maxWidth ?? 'xl'
  return (
    <div class={cm.cn(cm.page, cm.appLayout, props.className)} data-mol-id={props.dataMolId}>
      {props.header}
      <main class={props.mainClassName}>
        <Container maxWidth={maxWidth()}>{props.children}</Container>
      </main>
      {props.footer}
    </div>
  )
}
