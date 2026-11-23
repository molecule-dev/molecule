// @vitest-environment jsdom
/**
 * The markdown conformance cases every `@molecule/app-markdown` provider passes, run against this
 * provider: the same DOM and the same table of contents as every other markdown bond.
 */
import { runMarkdownConformance } from '@molecule/app-framework-conformance/markdown'

import { createProvider } from '../index.js'

runMarkdownConformance('react-markdown', () => createProvider())
