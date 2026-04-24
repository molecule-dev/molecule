import type { ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Textarea } from '@molecule/app-ui-react'

interface MessageComposerProps {
  /** Called when the user submits. */
  onSubmit: (value: string) => void
  /** Optional placeholder. */
  placeholder?: string
  /** Whether Ctrl/Cmd-Enter submits. Defaults to true. */
  submitOnEnter?: boolean
  /** Optional leading slot (e.g. attachment button). */
  leading?: ReactNode
  /** Optional trailing slot rendered before the submit button. */
  trailing?: ReactNode
  /** Disable input + submit. */
  disabled?: boolean
  /** Extra classes. */
  className?: string
}

/**
 * Message input row — text area + optional leading/trailing slots + submit button.
 * @param root0
 * @param root0.onSubmit
 * @param root0.placeholder
 * @param root0.submitOnEnter
 * @param root0.leading
 * @param root0.trailing
 * @param root0.disabled
 * @param root0.className
 */
export function MessageComposer({
  onSubmit,
  placeholder,
  submitOnEnter = true,
  leading,
  trailing,
  disabled,
  className,
}: MessageComposerProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [value, setValue] = useState('')

  /**
   *
   */
  function submit() {
    const v = value.trim()
    if (!v) return
    onSubmit(v)
    setValue('')
  }

  return (
    <div className={cm.cn(cm.flex({ align: 'end', gap: 'sm' }), cm.sp('p', 2), className)}>
      {leading}
      <Textarea
        value={value}
        onChange={(e) => setValue((e.target as HTMLTextAreaElement).value)}
        placeholder={
          placeholder ?? t('composer.placeholder', {}, { defaultValue: 'Write a message…' })
        }
        disabled={disabled}
        onKeyDown={(e) => {
          if (submitOnEnter && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            submit()
          }
        }}
        className={cm.flex1}
      />
      {trailing}
      <Button onClick={submit} disabled={disabled || !value.trim()}>
        {t('composer.send', {}, { defaultValue: 'Send' })}
      </Button>
    </div>
  )
}
