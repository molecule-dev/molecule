import type { JSX, ReactNode } from 'react'

import { useOptimisticValue } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Card, type OptimisticToggleButtonProps } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

import { ListingCardActions } from './ListingCardActions.js'

/** A server-backed card action with the total number of people who selected it. */
export interface ListingCardToggleProps extends Omit<
  OptimisticToggleButtonProps,
  'value' | 'commit'
> {
  /** The pressed state and count from the same loaded record. */
  value: { pressed: boolean; count: number }
  /** Saves the desired state and returns the server-confirmed state and count together. */
  commit: (desired: boolean) => Promise<ListingCardToggleProps['value']>
  /** Overrides the button's default `data-mol-id`. */
  dataMolId?: string
}

/** Props for {@link ListingCard}. */
export interface ListingCardProps {
  /** Slots — usually `<ListingCardMedia>` + `<ListingCardBody>` + `<ListingCardActions>`. */
  children: ReactNode
  /** Renders a counted native toggle after the content, outside any links in the content. */
  toggle?: ListingCardToggleProps
  /**
   * Called on any click on the card — including clicks inside
   * `<ListingCardActions>`, which bubble into it unless the action handler
   * calls `e.stopPropagation()`.
   */
  onClick?: () => void
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Shows both fields of a card action and saves the person's latest selection.
 *
 * @param props - Loaded value, save function, labels and button props.
 * @returns The card action row.
 */
function ListingCardToggle({
  value,
  commit,
  onError,
  activeLabel,
  inactiveLabel,
  dataMolId = 'listing-card-toggle',
  variant,
  ...buttonProps
}: ListingCardToggleProps): JSX.Element {
  const toggle = useOptimisticValue({
    value,
    commit: (next) => commit(next.pressed),
    onError: (error) => onError?.(error),
  })
  const { pressed, count } = toggle.value

  return (
    <ListingCardActions>
      <Button
        data-mol-id={dataMolId}
        {...buttonProps}
        type="button"
        variant={variant ?? (pressed ? 'solid' : 'outline')}
        aria-pressed={pressed}
        aria-busy={toggle.pending}
        onClick={(event) => {
          event.stopPropagation()
          toggle.update((current) => ({
            pressed: !current.pressed,
            count: Math.max(0, current.count + (current.pressed ? -1 : 1)),
          }))
        }}
      >
        {pressed ? activeLabel : inactiveLabel} <Text as="span">{count}</Text>
      </Button>
    </ListingCardActions>
  )
}

/**
 * Product / property / listing card shell. Just a `<Card>` with vertical
 * stacking of its children — typically `<ListingCardMedia>` +
 * `<ListingCardBody>` + `<ListingCardActions>`.
 *
 * Use for product tiles, property cards, course cards, listings,
 * and similar content-card layouts.
 *
 * @param props - Component props (see {@link ListingCardProps}).
 * @example
 * ```tsx
 * <ListingCard>
 *   <ListingCardMedia src={product.image} aspect="4/3" />
 *   <ListingCardBody
 *     title={product.name}
 *     subtitle={product.category}
 *     price={`$${product.price}`}
 *     meta={<StatusPill kind="success">In stock</StatusPill>}
 *   />
 *   <ListingCardActions>
 *     <Button onClick={addToCart}>Add to cart</Button>
 *   </ListingCardActions>
 * </ListingCard>
 * ```
 */
export function ListingCard({
  children,
  toggle,
  onClick,
  className,
  dataMolId,
}: ListingCardProps): JSX.Element {
  const cm = getClassMap()
  return (
    <Card
      data-mol-id={dataMolId}
      onClick={onClick}
      className={cm.cn(onClick ? cm.cursorPointer : undefined, className)}
    >
      <Box as="div" className={cm.stack(0 as const)}>
        {children}
        {toggle && <ListingCardToggle {...toggle} />}
      </Box>
    </Card>
  )
}
