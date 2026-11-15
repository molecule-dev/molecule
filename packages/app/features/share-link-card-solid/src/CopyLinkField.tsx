/**
 * Solid internal copy-link field — the trimmed, diverged copy of
 * `@molecule/app-copy-link-field-solid` that `<ShareLinkCard>` renders. It is
 * NOT exported from the package barrel; use `@molecule/app-copy-link-field-solid`
 * for a standalone copy field.
 *
 * @module
 */

import type { Component } from 'solid-js'
import { createSignal, onCleanup } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { CopyLinkFieldProps } from './copy-link-field-types.js'

/**
 * Read-only input paired with a copy button that writes the given URL to the
 * clipboard, showing "Copied!" for 1500ms afterwards.
 *
 * The input's value is written through Solid's `attr:` namespace
 * (`attr:value`), the same way `@molecule/app-ui-solid`'s `Input` does: React
 * carries both the `value` attribute and the live property, and the attribute
 * is the part a plain `value={…}` JSX prop never writes.
 *
 * @param props - Component props (see {@link CopyLinkFieldProps}).
 * @returns The rendered copy-link field.
 */
export const CopyLinkField: Component<CopyLinkFieldProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = createSignal(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  /** Copies the value, then shows the "Copied!" feedback for 1500ms. */
  const copy = (): void => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(props.value).then(() => {
        setCopied(true)
        timer = setTimeout(() => setCopied(false), 1500)
      })
    }
  }

  onCleanup(() => clearTimeout(timer))

  return (
    <div class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), props.className)}>
      <input
        type="text"
        readonly
        attr:value={props.value}
        onFocusIn={(event) => (event.target as HTMLInputElement).select()}
        class={cm.cn(cm.input(), cm.flex1)}
      />
      <Button variant="solid" size="sm" onClick={copy}>
        {copied()
          ? t('copyLink.copied', {}, { defaultValue: 'Copied!' })
          : t('copyLink.copy', {}, { defaultValue: 'Copy' })}
      </Button>
    </div>
  )
}
