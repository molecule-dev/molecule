/**
 * File chooser control for React Native.
 *
 * @module
 */

import { forwardRef, type ReactNode, useImperativeHandle, useLayoutEffect, useRef } from 'react'

import { getProvider } from '@molecule/app-file-picker'
import { filterPickedFiles } from '@molecule/app-filesystem'
import { useT } from '@molecule/app-react'
import type { FileFieldHandle, FileFieldProps } from '@molecule/app-ui'

import { registeredKind, registerInline } from './flow.js'
import { Pressable } from './Pressable.js'

/**
 * Reports a picker failure the same way as the browser field.
 *
 * @param error - The underlying picker or selection error.
 * @param onPickError - The current consumer error handler.
 */
function reportPickError(error: unknown, onPickError: FileFieldProps['onPickError']): void {
  if (!onPickError) throw error
  onPickError(error instanceof Error ? error : new Error(String(error), { cause: error }))
}

/**
 * Opens the bonded device picker from its browse target or the caller's `pick()` handle.
 */
export const FileField = forwardRef<FileFieldHandle, FileFieldProps<ReactNode>>(
  function FileField(props, ref) {
    const {
      accept,
      children,
      disabled,
      externalTrigger,
      maxSize,
      multiple,
      onPickError,
      onRejected,
      onValueChange,
      role = 'button',
      tabIndex,
      ...attrs
    } = props
    const t = useT()
    const latest = useRef({
      accept,
      disabled,
      maxSize,
      multiple,
      onPickError,
      onRejected,
      onValueChange,
    })
    const pending = useRef<{ discard: boolean } | null>(null)

    useLayoutEffect(() => {
      latest.current = {
        accept,
        disabled,
        maxSize,
        multiple,
        onPickError,
        onRejected,
        onValueChange,
      }
      if (disabled && pending.current) pending.current.discard = true
    }, [accept, disabled, maxSize, multiple, onPickError, onRejected, onValueChange])
    useLayoutEffect(
      () => () => {
        if (pending.current) pending.current.discard = true
      },
      [],
    )

    /** Starts at most one request for this pressable and delivers it to the current render. */
    function open(): void {
      const options = latest.current
      if (options.disabled || pending.current) return

      const picker = getProvider()
      if (!picker) {
        const message = t(
          'ui.fileField.error.missingProvider',
          { bond: '@molecule/app-file-picker-expo', core: '@molecule/app-file-picker' },
          {
            defaultValue:
              'No file picker is bonded. Import `provider` from {{bond}} and call `setProvider(provider)` from {{core}} in `setupProviders()`.',
          },
        )
        reportPickError(new Error(message), options.onPickError)
        return
      }

      const request = { discard: false }
      pending.current = request

      const pick = async (): Promise<void> => {
        let selection
        try {
          const files = await picker.pickFiles({
            accept: options.accept,
            multiple: options.multiple,
            includeRejected: true,
          })
          if (request.discard) return
          selection = filterPickedFiles(files, latest.current)
        } catch (error) {
          if (!request.discard) reportPickError(error, latest.current.onPickError)
          return
        } finally {
          pending.current = null
        }
        const { onValueChange, onRejected } = latest.current
        if (selection.accepted.length) onValueChange(selection.accepted)
        if (selection.rejected.length) onRejected?.(selection.rejected)
      }

      void pick().catch((error: unknown) => {
        // Pressable has a void event handler. Raise an exception on the host after the await.
        queueMicrotask(() => {
          throw error
        })
      })
    }

    useImperativeHandle(ref, () => ({ pick: open }))
    if (externalTrigger) return null

    return (
      <Pressable
        as="div"
        role={role}
        data-mol-id="file-field"
        {...attrs}
        aria-label={
          attrs['aria-label'] ??
          t('ui.fileField.browse', undefined, { defaultValue: 'Browse files' })
        }
        aria-disabled={disabled}
        disabled={disabled}
        tabIndex={tabIndex ?? (disabled ? -1 : 0)}
        onClick={open}
      >
        {children}
      </Pressable>
    )
  },
)

registerInline(FileField, (props) => registeredKind(Pressable, { ...props, as: 'div' }) ?? null)
