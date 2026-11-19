/**
 * The module JSDoc quickstarts, compiled as strict TypeScript consumers of the
 * real public packages — React's `module-doc-quickstart.test.ts`, in Angular's
 * idiom: a `@Component` instead of a function component, `[molecule signal
 * reads]` in the template instead of expressions.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Extracts a documented TypeScript example from the module JSDoc.
 *
 * @param marker - Text the wanted example contains.
 * @returns The example's source.
 */
function quickstart(marker: string): string {
  const source = readFileSync(join(import.meta.dirname, '../index.ts'), 'utf8')
  const example = [...source.matchAll(/```typescript\n([\s\S]*?)```/g)]
    .map((match) =>
      match[1]
        .split('\n')
        .map((line) => line.replace(/^\s*\* ?/, ''))
        .join('\n'),
    )
    .find((block) => block.includes(marker))
  expect(example, `The complete example (${marker})`).toBeDefined()
  return example ?? ''
}

/**
 * The Angular form of React's documented FavoriteButton example: the same
 * inputs (an article record and an optional saved-record callback), the same
 * favorite/count commit and the same aria-pressed / aria-label contract, in a
 * component's template instead of JSX.
 *
 * @returns The example's source.
 */
function favoriteButtonExample(): string {
  return `
import { Component, computed, EventEmitter, Output, signal } from '@angular/core'
import { useHttpClient, useOptimisticValue, useTranslation } from '@molecule/app-angular'

interface FavoriteRecord {
  slug: string
  favorited: boolean
  favoritesCount: number
}

interface FavoriteValue {
  favorited: boolean
  count: number
}

@Component({
  selector: 'app-favorite-button',
  template: \`
    <button
      type="button"
      [attr.aria-pressed]="favorite.value().favorited"
      [attr.aria-label]="i18n.t('article.favorite', undefined, { defaultValue: 'Favorite article' })"
      (click)="toggle()"
    >{{ favorite.value().count }}</button>
  \`,
})
export class FavoriteButtonComponent {
  // The loaded record, which the page sets before the button renders. Unlike a
  // React prop (readable when the hook runs), a bound Angular input is not set
  // during construction, where this component's functions must be created, so
  // the record is a signal the control follows.
  readonly article = signal<FavoriteRecord>({ slug: '', favorited: false, favoritesCount: 0 })
  @Output() readonly changed = new EventEmitter<FavoriteRecord>()

  private readonly http = useHttpClient()
  readonly i18n = useTranslation()

  readonly favorite = useOptimisticValue(
    computed(() => {
      const article = this.article()
      return {
        value: { favorited: article.favorited, count: article.favoritesCount },
        commit: async (next: FavoriteValue) => {
          const path = \`/articles/\${encodeURIComponent(article.slug)}/favorite\`
          const response = next.favorited
            ? await this.http.post<{ article: FavoriteRecord }>(path)
            : await this.http.delete<{ article: FavoriteRecord }>(path)
          const saved = response.data.article
          this.changed.emit(saved)
          return { favorited: saved.favorited, count: saved.favoritesCount }
        },
      }
    }),
  )

  toggle(): void {
    this.favorite.update((current) => ({
      favorited: !current.favorited,
      count: current.count + (current.favorited ? -1 : 1),
    }))
  }
}
`
}

/**
 * Compiles an example as a strict TypeScript consumer of the real public
 * packages.
 *
 * @param source - The example's source.
 * @returns The diagnostic messages.
 */
function diagnosticsFor(source: string): string[] {
  const virtualFile = join(import.meta.dirname, '__quickstart-probe__.ts')
  const options: ts.CompilerOptions = {
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    experimentalDecorators: true,
    useDefineForClassFields: false,
    types: [],
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
  }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  const fileExists = host.fileExists.bind(host)
  const readFile = host.readFile.bind(host)
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    fileName === virtualFile
      ? ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TS)
      : getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
  host.fileExists = (fileName) => fileName === virtualFile || fileExists(fileName)
  host.readFile = (fileName) => (fileName === virtualFile ? source : readFile(fileName))
  const program = ts.createProgram([virtualFile], options, host)
  return ts
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.file?.fileName === virtualFile)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

describe('the app-angular module quickstart', () => {
  it('compiles the complete example under strict TypeScript', { timeout: 120_000 }, () => {
    expect(diagnosticsFor(quickstart('class DashboardComponent')).join('\n')).toBe('')
  })

  it(
    'compiles the favorite button and count example against the public hook contract',
    { timeout: 120_000 },
    () => {
      expect(diagnosticsFor(favoriteButtonExample()).join('\n')).toBe('')
    },
  )
})
