import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap, type KitKeyboardEvent } from '@molecule/app-ui'
import { Box, Pressable } from '@molecule/app-ui-react/elements'

/** Props for the {@link TagChip} component. */
export interface TagChipProps {
  /** Visible tag text. */
  children: ReactNode
  /** Optional remove callback — renders an `×` button when provided. */
  onRemove?: () => void
  /**
   * Optional click callback for the chip body. Fired by mouse click and, for
   * keyboard users, by Enter / Space on the focused chip body. When
   * `onRemove` is also set, the body action moves onto a native button
   * around the label text (a chip holding two controls cannot itself be a
   * button), so mouse users click the same label surface as before.
   */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * Small labeled chip with an optional close button. Used inside
 * `<TagInput>` but also usable standalone as a label display element.
 *
 * The chip body action is keyboard-operable. With no remove button the chip
 * itself is the control: `role="button"`, tabbable, and Enter / Space fire
 * `onClick`. With a remove button the action lives on a native button
 * around the label text instead, since a button may not contain another
 * control — the native button carries its own Enter / Space activation.
 * @param props - Component props (see {@link TagChipProps}).
 */
export function TagChip({ children, onRemove, onClick, className }: TagChipProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  const chipClass = cm.cn(
    cm.flex({ align: 'center', gap: 'xs' }),
    cm.sp('px', 2),
    cm.sp('py', 1),
    cm.textSize('xs'),
    cm.fontWeight('medium'),
    cm.roundedFull,
    className,
  )

  /**
   * Keyboard activation for the chip body — the same handler the mouse
   * click runs. `preventDefault()` suppresses Space's page scroll and
   * Enter's form submission when a chip sits inside a form.
   * @param e - The kit keyboard event.
   */
  const handleBodyKeyDown = (e: KitKeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    onClick?.()
  }

  // No remove control inside — the chip is the whole control, so it carries
  // the button role, a tab stop, and the keyboard path for its click.
  if (onClick && !onRemove) {
    return (
      <Pressable
        as="span"
        className={cm.cn(chipClass, cm.cursorPointer)}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleBodyKeyDown}
      >
        <Box as="span">{children}</Box>
      </Pressable>
    )
  }

  // A remove button shares the chip, so the container is not a control —
  // the body action moves onto a native button around the label text
  // (native button chrome reset inline, so it looks as the text did)
  // and the remove button stands beside it as a sibling.
  return (
    <Box as="span" className={chipClass}>
      {onClick ? (
        <Pressable
          as="button"
          type="button"
          onClick={onClick}
          /* mol-bespoke-button: the chip's label is its body control, not a CTA —
             the inline background/border/padding/font/color are native resets so
             it reads as the label text under any ClassMap bond. */
          className={cm.cursorPointer}
          webStyle={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            font: 'inherit',
            color: 'inherit',
          }}
        >
          <Box as="span">{children}</Box>
        </Pressable>
      ) : (
        <Box as="span">{children}</Box>
      )}
      {onRemove && (
        <Pressable
          as="button"
          type="button"
          onClick={onRemove}
          aria-label={t('tagChip.remove', {}, { defaultValue: 'Remove' })}
          className={cm.cn(cm.w(4), cm.h(4), cm.flex({ align: 'center', justify: 'center' }))}
        >
          {t('tagChip.removeGlyph', undefined, { defaultValue: '×' })}
        </Pressable>
      )}
    </Box>
  )
}
