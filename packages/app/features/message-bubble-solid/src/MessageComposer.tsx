import { type Component, createEffect, createSignal, type JSX } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Textarea } from '@molecule/app-ui-solid'

import type { MessageComposerProps } from './types.js'

/**
 * Message input row — text area + optional leading/trailing slots + submit
 * button.
 *
 * The composer submits on the Send button or Ctrl/Cmd+Enter (`submitOnEnter`),
 * NOT plain Enter; it trims and clears on submit and blocks empty sends.
 *
 * This is the Solid counterpart of `@molecule/app-message-bubble-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @param props - Component props (see {@link MessageComposerProps}).
 * @returns The rendered message composer.
 */
export const MessageComposer: Component<MessageComposerProps> = (props): JSX.Element => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [value, setValue] = createSignal('')
  let root: HTMLDivElement | undefined

  // React writes a controlled textarea's `value` property on every render.
  // The UI package's `value` covers the attribute; this effect covers the
  // property, so a cleared field reads the same (as the fleet's own ports do).
  createEffect(() => {
    const current = value()
    const field = root?.querySelector('textarea')
    if (field && field.value !== current) field.value = current
  })

  /** Trims the current value and calls onSubmit, then resets the textarea. */
  const submit = (): void => {
    const current = value().trim()
    if (!current) return
    props.onSubmit(current)
    setValue('')
  }

  return (
    <div
      ref={(element) => {
        root = element
      }}
      class={cm.cn(cm.flex({ align: 'end', gap: 'sm' }), cm.sp('p', 2), props.className)}
    >
      {props.leading}
      <Textarea
        value={value()}
        onChange={(event) => setValue((event.target as HTMLTextAreaElement).value)}
        placeholder={
          props.placeholder ?? t('composer.placeholder', {}, { defaultValue: 'Write a message…' })
        }
        disabled={props.disabled}
        onKeyDown={(event) => {
          if (
            (props.submitOnEnter ?? true) &&
            event.key === 'Enter' &&
            (event.metaKey || event.ctrlKey)
          ) {
            event.preventDefault()
            submit()
          }
        }}
        className={cm.flex1}
      />
      {props.trailing}
      <Button onClick={submit} disabled={props.disabled || !value().trim()}>
        {t('composer.send', {}, { defaultValue: 'Send' })}
      </Button>
    </div>
  )
}
