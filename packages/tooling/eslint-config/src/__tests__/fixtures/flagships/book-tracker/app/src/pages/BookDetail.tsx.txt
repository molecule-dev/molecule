/** Loaded form fields use the bonded form controller: edit setters mark dirty; fill setters preserve edits. */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useForm, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BookCover } from '../components/BookCover.js'
import { Stars } from '../components/ReviewCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface MyShelf {
  id: string
  shelf: 'want_to_read' | 'reading' | 'read' | 'dnf'
  current_page: number
  started_at: string | null
  finished_at: string | null
  rating: number | null
  review: string | null
  percent: number
}

interface Book {
  id: string
  title: string
  author: string
  page_count: number
  genres: string[]
  cover_style: string
  description: string | null
  my: MyShelf | null
}

interface Session {
  id: string
  date: string
  minutes: number
  pages_read: number
  note: string | null
}

interface MarginNote {
  id: string
  page: number | null
  quote: string
  created_at: string
}

type Shelf = NonNullable<Book['my']>['shelf']

const SHELF_ACTIONS: Shelf[] = ['want_to_read', 'reading', 'read', 'dnf']

const SHELF_TONE: Record<Shelf, string> = {
  reading: 'bg-primary-container text-on-primary-container',
  read: 'bg-success-container text-on-success-container',
  want_to_read: 'bg-secondary-container text-on-secondary-container',
  dnf: 'bg-error-container text-on-error-container',
}

const SHELF_LABEL: Record<Shelf, string> = {
  reading: 'Reading',
  read: 'Read',
  want_to_read: 'Want to read',
  dnf: 'Did not finish',
}

