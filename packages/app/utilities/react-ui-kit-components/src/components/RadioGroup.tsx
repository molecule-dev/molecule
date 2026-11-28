/**
 * RadioGroup component.
 *
 * @module
 */

import { forwardRef, useId } from 'react'

import { useTranslation } from '@molecule/app-react'
import type { ElementHandle, RadioGroupProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { KitComponent, KitHosts } from '../hosts.js'
import { renderNode } from '../utilities/renderNode.js'

/**
 * RadioGroup component.
 */
export function createRadioGroup(
  hosts: Pick<KitHosts, 'Box' | 'CheckField' | 'Text'>,
): KitComponent<RadioGroupProps<string>> {
  const { Box, CheckField, Text } = hosts
  const RadioGroup = forwardRef<ElementHandle, RadioGroupProps<string>>(
    (
      {
        options = [],
        value,
        onChange,
        size: _size,
        label,
        name,
        direction = 'vertical',
        error,
        className,
        style,
        testId,
        automationId,
        disabled,
      },
      ref,
    ) => {
      const { t } = useTranslation()
      const cm = getClassMap()
      // Radios only form a native group (arrow-key navigation, exclusive
      // native checked state) when they share a `name` — and that name must be
      // UNIQUE per group. The old `label`-as-name fallback merged every group
      // sharing a visible label (e.g. two "Size" pickers) into ONE native
      // group: selecting in one silently deselected the other. Callers that
      // need a specific submitted field name pass the `name` prop.
      const generatedName = useId()
      const groupName = name || generatedName
      const errorId = `${groupName}-error`

      const handleChange = (optionValue: string): void => {
        onChange?.(optionValue)
      }

      return (
        <Box
          as="div"
          ref={ref}
          className={className}
          webStyle={style}
          data-testid={testId}
          data-mol-id={automationId}
          role="radiogroup"
          aria-label={label ?? t('ui.radioGroup.label', undefined, { defaultValue: 'Radio group' })}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        >
          {label && (
            <Box as="div" className={cm.cn(cm.label({ required: false }), cm.sp('mb', 2))}>
              {label}
            </Box>
          )}
          <Box as="div" className={cm.radioGroupLayout(direction)}>
            {options.map((item) => {
              const option = typeof item === 'string' ? { value: item, label: item } : item
              const isChecked = value === option.value
              const isDisabled = disabled || option.disabled

              return (
                <Box
                  as="label"
                  key={option.value}
                  className={cm.cn(cm.controlLabel, isDisabled && cm.controlDisabled)}
                >
                  <CheckField
                    as="input"
                    type="radio"
                    name={groupName}
                    value={option.value}
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => handleChange(option.value)}
                    data-state={isChecked ? 'checked' : 'unchecked'}
                    className={cm.cn(cm.radio({ error: !!error }), cm.cursorPointer)}
                  />
                  <Text as="span" className={cm.controlText}>
                    {renderNode(option.label)}
                  </Text>
                </Box>
              )
            })}
          </Box>
          {error && (
            <Text as="p" id={errorId} className={cm.cn(cm.formError, cm.sp('mt', 1))}>
              {error}
            </Text>
          )}
        </Box>
      )
    },
  )

  RadioGroup.displayName = 'RadioGroup'
  return RadioGroup
}
