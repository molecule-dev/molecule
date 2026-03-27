import { describe, expect, it } from 'vitest'

import {
  buildAggregateCountSQL,
  buildAggregateSQL,
  buildFilterClause,
  buildMeasureAliasMap,
  buildMeasureExpression,
  buildOrderByClause,
  buildTimeSeriesSQL,
  sanitizeIdentifier,
} from '../query-builder.js'

describe('query-builder', () => {
  describe('sanitizeIdentifier', () => {
    it('should allow alphanumeric and underscores', () => {
      expect(sanitizeIdentifier('valid_name_123')).toBe('valid_name_123')
    })

    it('should replace invalid characters with underscores', () => {
      expect(sanitizeIdentifier('drop; table--')).toBe('drop__table__')
    })

    it('should handle empty string', () => {
      expect(sanitizeIdentifier('')).toBe('')
    })
  })

  describe('buildMeasureExpression', () => {
    it('should build COUNT(*)', () => {
      const expr = buildMeasureExpression({ field: '*', function: 'count' })
      expect(expr).toBe('COUNT(*) AS "__count"')
    })

    it('should build COUNT(field)', () => {
      const expr = buildMeasureExpression({ field: 'id', function: 'count' })
      expect(expr).toBe('COUNT("id") AS "id_count"')
    })

    it('should build COUNT(DISTINCT field)', () => {
      const expr = buildMeasureExpression({ field: 'user_id', function: 'countDistinct' })
      expect(expr).toBe('COUNT(DISTINCT "user_id") AS "user_id_countDistinct"')
    })

    it('should build SUM with alias', () => {
      const expr = buildMeasureExpression({
        field: 'revenue',
        function: 'sum',
        alias: 'total_revenue',
      })
      expect(expr).toBe('SUM("revenue") AS "total_revenue"')
    })

    it('should build AVG', () => {
      const expr = buildMeasureExpression({ field: 'price', function: 'avg' })
      expect(expr).toBe('AVG("price") AS "price_avg"')
    })

    it('should build MIN', () => {
      const expr = buildMeasureExpression({ field: 'price', function: 'min' })
      expect(expr).toBe('MIN("price") AS "price_min"')
    })

    it('should build MAX', () => {
      const expr = buildMeasureExpression({ field: 'price', function: 'max' })
      expect(expr).toBe('MAX("price") AS "price_max"')
    })
  })

  describe('buildMeasureAliasMap', () => {
    it('should map alias to aggregate expression', () => {
      const map = buildMeasureAliasMap([{ field: 'revenue', function: 'sum', alias: 'total' }])
      expect(map.get('total')).toBe('SUM("revenue")')
    })

    it('should use default alias when none specified', () => {
      const map = buildMeasureAliasMap([{ field: 'id', function: 'count' }])
      expect(map.get('id_count')).toBe('COUNT("id")')
    })

    it('should handle COUNT(*)', () => {
      const map = buildMeasureAliasMap([{ field: '*', function: 'count', alias: 'total' }])
      expect(map.get('total')).toBe('COUNT(*)')
    })

    it('should handle all aggregate functions', () => {
      const map = buildMeasureAliasMap([
        { field: 'a', function: 'count' },
        { field: 'b', function: 'countDistinct' },
        { field: 'c', function: 'sum' },
        { field: 'd', function: 'avg' },
        { field: 'e', function: 'min' },
        { field: 'f', function: 'max' },
      ])
      expect(map.get('a_count')).toBe('COUNT("a")')
      expect(map.get('b_countDistinct')).toBe('COUNT(DISTINCT "b")')
      expect(map.get('c_sum')).toBe('SUM("c")')
      expect(map.get('d_avg')).toBe('AVG("d")')
      expect(map.get('e_min')).toBe('MIN("e")')
      expect(map.get('f_max')).toBe('MAX("f")')
    })
  })

  describe('buildFilterClause', () => {
    it('should build eq filter', () => {
      const result = buildFilterClause([{ field: 'status', operator: 'eq', value: 'active' }], 1)
      expect(result.clause).toBe('"status" = $1')
      expect(result.params).toEqual(['active'])
      expect(result.nextOffset).toBe(2)
    })

    it('should build neq filter', () => {
      const result = buildFilterClause([{ field: 'status', operator: 'neq', value: 'deleted' }], 1)
      expect(result.clause).toBe('"status" != $1')
    })

    it('should build gt and lt filters', () => {
      const result = buildFilterClause(
        [
          { field: 'age', operator: 'gt', value: 17 },
          { field: 'age', operator: 'lt', value: 65 },
        ],
        1,
      )
      expect(result.clause).toBe('"age" > $1 AND "age" < $2')
      expect(result.params).toEqual([17, 65])
    })

    it('should build gte and lte filters', () => {
      const result = buildFilterClause(
        [
          { field: 'age', operator: 'gte', value: 18 },
          { field: 'age', operator: 'lte', value: 64 },
        ],
        1,
      )
      expect(result.clause).toBe('"age" >= $1 AND "age" <= $2')
      expect(result.params).toEqual([18, 64])
    })

    it('should build IN filter', () => {
      const result = buildFilterClause(
        [{ field: 'category', operator: 'in', value: ['A', 'B', 'C'] }],
        1,
      )
      expect(result.clause).toBe('"category" IN ($1, $2, $3)')
      expect(result.params).toEqual(['A', 'B', 'C'])
      expect(result.nextOffset).toBe(4)
    })

    it('should build NOT IN filter', () => {
      const result = buildFilterClause(
        [{ field: 'status', operator: 'notIn', value: ['deleted', 'archived'] }],
        1,
      )
      expect(result.clause).toBe('"status" NOT IN ($1, $2)')
      expect(result.params).toEqual(['deleted', 'archived'])
    })

    it('should build BETWEEN filter', () => {
      const result = buildFilterClause(
        [{ field: 'price', operator: 'between', value: [10, 100] }],
        1,
      )
      expect(result.clause).toBe('"price" BETWEEN $1 AND $2')
      expect(result.params).toEqual([10, 100])
      expect(result.nextOffset).toBe(3)
    })

    it('should build LIKE filter', () => {
      const result = buildFilterClause([{ field: 'name', operator: 'like', value: '%widget%' }], 1)
      expect(result.clause).toBe('"name" LIKE $1')
      expect(result.params).toEqual(['%widget%'])
    })

    it('should combine multiple filters with AND', () => {
      const result = buildFilterClause(
        [
          { field: 'status', operator: 'eq', value: 'active' },
          { field: 'age', operator: 'gte', value: 18 },
        ],
        1,
      )
      expect(result.clause).toBe('"status" = $1 AND "age" >= $2')
    })

    it('should respect param offset', () => {
      const result = buildFilterClause([{ field: 'x', operator: 'eq', value: 1 }], 5)
      expect(result.clause).toBe('"x" = $5')
      expect(result.nextOffset).toBe(6)
    })

    it('should resolve aliases via aliasMap for HAVING', () => {
      const aliasMap = new Map([['total_revenue', 'SUM("revenue")']])
      const result = buildFilterClause(
        [{ field: 'total_revenue', operator: 'gt', value: 1000 }],
        1,
        aliasMap,
      )
      expect(result.clause).toBe('SUM("revenue") > $1')
      expect(result.params).toEqual([1000])
    })

    it('should fall back to column name when alias not in map', () => {
      const aliasMap = new Map([['other', 'COUNT(*)']])
      const result = buildFilterClause(
        [{ field: 'status', operator: 'eq', value: 'active' }],
        1,
        aliasMap,
      )
      expect(result.clause).toBe('"status" = $1')
    })
  })

  describe('buildOrderByClause', () => {
    it('should build ASC ordering', () => {
      expect(buildOrderByClause([{ field: 'name', direction: 'asc' }])).toBe('"name" ASC')
    })

    it('should build DESC ordering', () => {
      expect(buildOrderByClause([{ field: 'created_at', direction: 'desc' }])).toBe(
        '"created_at" DESC',
      )
    })

    it('should combine multiple orderings', () => {
      expect(
        buildOrderByClause([
          { field: 'category', direction: 'asc' },
          { field: 'sales', direction: 'desc' },
        ]),
      ).toBe('"category" ASC, "sales" DESC')
    })
  })

  describe('buildAggregateSQL', () => {
    it('should build a simple count query', () => {
      const result = buildAggregateSQL(
        { table: 'orders', measures: [{ field: '*', function: 'count' }] },
        10000,
      )
      expect(result.sql).toContain('SELECT COUNT(*)')
      expect(result.sql).toContain('FROM "orders"')
      expect(result.sql).toContain('LIMIT')
    })

    it('should include dimensions in SELECT and GROUP BY', () => {
      const result = buildAggregateSQL(
        {
          table: 'orders',
          measures: [{ field: 'revenue', function: 'sum', alias: 'total' }],
          dimensions: ['category', 'status'],
        },
        10000,
      )
      expect(result.sql).toContain('"category", "status"')
      expect(result.sql).toContain('GROUP BY "category", "status"')
    })

    it('should include WHERE clause for filters', () => {
      const result = buildAggregateSQL(
        {
          table: 'orders',
          measures: [{ field: '*', function: 'count' }],
          filters: [{ field: 'status', operator: 'eq', value: 'completed' }],
        },
        10000,
      )
      expect(result.sql).toContain('WHERE "status" = $1')
      expect(result.params[0]).toBe('completed')
    })

    it('should include HAVING clause with alias resolution', () => {
      const result = buildAggregateSQL(
        {
          table: 'orders',
          measures: [{ field: 'revenue', function: 'sum', alias: 'total' }],
          dimensions: ['category'],
          having: [{ field: 'total', operator: 'gt', value: 1000 }],
        },
        10000,
      )
      expect(result.sql).toContain('HAVING SUM("revenue") > $')
    })

    it('should include ORDER BY clause', () => {
      const result = buildAggregateSQL(
        {
          table: 'orders',
          measures: [{ field: '*', function: 'count' }],
          orderBy: [{ field: 'count', direction: 'desc' }],
        },
        10000,
      )
      expect(result.sql).toContain('ORDER BY "count" DESC')
    })

    it('should use provided limit', () => {
      const result = buildAggregateSQL(
        {
          table: 'orders',
          measures: [{ field: '*', function: 'count' }],
          limit: 50,
        },
        10000,
      )
      expect(result.params).toContain(50)
    })

    it('should use maxRows as default limit', () => {
      const result = buildAggregateSQL(
        { table: 'orders', measures: [{ field: '*', function: 'count' }] },
        5000,
      )
      expect(result.params).toContain(5000)
    })
  })

  describe('buildAggregateCountSQL', () => {
    it('should build a simple count', () => {
      const result = buildAggregateCountSQL({
        table: 'orders',
        measures: [{ field: '*', function: 'count' }],
      })
      expect(result.sql).toContain('SELECT COUNT(*) AS "total" FROM "orders"')
    })

    it('should wrap grouped queries in a subquery', () => {
      const result = buildAggregateCountSQL({
        table: 'orders',
        measures: [{ field: '*', function: 'count' }],
        dimensions: ['status'],
      })
      expect(result.sql).toContain('SELECT COUNT(*) AS "total" FROM (')
      expect(result.sql).toContain('GROUP BY "status"')
      expect(result.sql).toContain(') AS _counted')
    })

    it('should include filters in count query', () => {
      const result = buildAggregateCountSQL({
        table: 'orders',
        measures: [{ field: '*', function: 'count' }],
        filters: [{ field: 'active', operator: 'eq', value: true }],
      })
      expect(result.sql).toContain('WHERE "active" = $1')
      expect(result.params).toEqual([true])
    })

    it('should include HAVING in grouped count subquery', () => {
      const result = buildAggregateCountSQL({
        table: 'orders',
        measures: [{ field: 'revenue', function: 'sum', alias: 'total' }],
        dimensions: ['category'],
        having: [{ field: 'total', operator: 'gt', value: 500 }],
      })
      expect(result.sql).toContain('HAVING')
      expect(result.sql).toContain('SUM("revenue")')
    })
  })

  describe('buildTimeSeriesSQL', () => {
    it('should build a basic time-series query', () => {
      const result = buildTimeSeriesSQL({
        table: 'orders',
        dateField: 'created_at',
        interval: 'day',
        measures: [{ field: '*', function: 'count' }],
      })
      expect(result.sql).toContain('date_trunc(\'day\', "created_at")')
      expect(result.sql).toContain('GROUP BY "date"')
      expect(result.sql).toContain('ORDER BY "date" ASC')
    })

    it('should handle all intervals', () => {
      for (const interval of ['hour', 'day', 'week', 'month', 'year'] as const) {
        const result = buildTimeSeriesSQL({
          table: 'events',
          dateField: 'ts',
          interval,
          measures: [{ field: '*', function: 'count' }],
        })
        expect(result.sql).toContain(`date_trunc('${interval}'`)
      }
    })

    it('should include date range filters', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-12-31')

      const result = buildTimeSeriesSQL({
        table: 'orders',
        dateField: 'created_at',
        interval: 'month',
        measures: [{ field: '*', function: 'count' }],
        startDate: start,
        endDate: end,
      })

      expect(result.sql).toContain('"created_at" >= $')
      expect(result.sql).toContain('"created_at" <= $')
      expect(result.params).toContain(start)
      expect(result.params).toContain(end)
    })

    it('should include extra filters alongside date range', () => {
      const result = buildTimeSeriesSQL({
        table: 'orders',
        dateField: 'created_at',
        interval: 'day',
        measures: [{ field: 'revenue', function: 'sum' }],
        filters: [{ field: 'status', operator: 'eq', value: 'completed' }],
        startDate: new Date('2024-01-01'),
      })

      expect(result.sql).toContain('"status" = $1')
      expect(result.sql).toContain('"created_at" >= $2')
      expect(result.params[0]).toBe('completed')
    })
  })
})
