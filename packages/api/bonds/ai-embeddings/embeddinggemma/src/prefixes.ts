/**
 * EmbeddingGemma 2 task prefixes.
 *
 * The model card lists "suboptimal results without recommended task prefixes"
 * as a limitation, so this bond applies them. The strings are the model's own
 * `config_sentence_transformers.json` prompts (`SearchQuery` →
 * `task: search result | query: `, `Document` → `title: none | text: `, …).
 *
 * @module
 */

import type { EmbeddingInputType, EmbeddingTask } from '@molecule/api-ai-embeddings'

/** The task name the model was trained with, per molecule task. */
const TASK_NAMES: Record<EmbeddingTask, string> = {
  search: 'search result',
  'question-answering': 'question answering',
  'fact-checking': 'fact checking',
  'code-retrieval': 'code retrieval',
  classification: 'classification',
  clustering: 'clustering',
  similarity: 'sentence similarity',
}

/** Tasks where every input takes the same (query-shaped) prefix. */
const SYMMETRIC_TASKS: ReadonlySet<EmbeddingTask> = new Set([
  'classification',
  'clustering',
  'similarity',
])

/** Matches text the caller already prefixed, so it is never prefixed twice. */
const ALREADY_PREFIXED = /^(task|title): /

/**
 * Prefix one text for the given task and side.
 *
 * Asymmetric tasks: a query becomes `task: <task> | query: <text>` and a document
 * `title: none | text: <text>`. Symmetric tasks (classification, clustering,
 * similarity) use the query form for every input.
 *
 * @param text - The raw text.
 * @param task - What the vectors are for.
 * @param inputType - Query or document side.
 * @returns The prefixed text (unchanged if it already carries a prefix).
 */
export function applyTaskPrefix(
  text: string,
  task: EmbeddingTask,
  inputType: EmbeddingInputType,
): string {
  if (ALREADY_PREFIXED.test(text)) return text
  if (inputType === 'query' || SYMMETRIC_TASKS.has(task)) {
    return `task: ${TASK_NAMES[task]} | query: ${text}`
  }
  return `title: none | text: ${text}`
}

/**
 * Whether a string is a supported task name (for env-var parsing).
 *
 * @param value - Candidate task name.
 * @returns `true` if it is an {@link EmbeddingTask}.
 */
export function isEmbeddingTask(value: string): value is EmbeddingTask {
  return Object.hasOwn(TASK_NAMES, value)
}
