/**
 * CSV parsing and formatting utilities.
 *
 * Handles RFC 4180 compliant CSV with proper quoting and escaping.
 *
 * @module
 */

/**
 * Parses a CSV string into an array of row objects using the header row as keys.
 *
 * @param text - The CSV text to parse.
 * @param delimiter - Field delimiter character. Defaults to `','`.
 * @returns Array of parsed row objects keyed by header names.
 */
export const parseCSV = (text: string, delimiter = ','): Record<string, string>[] => {
  const rows = parseRows(text, delimiter)
  if (rows.length === 0) return []

  const headers = rows[0]
  const result: Record<string, string>[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const obj: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] ?? ''
    }
    result.push(obj)
  }

  return result
}

/**
 * Parses CSV text into a 2D array of field values.
 *
 * @param text - The CSV text to parse.
 * @param delimiter - Field delimiter character.
 * @returns 2D array of string values.
 */
const parseRows = (text: string, delimiter: string): string[][] => {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      currentField += char
      i++
      continue
    }

    if (char === '"') {
      inQuotes = true
      i++
      continue
    }

    if (char === delimiter) {
      currentRow.push(currentField)
      currentField = ''
      i++
      continue
    }

    if (char === '\r') {
      if (i + 1 < text.length && text[i + 1] === '\n') {
        i++
      }
      currentRow.push(currentField)
      currentField = ''
      if (currentRow.some((f) => f !== '')) {
        rows.push(currentRow)
      }
      currentRow = []
      i++
      continue
    }

    if (char === '\n') {
      currentRow.push(currentField)
      currentField = ''
      if (currentRow.some((f) => f !== '')) {
        rows.push(currentRow)
      }
      currentRow = []
      i++
      continue
    }

    currentField += char
    i++
  }

  // Final field/row
  currentRow.push(currentField)
  if (currentRow.some((f) => f !== '')) {
    rows.push(currentRow)
  }

  return rows
}

/**
 * Escapes a single CSV field value using RFC 4180 rules.
 *
 * @param value - The value to escape.
 * @param delimiter - The delimiter to watch for.
 * @returns Escaped field string.
 */
const escapeField = (value: unknown, delimiter: string): string => {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Formats an array of row objects into a CSV string.
 *
 * @param rows - Array of row objects to format.
 * @param columns - Optional ordered list of column names. Defaults to all keys of the first row.
 * @param delimiter - Field delimiter character. Defaults to `','`.
 * @returns CSV-formatted string.
 */
export const formatCSV = (
  rows: Record<string, unknown>[],
  columns?: string[],
  delimiter = ',',
): string => {
  if (rows.length === 0) return ''

  const headers = columns ?? Object.keys(rows[0])
  const lines = [headers.map((h) => escapeField(h, delimiter)).join(delimiter)]

  for (const row of rows) {
    const values = headers.map((h) => escapeField(row[h], delimiter))
    lines.push(values.join(delimiter))
  }

  return lines.join('\n')
}

/**
 * Escapes a value for safe inclusion in XML.
 *
 * @param val - The value to escape.
 * @returns XML-safe string.
 */
const escapeXml = (val: unknown): string => {
  const str = val === null || val === undefined ? '' : String(val)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Formats row objects as an XML Spreadsheet 2003 document (opens in Excel/LibreOffice).
 *
 * @param rows - Array of row objects to format.
 * @param columns - Optional ordered list of column names.
 * @returns XML Spreadsheet string.
 */
export const formatExcel = (rows: Record<string, unknown>[], columns?: string[]): string => {
  if (rows.length === 0) {
    return '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Sheet1"><Table></Table></Worksheet></Workbook>'
  }

  const headers = columns ?? Object.keys(rows[0])

  const headerRow = `<Row>${headers.map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}</Row>`

  const dataRows = rows.map((row) => {
    const cells = headers.map((h) => {
      const val = row[h]
      const type = typeof val === 'number' ? 'Number' : 'String'
      return `<Cell><Data ss:Type="${type}">${escapeXml(val)}</Data></Cell>`
    })
    return `<Row>${cells.join('')}</Row>`
  })

  return [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    '<Worksheet ss:Name="Sheet1">',
    '<Table>',
    headerRow,
    ...dataRows,
    '</Table>',
    '</Worksheet>',
    '</Workbook>',
  ].join('\n')
}
