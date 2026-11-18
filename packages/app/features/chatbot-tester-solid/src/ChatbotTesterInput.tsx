/**
 * Solid composer input row with a send button: Enter sends, Shift+Enter
 * inserts a newline, and the field follows the controlled `value` prop the way
 * react-dom restores it after every edit.
 *
 * Solid counterpart of `@molecule/app-chatbot-tester-react`'s
 * `ChatbotTesterInput` — the same props (React names) and the same DOM for the
 * same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { ChatbotTesterInputProps } from './types.js'

/**
 * Message composer + send button.
 *
 * @param props - Component props (see {@link ChatbotTesterInputProps}).
 * @returns The rendered composer row.
 */
export const ChatbotTesterInput: Component<ChatbotTesterInputProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /**
   * Reports the edit, then restores the controlled value exactly as
   * react-dom does after a controlled input's change event.
   *
   * @param event - The native input event.
   */
  const handleInput = (event: Event): void => {
    const field = event.target as HTMLTextAreaElement
    props.onChange(field.value)
    if (field.value !== props.value) field.value = props.value
  }

  /**
   * Enter sends; Shift+Enter is left to the browser (a newline).
   *
   * @param event - The native keydown event.
   */
  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      props.onSend()
    }
  }

  return (
    <div
      class={cm.cn(
        cm.flex({ align: 'end', gap: 2 }),
        cm.sp('px', 6),
        cm.sp('py', 4),
        cm.chatbotTesterInputRow,
      )}
    >
      <textarea
        rows={1}
        placeholder={
          props.placeholder === undefined
            ? t('chatbotTester.placeholder.message', undefined, { defaultValue: 'Type a message…' })
            : props.placeholder
        }
        disabled={props.loading}
        class={cm.cn(
          cm.flex1,
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.surface,
          cm.chatbotTesterInputField,
        )}
        value={props.value}
        onInput={handleInput}
        onKeyDown={handleKeydown}
      />
      <button
        type="button"
        data-mol-id="chatbot-tester-send"
        onClick={(event) => {
          // React's DOM handler passes the click event, as `onClick={onSend}` does.
          ;(props.onSend as (event?: MouseEvent) => void)(event)
        }}
        disabled={Boolean(props.loading) || !props.value.trim()}
        class={cm.cn(
          cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
          cm.touchTargetCompact,
        )}
      >
        {props.sendLabel === undefined
          ? t('chatbotTester.label.send', undefined, { defaultValue: 'Send' })
          : props.sendLabel}
      </button>
    </div>
  )
}
