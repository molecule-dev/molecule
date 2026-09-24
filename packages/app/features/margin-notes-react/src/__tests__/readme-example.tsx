// PostBody.tsx — a post's body with notes beside it, rendered from the post's provenance.json
// (written at build time by @molecule/api-text-provenance) and its section summaries.
import type { JSX } from 'react'

import {
  type MarginNote,
  type MarginNoteKind,
  MarginNotes,
  type MarginNotesBlock,
} from '@molecule/app-margin-notes-react'
import { requireProvider } from '@molecule/app-markdown'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

// One entry of provenance.json's `spans`: a block of the post's markdown, in page order.
export interface PostSpan {
  text: string
  origin: 'human' | 'ai'
  prompt?: string
  model?: string
}

// provenance.json, as the build wrote it.
export interface PostProvenance {
  aiShare: number
  prompts: string[]
  spans: PostSpan[]
}

// The span indexes that start a section: 0 (the lead), then every heading at the post's
// shallowest heading level. Key your summaries by these indexes.
export function sectionStarts(spans: PostSpan[]): number[] {
  const level = (text: string): number => /^(#{1,6})\s/.exec(text)?.[1].length ?? 0
  const top = Math.min(...spans.map((span) => level(span.text) || 7))
  return spans.flatMap((span, i) => (i === 0 || level(span.text) === top ? [i] : []))
}

// summaries: TL;DR text per section, keyed by the section's start index from sectionStarts().
export function PostBody({
  provenance,
  summaries = {},
}: {
  provenance: PostProvenance
  summaries?: Record<number, string>
}): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const markdown = requireProvider()
  const label = cm.cn(cm.textSize('xs'), cm.uppercase, cm.trackingWide, cm.fontWeight('semibold'))
  const starts = new Set(sectionStarts(provenance.spans))
  const notes: MarginNote[] = []
  const promptNoteIds = new Map<string, string>()
  let summaryId: string | undefined

  const blocks: MarginNotesBlock[] = provenance.spans.map((span, i) => {
    if (starts.has(i)) {
      summaryId = summaries[i] ? `summary-${i}` : undefined
      if (summaryId) {
        notes.push({
          id: summaryId,
          kind: 'summary',
          content: (
            <>
              <p className={label}>{t('post.tldr', undefined, { defaultValue: 'TL;DR' })}</p>
              <p>{summaries[i]}</p>
            </>
          ),
        })
      }
    }
    const noteIds = summaryId ? [summaryId] : []
    if (span.origin === 'ai' && span.prompt) {
      let id = promptNoteIds.get(span.prompt)
      if (!id) {
        id = `prompt-${promptNoteIds.size}`
        promptNoteIds.set(span.prompt, id)
        notes.push({
          id,
          kind: 'prompt',
          content: (
            <>
              <p className={cm.cn(label, cm.textPrimary)}>
                {t(
                  'post.promptBy',
                  { model: span.model ?? '' },
                  { defaultValue: 'Prompt · {{model}}' },
                )}
              </p>
              <p className={cm.textPrimary}>{span.prompt}</p>
            </>
          ),
        })
      }
      noteIds.push(id)
    }
    return {
      id: `block-${i}`,
      content: <div dangerouslySetInnerHTML={{ __html: markdown.render(span.text).html }} />,
      noteIds,
      marked: span.origin === 'ai',
    }
  })

  const kinds: MarginNoteKind[] = [
    {
      id: 'summary',
      label: t('post.summaries', undefined, { defaultValue: 'Summaries' }),
      defaultOn: true,
    },
    {
      id: 'prompt',
      label: t('post.prompts', undefined, { defaultValue: 'Prompts' }),
      defaultOn: false,
      panel: 'tap',
    },
  ]
  const percent = Math.round(provenance.aiShare * 100)
  const count = provenance.prompts.length
  const share =
    count === 0
      ? t('post.allHuman', undefined, {
          defaultValue: 'Every word of this post was written by a person.',
        })
      : t(
          count === 1 ? 'post.aiShareOne' : 'post.aiShare',
          { percent, count },
          {
            defaultValue:
              count === 1
                ? '{{percent}}% of the words were written by an AI, from 1 prompt'
                : '{{percent}}% of the words were written by an AI, from {{count}} prompts',
          },
        )

  return (
    <div className={cm.prose}>
      <p
        className={cm.cn(cm.textCenter, cm.textMuted, cm.textSize('sm'))}
        data-mol-id="post-ai-share"
      >
        {share}
      </p>
      <MarginNotes
        blocks={blocks}
        notes={notes}
        kinds={kinds}
        markLabel={t('post.aiWritten', undefined, { defaultValue: 'Written with AI' })}
      />
    </div>
  )
}

// In the Post page, in place of the single dangerouslySetInnerHTML body:
// <PostBody provenance={post.provenance} summaries={post.summaries} />
