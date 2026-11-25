import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** Describes a single file attachment rendered inside a message bubble. */
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

/** Props for {@link MessageAttachments}. */
export interface MessageAttachmentsProps {
  attachments: MessageAttachment[]
  /** Extra classes on the outer wrapper. */
  className?: string
}

/**
 * Vertical list of attachment rows below a message body.
 * Each row: `[icon] [name · size] [action]`.
 * @param props - Component props (see {@link MessageAttachmentsProps}).
 */
export function MessageAttachments({
  attachments,
  className,
}: MessageAttachmentsProps): React.JSX.Element {
  const cm = getClassMap()
  return (
    <Box as="div" className={cm.cn(cm.stack(1 as const), className)}>
      {attachments.map((a) => (
        <Box as="div" key={a.id} className={cm.flex({ align: 'center', gap: 'sm' })}>
          {a.icon}
          <Box as="span" className={cm.cn(cm.flex1, cm.textSize('sm'))}>
            <Text as="span" className={cm.fontWeight('medium')}>
              {a.name}
            </Text>
            {a.size && (
              <Text as="span" className={cm.sp('ml', 2)}>
                {a.size}
              </Text>
            )}
          </Box>
          {a.action}
        </Box>
      ))}
    </Box>
  )
}
