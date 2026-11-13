<!-- Spacer: a sized empty block (or inline block) for whitespace control. -->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { SpacerProps } from '../types.js'

  let { size = 'md', horizontal, className, style, testId, ...rest }: SpacerProps = $props()

  const cm = $derived(getClassMap())
  const namedSizes = ['xs', 'sm', 'md', 'lg', 'xl']
  const isNamedSize = $derived(typeof size === 'string' && namedSizes.includes(size))
  const spacerClasses = $derived(
    cm.cn(
      isNamedSize
        ? cm.spacer({ size: size as 'md', horizontal: !!horizontal })
        : horizontal
          ? cm.displayInlineBlock
          : cm.displayBlock,
      className,
    ),
  )
  const sizeStyle = $derived(
    typeof size === 'number'
      ? horizontal
        ? { width: size, height: '1px' }
        : { height: size, width: '1px' }
      : typeof size === 'string' && !isNamedSize
        ? horizontal
          ? { width: size }
          : { height: size }
        : undefined,
  )
</script>

<div
  class={spacerClasses}
  use:reactStyle={{ ...style, ...sizeStyle }}
  data-testid={testId}
  {...reactAttrs(withoutEvents(rest))}
  use:spreadEvents={rest}
></div>
