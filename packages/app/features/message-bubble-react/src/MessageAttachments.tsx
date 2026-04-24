import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export interface MessageAttachment {
  id: string
  name: string
  /** Size label (e.g. "2.3 MB"). */
  size?: string
  /** Action slot — typically a download button. */
  action?: React.ReactNode
  /** Optional leading icon. */
  icon?: React.ReactNode
}

interface MessageAttachmentsProps {
  attachments: MessageAttachment[]
  /** Extra classes on the outer wrapper. */
  className?: string
}

/**
 * Vertical list of attachment rows below a message body.
 * Each row: `[icon] [name · size] [action]`.
 * @param root0
 * @param root0.attachments
 * @param root0.className
 */
export function MessageAttachments({ attachments, className }: MessageAttachmentsProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.stack(1 as const), className)}>
      {attachments.map((a) => (
        <div key={a.id} className={cm.flex({ align: 'center', gap: 'sm' })}>
          {a.icon}
          <span className={cm.cn(cm.flex1, cm.textSize('sm'))}>
            <span className={cm.fontWeight('medium')}>{a.name}</span>
            {a.size && <span className={cm.sp('ml', 2)}>{a.size}</span>}
          </span>
          {a.action}
        </div>
      ))}
    </div>
  )
}
