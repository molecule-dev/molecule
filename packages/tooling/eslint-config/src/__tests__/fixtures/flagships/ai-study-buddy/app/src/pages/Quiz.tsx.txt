import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageBody, PageHeader } from '../components/PageHeader.js'

interface QuizQuestion {
  id: string
  position: number
  question: string
  options: string[] | string
  correct_index?: number
  explanation?: string
}

interface QuizPayload {
  id: string
  title: string
  difficulty?: string
  questions: QuizQuestion[]
}

const parseOptions = (raw: string[] | string | null | undefined): string[] => {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch (_error) {
      /* fall through — raw string is not JSON, return [] */
    }
  }
  return []
}

export function Quiz() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [quiz, setQuiz] = useState<QuizPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedByQuestion, setSelectedByQuestion] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    http
      .get<QuizPayload>(`/api/quizzes/${id}`)
      .then((res) => {
        if (cancelled) return
        setQuiz(res.data ?? null)
        setError(null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('quiz.error', {}, { defaultValue: 'Could not load quiz.' }),
        )
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const questions = quiz?.questions ?? []
  const total = questions.length
  const current = total > 0 ? questions[Math.min(questionIndex, total - 1)] : null
  const options = current ? parseOptions(current.options) : []
  const selected = current ? selectedByQuestion[questionIndex] : undefined

  const handleSubmit = async () => {
    if (!quiz || total === 0) return
    setSubmitting(true)
    try {
      const answers = Array.from({ length: total }, (_, i) => selectedByQuestion[i] ?? -1)
      await http.post(`/api/quizzes/${quiz.id}/submit`, { answers })
      // Fire-and-forget funnel event (no-ops without an analytics provider).
      void track({
        name: 'quiz.completed',
        properties: { quizId: quiz.id, total, answered: answers.filter((a) => a !== -1).length },
      })
      navigate(`/quiz/${quiz.id}/results`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('quiz.submitError', {}, { defaultValue: 'Could not submit quiz.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      data-mol-id="page-quiz"
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}
    >
      <PageHeader
        eyebrow={t('quiz.eyebrow', {}, { defaultValue: 'Quiz' })}
        title={quiz?.title ?? t('quiz.title', {}, { defaultValue: 'Practice quiz' })}
        subtitle={
          total > 0
            ? t(
                'quiz.progress',
                { current: questionIndex + 1, total },
                { defaultValue: 'Question {{current}} of {{total}}' },
              )
            : undefined
        }
      />

      <PageBody>
        {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}

        {quiz === null && !error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('quiz.loading', {}, { defaultValue: 'Loading quiz…' })}
          </p>
        ) : total === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              'rounded-3xl border border-dashed border-outline-variant/30',
            )}
          >
            <span
              className={
                'material-symbols-outlined text-5xl mb-3 opacity-50 text-on-surface-variant'
              }
              aria-hidden="true"
            >
              quiz
            </span>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('semibold'),
                'mb-1 text-on-surface',
              )}
            >
              {t('quiz.empty.title', {}, { defaultValue: 'No questions yet' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'serif-text italic text-on-surface-variant')}>
              {t('quiz.empty.body', {}, { defaultValue: 'This quiz has no questions to answer.' })}
            </p>
          </div>
        ) : current ? (
          <>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <div
                className={'h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-highest'}
              >
                <div
                  className={
                    'h-full rounded-full bg-gradient-to-r from-primary to-inverse-primary transition-all'
                  }
                  style={{ width: `${((questionIndex + 1) / total) * 100}%` }}
                />
              </div>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'tabular-nums uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {questionIndex + 1} / {total}
              </span>
            </div>

            <div
              className={cm.cn(
                cm.sp('p', 10),
                cm.maxW('2xl'),
                cm.mxAuto,
                cm.w('full'),
                'rounded-[2rem] bg-surface-container-lowest shadow-ambient',
              )}
            >
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-primary mb-4',
                )}
              >
                {t('quiz.questionLabel', {}, { defaultValue: 'Question' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('2xl'),
                  'serif-text font-bold leading-snug text-on-surface mb-8',
                )}
              >
                {current.question}
              </h2>

              <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                {options.map((opt, i) => {
                  const isSelected = selected === i
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        data-mol-id={`quiz-option-${i}`}
                        disabled={submitted}
                        onClick={() => {
                          setSelectedByQuestion((s) => ({ ...s, [questionIndex]: i }))
                          if (quiz) {
                            void track({
                              name: 'quiz.answered',
                              properties: {
                                quizId: quiz.id,
                                questionIndex,
                                optionIndex: i,
                              },
                            })
                          }
                        }}
                        className={cm.cn(
                          cm.sp('p', 4),
                          cm.flex({ align: 'center', gap: 'sm' }),
                          cm.w('full'),
                          'rounded-2xl border-2 transition-colors text-left',
                          isSelected
                            ? 'border-primary bg-primary-container/15'
                            : 'border-outline-variant/30 bg-surface-container-lowest hover:border-primary/40 hover:bg-primary-container/5',
                        )}
                      >
                        <span
                          className={cm.cn(
                            cm.w(8),
                            cm.h(8),
                            cm.flex({ align: 'center', justify: 'center' }),
                            cm.fontWeight('bold'),
                            cm.textSize('sm'),
                            'rounded-full bg-surface-container-low text-on-surface uppercase',
                          )}
                        >
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('medium'),
                            'flex-1 text-on-surface',
                          )}
                        >
                          {opt}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              <div className={cm.cn(cm.flex({ justify: 'between' }), cm.sp('mt', 8))}>
                <button
                  type="button"
                  disabled={questionIndex === 0}
                  onClick={() => setQuestionIndex((i) => Math.max(0, i - 1))}
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'text-on-surface-variant hover:text-primary disabled:opacity-30 transition-colors',
                  )}
                >
                  <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                    arrow_back
                  </span>
                  {t('quiz.prev', {}, { defaultValue: 'Previous' })}
                </button>
                {questionIndex < total - 1 ? (
                  <button
                    type="button"
                    data-mol-id="quiz-next"
                    disabled={selected == null}
                    onClick={() => setQuestionIndex((i) => Math.min(total - 1, i + 1))}
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 3),
                      cm.fontWeight('semibold'),
                      'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity',
                    )}
                  >
                    {t('quiz.next', {}, { defaultValue: 'Next →' })}
                  </button>
                ) : (
                  <button
                    type="button"
                    data-mol-id="quiz-submit"
                    disabled={selected == null || submitting}
                    onClick={() => {
                      setSubmitted(true)
                      void handleSubmit()
                    }}
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 3),
                      cm.fontWeight('semibold'),
                      'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity',
                    )}
                  >
                    {submitting
                      ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
                      : t('quiz.submit', {}, { defaultValue: 'Submit answers' })}
                  </button>
                )}
              </div>
            </div>

            <div className={cm.cn(cm.flex({ justify: 'end' }))}>
              <Link
                to="/courses"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                  flag
                </span>
                {t('quiz.endQuiz', {}, { defaultValue: 'End quiz' })}
              </Link>
            </div>
          </>
        ) : null}
      </PageBody>
    </div>
  )
}
