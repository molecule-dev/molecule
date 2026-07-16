import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/** Props for the {@link TagChip} component. */
export interface TagChipProps {
  /** Visible tag text. */
  children: ReactNode
  /** Optional remove callback — renders an `×` button when provided. */
  onRemove?: () => void
  /** Optional click callback for the chip body. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * Small labeled chip with an optional close button. Used inside
 * `<TagInput>` but also usable standalone as a label display element.
 * @param props - Component props (see {@link TagChipProps}).
 */
export function TagChip({ children, onRemove, onClick, className }: TagChipProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.sp('px', 2),
        cm.sp('py', 1),
        cm.textSize('xs'),
        cm.fontWeight('medium'),
        cm.roundedFull,
        className,
      )}
      onClick={onClick}
    >
      <span>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label={t('tagChip.remove', {}, { defaultValue: 'Remove' })}
          className={cm.cn(cm.w(4), cm.h(4), cm.flex({ align: 'center', justify: 'center' }))}
        >
          ×
        </button>
      )}
    </span>
  )
}
