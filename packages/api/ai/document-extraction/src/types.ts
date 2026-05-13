/** A field to extract from a document. */
export interface ExtractionField {
  /** Field name (becomes a JSON key in the result). */
  name: string
  /** Plain-English description of what to extract. */
  description: string
  /** Expected type — hints to the LLM and validates the result. */
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'
  /** Whether the field is required. Default false. */
  required?: boolean
}

/** Result of a single extraction run. */
export interface ExtractionResult<T = Record<string, unknown>> {
  /** Extracted fields keyed by `field.name`. */
  data: T
  /** AI's confidence per field (0..1). May be partial. */
  confidence?: Partial<Record<keyof T, number>>
  /** Free-form reasoning the AI provided. */
  reasoning?: string
}
