/**
 * Utility functions for MySQL operations.
 *
 * @module
 */

/**
 * Convert PostgreSQL-style positional placeholders ($1, $2, ...) to MySQL-style (?) placeholders.
 * @param text - SQL query text with $N placeholders.
 * @returns The query text with ? placeholders.
 */
export const convertPlaceholders = (text: string): string => {
  return text.replace(/\$(\d+)/g, '?')
}