export function BookDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id = '' } = useParams<{ id: string }>()
  const [book, setBook] = useState<Book | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Progress form
  const [page, setPage, fillPage] = useForm({
    defaultValues: { page: '' },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify([id]),
  }).asState('page')
  const [minutes, setMinutes] = useState('')

  // Review form
  const [rating, setRating] = useState<number | null>(null)
  const [review, setReview, fillReview] = useForm({
    defaultValues: { review: '' },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify([id]),
  }).asState('review')
  const [reviewSaved, setReviewSaved] = useState(false)

  // Edit form
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftAuthor, setDraftAuthor] = useState('')
  const [draftPageCount, setDraftPageCount] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  // Destructive delete is two-step: first click arms an inline confirm strip
  // (no modal), second click commits.
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Margin notes — transcribed quotes, stored locally per book (no API yet).
  const [marginNotes, setMarginNotes] = useState<MarginNote[]>([])
  const [marginFormOpen, setMarginFormOpen] = useState(false)
  const [marginPage, setMarginPage] = useState('')
  const [marginQuote, setMarginQuote] = useState('')

  const loadBook = async (): Promise<void> => {
    const res = await http.get(`/books/${id}`)
    const data = unwrapSingle<Book>(res)
    if (!data) return
    setBook(data)
    setRating(data.my?.rating ?? null)
    setReview(data.my?.review ?? '')
    setPage(data.my && data.my.shelf === 'reading' ? String(data.my.current_page) : '')
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([http.get(`/books/${id}`)])
      .then(async ([bookRes]) => {
        if (cancelled) return
        const data = unwrapSingle<Book>(bookRes)
        if (!data) return
        setBook(data)
        setRating(data.my?.rating ?? null)
        fillReview(data.my?.review ?? '')
        fillPage(data.my && data.my.shelf === 'reading' ? String(data.my.current_page) : '')
        if (data.my) {
          const sessRes = await http.get(`/sessions?user_book_id=${data.my.id}`).catch(() => null)
          if (sessRes && !cancelled) setSessions(unwrapList<Session>(sessRes))
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('bookDetail.loadError', {}, { defaultValue: 'Failed to load book.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t, fillReview, fillPage])

  const startEdit = () => {
    if (!book) return
    setDraftTitle(book.title)
    setDraftAuthor(book.author)
    setDraftPageCount(String(book.page_count))
    setEditError(null)
    setEditing(true)
  }

  const marginStorageKey = `bt-margin-notes-${id}`
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(marginStorageKey)
      setMarginNotes(raw ? (JSON.parse(raw) as MarginNote[]) : [])
    } catch (_error) {
      // Notes unreadable: start from an empty list rather than failing the page.
      setMarginNotes([])
    }
    setMarginFormOpen(false)
    setMarginPage('')
    setMarginQuote('')
  }, [marginStorageKey])

  const saveMarginNotes = (notes: MarginNote[]) => {
    setMarginNotes(notes)
    try {
      window.localStorage.setItem(marginStorageKey, JSON.stringify(notes))
    } catch (_error) {
      // Storage unavailable (private mode) — keep the note visible this session.
    }
  }

  const addMarginNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!marginQuote.trim()) return
    const note: MarginNote = {
      id: `mn_${Date.now()}`,
      page: marginPage === '' ? null : Math.max(0, Number(marginPage) || 0),
      quote: marginQuote.trim(),
      created_at: new Date().toISOString(),
    }
    saveMarginNotes([note, ...marginNotes])
    setMarginPage('')
    setMarginQuote('')
    setMarginFormOpen(false)
  }

  const removeMarginNote = (noteId: string) => {
    saveMarginNotes(marginNotes.filter((n) => n.id !== noteId))
  }

  const saveEdit = async () => {
    if (!book || savingEdit) return
    if (!draftTitle.trim() || !draftAuthor.trim()) {
      setEditError(
        t('bookDetail.editFieldsRequired', {}, { defaultValue: 'Title and author are required.' }),
      )
      return
    }
    setSavingEdit(true)
    setEditError(null)
    try {
      const resp = await http.patch(`/books/${book.id}`, {
        title: draftTitle.trim(),
        author: draftAuthor.trim(),
        page_count: Math.max(1, Number(draftPageCount) || book.page_count),
      })
      setBook(unwrapSingle<Book>(resp))
      setEditing(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err))
    } finally {
      setSavingEdit(false)
    }
  }

  const shelve = async (shelf: Shelf) => {
    if (!book || busy) return
    setBusy(true)
    try {
      const resp = await http.post(`/books/${book.id}/shelve`, { shelf })
      const updated = unwrapSingle<Book>(resp)
      setBook(updated)
      if (shelf === 'read') {
        track({
          name: 'book.finished',
          properties: { book_id: book.id, title: book.title },
        })
      } else {
        track({ name: 'book.shelved', properties: { book_id: book.id, shelf } })
      }
      if (shelf === 'reading') setPage(String(updated?.my?.current_page ?? '0'))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const logProgress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!book || busy) return
    const target = Number(page)
    if (Number.isNaN(target) || target < 0) return
    setBusy(true)
    try {
      await http.post(`/books/${book.id}/progress`, {
        current_page: target,
        minutes: minutes ? Number(minutes) : undefined,
      })
      await loadBook()
      if (book.my) {
        const sessRes = await http.get(`/sessions?user_book_id=${book.my.id}`).catch(() => null)
        if (sessRes) setSessions(unwrapList<Session>(sessRes))
      }
      setMinutes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const saveReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!book || busy) return
    setBusy(true)
    setReviewSaved(false)
    try {
      const resp = await http.patch(`/books/${book.id}/review`, {
        rating,
        review: review.trim() || null,
      })
      setBook(unwrapSingle<Book>(resp))
      track({
        name: 'review.added',
        properties: { book_id: book.id, rating, has_text: Boolean(review.trim()) },
      })
      setReviewSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!book || busy) return
    setBusy(true)
    try {
      await http.delete(`/books/${book.id}`)
      // The book is gone — leave instead of rendering a deleted detail page.
      navigate('/books')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  if (error && !book)
    return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!book)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('bookDetail.notFound', {}, { defaultValue: 'Book not found.' })}
      </p>
    )

  const my = book.my

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, 'space-y-6')}>
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <Link
          to="/books"
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
        >
          ← {t('bookDetail.backLink', {}, { defaultValue: 'All books' })}
        </Link>
        {editing ? null : confirmingDelete ? (
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
            data-mol-id="book-delete-confirm"
            role="group"
            aria-label={t(
              'bookDetail.deleteConfirmTitle',
              {},
              { defaultValue: 'Delete this book?' },
            )}
          >
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'bookDetail.deleteConfirmBody',
                {},
                { defaultValue: 'Delete this book and its reading log?' },
              )}
            </span>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              data-mol-id="book-delete-confirm-yes"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'border border-error text-error rounded hover:bg-error hover:text-on-error disabled:opacity-50',
              )}
            >
              {busy
                ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                : t('common.confirmDelete', {}, { defaultValue: 'Yes, delete' })}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={busy}
              data-mol-id="book-delete-confirm-no"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'border border-outline-variant rounded disabled:opacity-50',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        ) : (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              type="button"
              onClick={startEdit}
              data-mol-id="book-edit"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'border border-outline-variant rounded',
              )}
            >
              {t('common.edit', {}, { defaultValue: 'Edit' })}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={busy}
              data-mol-id="book-delete"
              aria-label={t(
                'bookDetail.deleteAria',
                { title: book.title },
                { defaultValue: 'Delete {{title}}' },
              )}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'border border-error text-error rounded hover:bg-error hover:text-on-error disabled:opacity-50',
              )}
            >
              {t('common.delete', {}, { defaultValue: 'Delete' })}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void saveEdit()
          }}
          className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}
        >
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('books.title', {}, { defaultValue: 'Title' })}
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              data-mol-id="book-edit-title"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.sp('mt', 2),
                'block w-full text-base font-semibold text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors',
              )}
            />
          </label>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('books.author', {}, { defaultValue: 'Author' })}
            <input
              type="text"
              value={draftAuthor}
              onChange={(e) => setDraftAuthor(e.target.value)}
              data-mol-id="book-edit-author"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.sp('mt', 2),
                'block w-full text-base text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors',
              )}
            />
          </label>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('books.pageCount', {}, { defaultValue: 'Page count' })}
            <input
              type="number"
              min={1}
              value={draftPageCount}
              onChange={(e) => setDraftPageCount(e.target.value)}
              data-mol-id="book-edit-pages"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.sp('mt', 2),
                'block w-full text-base text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors',
              )}
            />
          </label>
          {editError ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')} data-mol-id="book-edit-error">
              {editError}
            </p>
          ) : null}
          <div className={cm.flex({ align: 'center', gap: 'sm', justify: 'end' })}>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'border border-outline-variant rounded',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              data-mol-id="book-edit-save"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded disabled:opacity-50',
              )}
            >
              {savingEdit
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            </button>
          </div>
        </form>
      ) : (
        <header className={cm.cn(cm.card(), cm.sp('p', 6), cm.flex({ align: 'start', gap: 'lg' }))}>
          <BookCover
            title={book.title}
            author={book.author}
            coverStyle={book.cover_style}
            size="lg"
          />
          <div className={cm.flex1}>
            <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>{book.title}</h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {t(
                'bookDetail.byLine',
                { author: book.author, pages: book.page_count },
                { defaultValue: 'by {{author}} · {{pages}} pages' },
              )}
            </p>
            {book.genres.length > 0 ? (
              <div className={cm.cn(cm.flex({ gap: 'xs' }), cm.sp('mt', 3), 'flex-wrap')}>
                {book.genres.map((g) => (
                  <span
                    key={g}
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      'rounded-full bg-surface-container text-on-surface-variant',
                    )}
                  >
                    {t(`genre.${g}`, {}, { defaultValue: g })}
                  </span>
                ))}
              </div>
            ) : null}
            {book.description ? (
              <p
                className={cm.cn(cm.textSize('sm'), cm.sp('mt', 4), 'text-on-surface-variant')}
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {book.description}
              </p>
            ) : null}
            {my?.rating != null ? (
              <div className={cm.cn(cm.sp('mt', 4))}>
                <Stars rating={my.rating} />
              </div>
            ) : null}
          </div>
        </header>
      )}

      {/* My shelf */}
      <section className={cm.cn(cm.card(), cm.sp('p', 5))} data-mol-id="book-shelf-section">
        <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
          {t('bookDetail.myShelfHeading', {}, { defaultValue: 'My shelf' })}
        </h2>
        <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
          {SHELF_ACTIONS.map((s) => {
            const active = my?.shelf === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => void shelve(s)}
                disabled={busy || active}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-full transition-all',
                  active
                    ? SHELF_TONE[s]
                    : 'border border-outline-variant text-on-surface-variant hover:border-primary',
                )}
                aria-pressed={active}
              >
                {t(`shelf.${s}`, {}, { defaultValue: SHELF_LABEL[s] })}
              </button>
            )
          })}
        </div>
        {my ? (
          <dl className={cm.cn(cm.grid({ cols: 3, gap: 'md' }), cm.sp('mt', 4))}>
            <div>
              <dt
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-wider',
                )}
              >
                {t('bookDetail.stat.progress', {}, { defaultValue: 'Progress' })}
              </dt>
              <dd className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{my.percent}%</dd>
            </div>
            <div>
              <dt
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-wider',
                )}
              >
                {t('bookDetail.stat.started', {}, { defaultValue: 'Started' })}
              </dt>
              <dd className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                {my.started_at ? new Date(my.started_at).toLocaleDateString() : '—'}
              </dd>
            </div>
            <div>
              <dt
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-wider',
                )}
              >
                {t('bookDetail.stat.finished', {}, { defaultValue: 'Finished' })}
              </dt>
              <dd className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                {my.finished_at ? new Date(my.finished_at).toLocaleDateString() : '—'}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>

      {/* Log progress */}
      {(!my || my.shelf === 'reading') && book.page_count > 0 ? (
        <section className={cm.cn(cm.card(), cm.sp('p', 5))} data-mol-id="book-progress-section">
          <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
            {t('bookDetail.progressHeading', {}, { defaultValue: 'Log progress' })}
          </h2>
          <form
            className={cm.cn(cm.flex({ align: 'end', gap: 'md' }), 'flex-wrap')}
            onSubmit={(e) => void logProgress(e)}
          >
            <label>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-wider block mb-1',
                )}
              >
                {t('bookDetail.currentPage', {}, { defaultValue: 'Current page' })}
              </span>
              <input
                type="number"
                min={0}
                max={book.page_count}
                value={page}
                onChange={(e) => setPage(e.target.value)}
                data-mol-id="book-progress-page"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'w-28 border-2 border-outline-variant rounded-lg bg-surface text-on-surface focus:border-primary focus:outline-none',
                )}
              />
            </label>
            <label>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-wider block mb-1',
                )}
              >
                {t('bookDetail.minutes', {}, { defaultValue: 'Minutes (optional)' })}
              </span>
              <input
                type="number"
                min={0}
                max={1440}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                data-mol-id="book-progress-minutes"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'w-28 border-2 border-outline-variant rounded-lg bg-surface text-on-surface focus:border-primary focus:outline-none',
                )}
              />
            </label>
            <button
              type="submit"
              disabled={busy || page === ''}
              data-mol-id="book-progress-submit"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-full disabled:opacity-50',
              )}
            >
              {t('bookDetail.logProgress', {}, { defaultValue: 'Log progress' })}
            </button>
          </form>
          <div className={cm.cn('h-2 rounded-full bg-surface-container overflow-hidden mt-4')}>
            <div
              className={cm.cn('h-full rounded-full')}
              style={{
                width: `${my?.percent ?? 0}%`,
                background:
                  'linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
              }}
            />
          </div>
        </section>
      ) : null}

      {/* Rating + review */}
      {my ? (
        <section className={cm.cn(cm.card(), cm.sp('p', 5))} data-mol-id="book-review-section">
          <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
            {t('bookDetail.reviewHeading', {}, { defaultValue: 'Rating & review' })}
          </h2>
          <form className={cm.cn('space-y-4')} onSubmit={(e) => void saveReview(e)}>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n === rating ? null : n)}
                  aria-label={t(
                    'bookDetail.rateAria',
                    { stars: n },
                    { defaultValue: 'Rate {{stars}} stars' },
                  )}
                  aria-pressed={rating === n}
                  data-mol-id={`book-rate-${n}`}
                  className={cm.cn('material-symbols-outlined text-2xl')}
                  style={{
                    color:
                      n <= (rating ?? 0)
                        ? 'var(--color-achievement)'
                        : 'var(--color-outline-variant)',
                    fontVariationSettings: n <= (rating ?? 0) ? "'FILL' 1" : undefined,
                  }}
                >
                  star
                </button>
              ))}
            </div>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
              data-mol-id="book-review-text"
              placeholder={t(
                'bookDetail.reviewPlaceholder',
                {},
                { defaultValue: 'What stayed with you?' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'w-full text-base text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors resize-none',
              )}
            />
            <div className={cm.flex({ align: 'center', gap: 'md' })}>
              <button
                type="submit"
                disabled={busy}
                data-mol-id="book-review-save"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-full disabled:opacity-50',
                )}
              >
                {t('bookDetail.saveReview', {}, { defaultValue: 'Save review' })}
              </button>
              {reviewSaved ? (
                <span
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                  data-mol-id="book-review-saved"
                >
                  {t('common.saved', {}, { defaultValue: 'Saved' })}
                </span>
              ) : null}
            </div>
          </form>
        </section>
      ) : null}

      {/* Margin notes & paged citations — locally archived quotes */}
      <section className={cm.cn(cm.card(), cm.sp('p', 5))} data-mol-id="book-margin-section">
        <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' })}>
          <div>
            <h3
              className={cm.cn('text-xl font-medium text-primary tracking-tight')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('bookDetail.marginTitle', {}, { defaultValue: 'Margin notes & paged citations' })}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}>
              {t(
                'bookDetail.marginSubtitle',
                {},
                { defaultValue: 'Transcribed from physical graphite markings' },
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMarginFormOpen((v) => !v)}
            data-mol-id="book-margin-add"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1.5 }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-primary hover:underline px-3 py-2',
            )}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              add
            </span>
            {t('bookDetail.marginAdd', {}, { defaultValue: 'Transcribe quote' })}
          </button>
        </div>

        {marginFormOpen ? (
          <form
            className={cm.cn(
              'space-y-3',
              cm.sp('mt', 4),
              cm.sp('p', 4),
              'bg-surface-container-low rounded-xl border border-outline-variant',
            )}
            onSubmit={addMarginNote}
          >
            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-wider block mb-1',
                )}
              >
                {t('bookDetail.marginPageLabel', {}, { defaultValue: 'Page (optional)' })}
              </span>
              <input
                type="number"
                min={0}
                value={marginPage}
                onChange={(e) => setMarginPage(e.target.value)}
                data-mol-id="book-margin-page"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'w-28 border-2 border-outline-variant rounded-lg bg-surface text-on-surface focus:border-primary focus:outline-none',
                )}
              />
            </label>
            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-wider block mb-1',
                )}
              >
                {t('bookDetail.marginQuoteLabel', {}, { defaultValue: 'The sentence itself' })}
              </span>
              <textarea
                value={marginQuote}
                onChange={(e) => setMarginQuote(e.target.value)}
                rows={3}
                data-mol-id="book-margin-quote"
                placeholder={t(
                  'bookDetail.marginQuotePlaceholder',
                  {},
                  { defaultValue: 'Copy the line that stopped you before the leaf turns.' },
                )}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'w-full text-base text-on-surface bg-surface rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors resize-none',
                )}
              />
            </label>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <button
                type="submit"
                disabled={!marginQuote.trim()}
                data-mol-id="book-margin-save"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-full disabled:opacity-50',
                )}
              >
                {t('bookDetail.marginSave', {}, { defaultValue: 'Keep in the archive' })}
              </button>
              <button
                type="button"
                onClick={() => setMarginFormOpen(false)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-full',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
            </div>
          </form>
        ) : null}

        {marginNotes.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 4))}>
            {t(
              'bookDetail.marginEmpty',
              {},
              {
                defaultValue:
                  'No margin notes yet — transcribe the sentence that stopped you, and page it came from.',
              },
            )}
          </p>
        ) : (
          <ul className={cm.cn('space-y-4', cm.sp('mt', 4))}>
            {marginNotes.map((n) => (
              <li
                key={n.id}
                className={cm.cn(
                  cm.sp('p', 4),
                  'bg-surface-container-lowest border border-outline-variant rounded-xl space-y-2',
                )}
              >
                <div
                  className={cm.flex({
                    align: 'center',
                    justify: 'between',
                    wrap: 'wrap',
                    gap: 'sm',
                  })}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 1.5 }),
                      cm.textSize('xs'),
                      'text-secondary',
                    )}
                  >
                    <span className="material-symbols-outlined text-xs" aria-hidden="true">
                      bookmark
                    </span>
                    {n.page != null
                      ? t(
                          'bookDetail.marginPageTag',
                          { page: n.page },
                          { defaultValue: 'Page {{page}}' },
                        )
                      : t('bookDetail.marginPageUnpaged', {}, { defaultValue: 'Unpaged' })}
                  </span>
                  <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <span className={cm.cn(cm.textSize('xs'), 'text-outline')}>
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeMarginNote(n.id)}
                      aria-label={t(
                        'bookDetail.marginRemoveAria',
                        {},
                        { defaultValue: 'Remove this margin note' },
                      )}
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-outline hover:text-error py-1 px-1',
                      )}
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">
                        delete
                      </span>
                    </button>
                  </span>
                </div>
                <blockquote
                  className={cm.cn(
                    'text-lg text-primary italic leading-relaxed border-l-2 pl-4 py-1',
                  )}
                  style={{
                    fontFamily: 'var(--font-headline)',
                    borderColor: 'var(--color-tertiary-container)',
                  }}
                >
                  “{n.quote}”
                </blockquote>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Session history */}
      {my ? (
        <section className={cm.cn(cm.card(), cm.sp('p', 5))} data-mol-id="book-sessions-section">
          <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
            {t('bookDetail.sessionsHeading', {}, { defaultValue: 'Reading log' })}
          </h2>
          {sessions.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('bookDetail.sessionsEmpty', {}, { defaultValue: 'No sessions logged yet.' })}
            </p>
          ) : (
            <ul className={cm.cn('space-y-1.5')}>
              {sessions.slice(0, 10).map((s) => (
                <li
                  key={s.id}
                  className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('sm'))}
                >
                  <span aria-hidden="true">📖</span>
                  <span className={cm.cn(cm.fontWeight('medium'))}>
                    {new Date(s.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'bookDetail.sessionSummary',
                      { pages: s.pages_read, minutes: s.minutes },
                      { defaultValue: '{{pages}} pages · {{minutes}} min' },
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}
    </div>
  )
}
