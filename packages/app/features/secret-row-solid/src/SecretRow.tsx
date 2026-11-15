import { type Component, createSignal, onCleanup, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { SecretRowProps } from './types.js'

/**
 * Secret / credential row for vault UIs. Masked by default; the user toggles
 * reveal, can copy to clipboard, sees an "Expired" tag when
 * `daysUntilRotation` is negative or a "Rotate in {n}d" countdown when it is
 * zero/positive, and a "Last rotated {value}" note when `lastRotatedAt` is
 * set. The Rotate / Delete buttons render only when their handler is passed.
 *
 * Copying uses `navigator.clipboard`, which exists only in secure contexts —
 * elsewhere the Copy button silently does nothing, exactly like React.
 *
 * This is the Solid counterpart of `@molecule/app-secret-row-react`: the same
 * props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @param props - Component props (see {@link SecretRowProps}).
 * @returns The rendered secret row.
 */
export const SecretRow: Component<SecretRowProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [revealed, setRevealed] = createSignal(false)
  const [copied, setCopied] = createSignal(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  /** The mask shown while the value is hidden (8–24 mask characters). */
  const masked = (): string =>
    (props.maskChar === undefined ? '•' : props.maskChar).repeat(
      Math.max(8, Math.min(props.secret.value.length, 24)),
    )

  /** Copies the value, then shows the "Copied!" feedback for 1.5 s. */
  const copy = (): void => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(props.secret.value).then(() => {
        setCopied(true)
        timer = setTimeout(() => setCopied(false), 1500)
      })
    }
  }

  onCleanup(() => clearTimeout(timer))

  /** Whether the rotation chip is the "Expired" tag (a negative countdown). */
  const expired = (): boolean =>
    props.secret.daysUntilRotation !== undefined && props.secret.daysUntilRotation < 0

  return (
    <div class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('py', 2), props.className)}>
      <div class={cm.cn(cm.flex1, cm.stack(0))}>
        <span class={cm.cn(cm.fontWeight('semibold'))}>{props.secret.key}</span>
        {props.secret.description ? (
          <span class={cm.textSize('xs')}>{props.secret.description}</span>
        ) : (
          props.secret.description
        )}
      </div>
      <code class={cm.cn(cm.sp('px', 2), cm.sp('py', 1), cm.textSize('xs'))}>
        {revealed() ? props.secret.value : masked()}
      </code>
      {props.secret.version ? (
        <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          v{props.secret.version}
        </span>
      ) : (
        // `{version && <span>…</span>}` renders the value itself when falsy but
        // renderable (the number `0`), and nothing for an empty string.
        props.secret.version
      )}
      <Show when={expired()}>
        <span
          class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
          // React sets the color through the CSSOM, which serializes `#ef4444`
          // as `rgb(239, 68, 68)`; Solid's compiler writes a static style
          // object verbatim, so the same serialized declaration is used here.
          style={{ color: 'rgb(239, 68, 68)' }}
        >
          {t('secretRow.expired', {}, { defaultValue: 'Expired' })}
        </span>
      </Show>
      <Show
        when={props.secret.daysUntilRotation !== undefined && props.secret.daysUntilRotation >= 0}
      >
        <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          {t(
            'secretRow.rotateIn',
            { days: props.secret.daysUntilRotation ?? 0 },
            { defaultValue: 'Rotate in {{days}}d' },
          )}
        </span>
      </Show>
      <Show when={props.secret.lastRotatedAt !== undefined && props.secret.lastRotatedAt !== null}>
        <span class={cm.cn(cm.textSize('xs'), cm.textMuted)}>
          {t('secretRow.lastRotated', {}, { defaultValue: 'Last rotated' })}{' '}
          {props.secret.lastRotatedAt}
        </span>
      </Show>
      <Button variant="ghost" size="sm" onClick={() => setRevealed((x) => !x)}>
        {revealed()
          ? t('secretRow.hide', {}, { defaultValue: 'Hide' })
          : t('secretRow.show', {}, { defaultValue: 'Show' })}
      </Button>
      <Button variant="ghost" size="sm" onClick={copy}>
        {copied()
          ? t('secretRow.copied', {}, { defaultValue: 'Copied!' })
          : t('secretRow.copy', {}, { defaultValue: 'Copy' })}
      </Button>
      <Show when={props.onRotate}>
        <Button variant="ghost" size="sm" onClick={() => props.onRotate?.(props.secret)}>
          {t('secretRow.rotate', {}, { defaultValue: 'Rotate' })}
        </Button>
      </Show>
      <Show when={props.onDelete}>
        <Button
          variant="ghost"
          size="sm"
          color="error"
          onClick={() => props.onDelete?.(props.secret)}
        >
          {t('secretRow.delete', {}, { defaultValue: 'Delete' })}
        </Button>
      </Show>
    </div>
  )
}
