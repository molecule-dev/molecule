/**
 * Modal component for React Native.
 *
 * @module
 */

import React from 'react'
import { Modal as RNModal, Pressable, ScrollView, Text, View } from 'react-native'

import { t } from '@molecule/app-i18n'
import type { ModalProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders a Modal component.
 * @param root0 - Component props.
 * @param root0.children - Modal body content.
 * @param root0.open - Whether open.
 * @param root0.onClose - Close handler.
 * @param root0.title - Modal title text.
 * @param root0.size - Modal size.
 * @param root0.footer - Footer content.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Modal element.
 */
export const Modal: React.FC<ModalProps> = ({
  children,
  open,
  onClose,
  title,
  size = 'md',
  footer,
  className,
  testId,
}) => {
  const cm = getClassMap()
  const contentClasses = cm.cn(cm.modal({ size }), className)

  return (
    <RNModal
      visible={!!open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testId}
    >
      <Pressable className={cm.dialogOverlay} onPress={onClose} accessibilityRole="none">
        <View className={cm.dialogWrapper}>
          <Pressable className={contentClasses} onPress={(e) => e.stopPropagation()}>
            <View className={cm.dialogHeader}>
              {!!title && <Text className={cm.dialogTitle}>{title as React.ReactNode}</Text>}
              <Pressable
                className={cm.dialogClose}
                onPress={onClose}
                accessibilityLabel={t('ui.modal.close', undefined, { defaultValue: 'Close' })}
                accessibilityRole="button"
              >
                <Text>{t('ui.icon.close', undefined, { defaultValue: '✕' })}</Text>
              </Pressable>
            </View>
            <ScrollView className={cm.dialogBody}>{children as React.ReactNode}</ScrollView>
            {!!footer && <View className={cm.dialogFooter}>{footer as React.ReactNode}</View>}
          </Pressable>
        </View>
      </Pressable>
    </RNModal>
  )
}
