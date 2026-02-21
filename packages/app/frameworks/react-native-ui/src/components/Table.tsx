/**
 * Table component for React Native.
 *
 * Uses FlatList for performant scrollable tables instead of HTML table elements.
 *
 * @module
 */

import React from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'

import { t } from '@molecule/app-i18n'
import type { TableProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { Spinner } from './Spinner.js'

/**
 * Renders a Table component.
 * @param root0 - Component props.
 * @param root0.columns - Column definitions.
 * @param root0.data - Table row data.
 * @param root0.rowKey - Row key accessor.
 * @param root0.onRowClick - Row click handler.
 * @param root0.striped - Whether striped rows.
 * @param root0.bordered - Whether bordered.
 * @param root0.hoverable - Whether rows hoverable.
 * @param root0.loading - Whether loading.
 * @param root0.emptyContent - Empty state message.
 * @param root0.sort - Active sort state.
 * @param root0.onSort - Sort handler.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Table element.
 */
export const Table: React.FC<TableProps<Record<string, unknown>>> = ({
  columns = [],
  data = [],
  rowKey,
  onRowClick,
  striped,
  bordered,
  hoverable,
  loading,
  emptyContent: emptyMessage,
  sort,
  onSort,
  className,
  testId,
}) => {
  const cm = getClassMap()

  const getRowKey = (row: Record<string, unknown>, index: number): string => {
    if (typeof rowKey === 'function') return String(rowKey(row))
    if (typeof rowKey === 'string' && row[rowKey] !== undefined) return String(row[rowKey])
    return String(index)
  }

  return (
    <View
      className={cm.cn(cm.tableWrapper, bordered && cm.tableBordered, className)}
      testID={testId}
    >
      {/* Header */}
      <View className={cm.cn(cm.tableHeader, cm.tableRow)}>
        {columns.map((col) => (
          <Pressable
            key={String(col.key)}
            className={cm.cn(cm.tableHead, col.sortable && cm.tableHeadSortable)}
            onPress={() =>
              col.sortable &&
              onSort &&
              onSort(
                String(col.key),
                sort?.key === String(col.key) && sort?.direction === 'asc' ? 'desc' : 'asc',
              )
            }
            disabled={!col.sortable}
          >
            <Text>{col.header as React.ReactNode}</Text>
            {col.sortable && sort?.key === String(col.key) && (
              <Text className={cm.tableSortIcon}>
                {sort.direction === 'asc'
                  ? t('ui.icon.sortAsc', undefined, { defaultValue: '↑' })
                  : t('ui.icon.sortDesc', undefined, { defaultValue: '↓' })}
              </Text>
            )}
          </Pressable>
        ))}
      </View>

      {/* Loading overlay */}
      {loading && (
        <View className={cm.tableLoadingOverlay}>
          <Spinner size="md" />
        </View>
      )}

      {/* Body */}
      {data.length === 0 && !loading ? (
        <View className={cm.tableEmptyCell}>
          <Text className={cm.textMuted}>
            {(emptyMessage as React.ReactNode) ||
              t('ui.table.empty', undefined, { defaultValue: 'No data' })}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, index) => getRowKey(item as Record<string, unknown>, index)}
          renderItem={({ item, index }) => {
            const row = item as Record<string, unknown>
            return (
              <Pressable
                className={cm.cn(
                  cm.tableRow,
                  striped && index % 2 === 1 && cm.tableRowStriped,
                  hoverable && cm.tableRowHoverable,
                  onRowClick && cm.tableRowClickable,
                )}
                onPress={() => onRowClick?.(row, index)}
                disabled={!onRowClick}
              >
                {columns.map((col) => {
                  const cellValue = row[col.key as string]
                  const rendered = col.render ? col.render(cellValue, row, index) : cellValue

                  return (
                    <View key={String(col.key)} className={cm.tableCell}>
                      <Text>{rendered as React.ReactNode}</Text>
                    </View>
                  )
                })}
              </Pressable>
            )
          }}
        />
      )}
    </View>
  )
}
