/**
 * Pagination component for React Native.
 *
 * @module
 */

import React from 'react'
import { Pressable, Text, View } from 'react-native'

import { t } from '@molecule/app-i18n'
import type { PaginationProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders a Pagination component.
 * @param root0 - Component props.
 * @param root0.page - Current page number.
 * @param root0.totalPages - Total number of pages.
 * @param root0.onChange - Page change handler.
 * @param root0.siblings - Visible sibling pages.
 * @param root0.boundaries - Boundary page count.
 * @param root0.size - Pagination size.
 * @param root0.showFirstLast - Show first/last buttons.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Pagination element.
 */
export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  onChange,
  siblings = 1,
  boundaries = 1,
  size = 'md',
  showFirstLast,
  className,
  testId,
}) => {
  const cm = getClassMap()

  const range = (start: number, end: number): number[] =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i)

  const buildPaginationRange = (): (number | 'ellipsis')[] => {
    const total = totalPages
    const sibling = siblings
    const boundary = boundaries

    const leftBoundary = range(1, Math.min(boundary, total))
    const rightBoundary = range(Math.max(total - boundary + 1, boundary + 1), total)

    const siblingsStart = Math.max(
      Math.min(page - sibling, total - boundary - sibling * 2 - 1),
      boundary + 2,
    )
    const siblingsEnd = Math.min(
      Math.max(page + sibling, boundary + sibling * 2 + 2),
      total - boundary - 1,
    )

    const items: (number | 'ellipsis')[] = []

    items.push(...leftBoundary)
    if (siblingsStart > boundary + 2) items.push('ellipsis')
    else if (boundary + 1 < siblingsStart) items.push(boundary + 1)

    items.push(...range(siblingsStart, siblingsEnd))

    if (siblingsEnd < total - boundary - 1) items.push('ellipsis')
    else if (total - boundary > siblingsEnd) items.push(total - boundary)

    items.push(...rightBoundary)
    return [...new Set(items)]
  }

  const pages = buildPaginationRange()

  return (
    <View
      className={cm.cn(cm.paginationRoot, className)}
      testID={testId}
      accessibilityRole="toolbar"
      accessibilityLabel={t('ui.pagination.nav', undefined, { defaultValue: 'Pagination' })}
    >
      <View className={cm.paginationContent}>
        {showFirstLast && (
          <Pressable
            className={cm.paginationPrevious}
            onPress={() => onChange?.(1)}
            disabled={page <= 1}
            accessibilityLabel={t('ui.pagination.first', undefined, { defaultValue: 'First' })}
          >
            <Text>{t('ui.icon.chevronsLeft', undefined, { defaultValue: '«' })}</Text>
          </Pressable>
        )}
        <Pressable
          className={cm.paginationPrevious}
          onPress={() => onChange?.(page - 1)}
          disabled={page <= 1}
          accessibilityLabel={t('ui.pagination.previous', undefined, { defaultValue: 'Previous' })}
        >
          <Text>{t('ui.icon.chevronLeft', undefined, { defaultValue: '‹' })}</Text>
        </Pressable>

        {pages.map((item, i) =>
          item === 'ellipsis' ? (
            <View key={`ellipsis-${i}`} className={cm.paginationEllipsis}>
              <Text>{t('ui.icon.ellipsis', undefined, { defaultValue: '…' })}</Text>
            </View>
          ) : (
            <Pressable
              key={item}
              className={cm.cn(cm.paginationLink, cm.pagination({ active: item === page, size }))}
              onPress={() => onChange?.(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: item === page }}
              accessibilityLabel={t(
                'ui.pagination.goToPage',
                { page: String(item) },
                { defaultValue: `Page ${item}` },
              )}
            >
              <Text>{item}</Text>
            </Pressable>
          ),
        )}

        <Pressable
          className={cm.paginationNext}
          onPress={() => onChange?.(page + 1)}
          disabled={page >= totalPages}
          accessibilityLabel={t('ui.pagination.next', undefined, { defaultValue: 'Next' })}
        >
          <Text>{t('ui.icon.chevronRight', undefined, { defaultValue: '›' })}</Text>
        </Pressable>
        {showFirstLast && (
          <Pressable
            className={cm.paginationNext}
            onPress={() => onChange?.(totalPages)}
            disabled={page >= totalPages}
            accessibilityLabel={t('ui.pagination.last', undefined, { defaultValue: 'Last' })}
          >
            <Text>{t('ui.icon.chevronsRight', undefined, { defaultValue: '»' })}</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}
