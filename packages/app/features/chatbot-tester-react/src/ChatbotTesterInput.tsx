/**
 * Composer input row with send button. Enter sends; shift+enter inserts
 * a newline. Disables the send action while a reply is in flight.
 *
 * @module
 */

import { getClassMap } from '@molecule/app-ui'

interface ChatbotTesterInputProps {
  value: string
  onChange: (next: string) => void
  onSend: () => void
  loading?: boolean
  placeholder?: string
  sendLabel?: string
}

/** Message composer + send button. */
export function ChatbotTesterInput({
  value,
  onChange,
  onSend,
  loading,
  placeholder = 'Type a message…',
  sendLabel = 'Send',
}: ChatbotTesterInputProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'end', gap: 2 }),
        cm.sp('px', 6),
        cm.sp('py', 4),
        'border-t border-outline-variant/20',
      )}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend()
          }
        }}
        rows={1}
        placeholder={placeholder}
        disabled={loading}
        className={cm.cn(
          cm.flex1,
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.surface,
          'border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/40 resize-none disabled:opacity-60',
        )}
      />
      <button
        onClick={onSend}
        disabled={loading || !value.trim()}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'bg-primary text-on-primary rounded-xl disabled:opacity-50',
        )}
      >
        {sendLabel}
      </button>
    </div>
  )
}

export default ChatbotTesterInput
