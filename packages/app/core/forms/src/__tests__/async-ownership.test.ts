import { describe, expect, it, vi } from 'vitest'

import { nativeProvider } from '../controller.js'

describe('native asynchronous operation ownership', () => {
  it('does not submit after disposal while validation is pending', async () => {
    let release!: (errors: Record<string, string>) => void
    const gate = new Promise<Record<string, string>>((resolve) => {
      release = resolve
    })
    const form = nativeProvider.createForm({
      defaultValues: { title: 'Article' },
      validate: () => gate,
    })
    const onSubmit = vi.fn()
    const submission = form.handleSubmit(onSubmit)()

    form.destroy()
    release({})
    await submission

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not let an old submission clear a newer submission busy state', async () => {
    let releaseA!: (errors: Record<string, string>) => void
    let releaseB!: (errors: Record<string, string>) => void
    const gateA = new Promise<Record<string, string>>((resolve) => {
      releaseA = resolve
    })
    const gateB = new Promise<Record<string, string>>((resolve) => {
      releaseB = resolve
    })
    const form = nativeProvider.createForm({
      defaultValues: { title: 'A' },
      validate: (values) => (values.title === 'A' ? gateA : gateB),
    })

    const submissionA = form.handleSubmit(vi.fn())()
    form.updateValues({ title: 'B' })
    const submissionB = form.handleSubmit(vi.fn())()

    releaseA({})
    await submissionA
    expect(form.getState().isSubmitting).toBe(true)

    releaseB({})
    await submissionB
    expect(form.getState().isSubmitting).toBe(false)
  })

  it('does not let an older field validation overwrite a newer result', async () => {
    let releaseBad!: (result: string) => void
    let releaseGood!: (result: boolean) => void
    const bad = new Promise<string>((resolve) => {
      releaseBad = resolve
    })
    const good = new Promise<boolean>((resolve) => {
      releaseGood = resolve
    })
    const form = nativeProvider.createForm({ defaultValues: { title: 'bad' } })
    form.register({
      name: 'title',
      validate: (value) => (value === 'bad' ? bad : good),
    })

    const badValidation = form.validateField('title')
    form.setValue('title', 'good')
    const goodValidation = form.validateField('title')

    releaseGood(true)
    await expect(goodValidation).resolves.toBe(true)
    releaseBad('Stale error')
    await expect(badValidation).resolves.toBe(false)

    expect(form.getError('title')).toBeUndefined()
  })

  it('keeps independent field validation results when validations overlap', async () => {
    const form = nativeProvider.createForm({ defaultValues: { email: '', name: 'Valid' } })
    form.register({ name: 'email', required: 'Email required' })
    form.register({ name: 'name', required: 'Name required' })

    const emailValidation = form.validateField('email')
    const nameValidation = form.validateField('name')

    await expect(emailValidation).resolves.toBe(false)
    await expect(nameValidation).resolves.toBe(true)
    expect(form.getState().errors).toEqual({ email: 'Email required' })
    expect(form.getState().isValid).toBe(false)
  })

  it('keeps an unchanged field validation through a refresh of another field', async () => {
    let release!: (result: string) => void
    const gate = new Promise<string>((resolve) => {
      release = resolve
    })
    const initial = { id: 'same-account', email: 'typed@example.test', name: 'Before' }
    const form = nativeProvider.createForm({ defaultValues: initial, values: initial })
    form.register({ name: 'email', validate: () => gate })

    const validation = form.validateField('email')
    form.updateValues({ ...initial, name: 'Refreshed' }, { keepDirtyValues: true })
    release('Email invalid')

    await expect(validation).resolves.toBe(false)
    expect(form.getError('email')).toBe('Email invalid')
  })

  it('keeps submit name errors when independent email validation finishes first', async () => {
    let release!: (errors: Record<string, string>) => void
    const gate = new Promise<Record<string, string>>((resolve) => {
      release = resolve
    })
    const form = nativeProvider.createForm({
      defaultValues: { email: 'ok@example.test', name: '' },
      validate: () => gate,
    })
    form.register({ name: 'email', required: true })
    form.register({ name: 'name', required: 'Name required' })
    const onSubmit = vi.fn()
    const onError = vi.fn()

    const submission = form.handleSubmit(onSubmit, onError)()
    await expect(form.validateField('email')).resolves.toBe(true)
    release({})
    await submission

    expect(onSubmit).not.toHaveBeenCalled()
    expect(form.getState().errors).toEqual({ name: 'Name required' })
    expect(onError).toHaveBeenCalledWith({ name: 'Name required' })
    expect(form.getState().isSubmitting).toBe(false)
  })

  it('invalidates pending validation on reset even when defaults are unchanged', async () => {
    let release!: (errors: Record<string, string>) => void
    const gate = new Promise<Record<string, string>>((resolve) => {
      release = resolve
    })
    const form = nativeProvider.createForm({
      defaultValues: { title: '' },
      validate: () => gate,
    })

    const validation = form.validate()
    form.reset()
    release({ title: 'Pre-reset error' })
    await validation

    expect(form.getState().errors).toEqual({})
  })

  it('invalidates unchanged fields when the record identity changes', async () => {
    let release!: (error: string) => void
    const gate = new Promise<string>((resolve) => {
      release = resolve
    })
    const initial = { id: 'account-A', email: 'shared@example.test' }
    const form = nativeProvider.createForm({ defaultValues: initial, values: initial })
    form.register({ name: 'email', validate: () => gate })

    const validation = form.validateField('email')
    form.updateValues({ id: 'account-B', email: initial.email }, { keepDirtyValues: true })
    release('Account A server error')
    await validation

    expect(form.getState().errors).toEqual({})
  })

  it('does not let older whole-form validation replace newer errors', async () => {
    let releaseOld!: (errors: Record<string, string>) => void
    let releaseNew!: (errors: Record<string, string>) => void
    const oldGate = new Promise<Record<string, string>>((resolve) => {
      releaseOld = resolve
    })
    const newGate = new Promise<Record<string, string>>((resolve) => {
      releaseNew = resolve
    })
    let validation = 0
    const form = nativeProvider.createForm({
      defaultValues: { title: '' },
      validate: () => (++validation === 1 ? oldGate : newGate),
    })

    const oldValidation = form.validate()
    const newValidation = form.validate()
    releaseNew({ title: 'New error' })
    await expect(newValidation).resolves.toBe(false)
    releaseOld({ title: 'Old error' })
    await expect(oldValidation).resolves.toBe(false)

    expect(form.getState().errors).toEqual({ title: 'New error' })
  })
})

describe('native deep form-value snapshots', () => {
  it('detaches nested creation values without cloning opaque objects', () => {
    class Attachment {}
    const attachment = new Attachment()
    const source = { details: { title: 'Original' }, tags: ['a'], attachment }
    const form = nativeProvider.createForm({ defaultValues: source })

    source.details.title = 'Changed'
    source.tags.push('b')

    expect(form.getValues()).toEqual({ details: { title: 'Original' }, tags: ['a'], attachment })
    expect(form.getValue('attachment')).toBe(attachment)
  })

  it('detaches delivered dates, arrays and plain objects but preserves opaque identity', () => {
    class Attachment {}
    const attachment = new Attachment()
    const form = nativeProvider.createForm<{
      details: { title: string }
      tags: string[]
      when: Date
      attachment: Attachment
    }>({
      defaultValues: { details: { title: '' }, tags: [], when: new Date(1), attachment },
    })
    const loaded = {
      details: { title: 'Loaded' },
      tags: ['loaded'],
      when: new Date(0),
      attachment,
    }

    form.updateValues(loaded)
    loaded.details.title = 'Changed'
    loaded.tags.push('changed')
    loaded.when.setTime(2)

    expect(form.getValue('details')).toEqual({ title: 'Loaded' })
    expect(form.getValue('tags')).toEqual(['loaded'])
    expect(form.getValue('when')).toEqual(new Date(0))
    expect(form.getValue('when')).not.toBe(loaded.when)
    expect(form.getValue('attachment')).toBe(attachment)
  })

  it('shares error ownership between whole-form and field validation', async () => {
    let releaseWhole!: (errors: Record<string, string>) => void
    let releaseField!: (result: string) => void
    const wholeGate = new Promise<Record<string, string>>((resolve) => {
      releaseWhole = resolve
    })
    const fieldGate = new Promise<string>((resolve) => {
      releaseField = resolve
    })
    const form = nativeProvider.createForm({
      defaultValues: { title: 'bad' },
      validate: (values) => (values.title === 'bad' ? wholeGate : {}),
    })
    const wholeValidation = form.validate()
    form.register({
      name: 'title',
      validate: (value) => (value === 'bad' ? fieldGate : true),
    })
    form.setValue('title', 'good')
    await expect(form.validateField('title')).resolves.toBe(true)
    releaseWhole({ title: 'Stale whole-form error' })
    await expect(wholeValidation).resolves.toBe(false)
    expect(form.getError('title')).toBeUndefined()

    form.setValue('title', 'bad')
    const fieldValidation = form.validateField('title')
    form.setValue('title', 'good')
    await expect(form.validate()).resolves.toBe(true)
    releaseField('Stale field error')
    await expect(fieldValidation).resolves.toBe(false)
    expect(form.getError('title')).toBeUndefined()
  })

  it('rechecks submission ownership after notification destroys the form', async () => {
    let release!: (errors: Record<string, string>) => void
    const gate = new Promise<Record<string, string>>((resolve) => {
      release = resolve
    })
    const form = nativeProvider.createForm({
      defaultValues: { title: 'bad' },
      validate: () => gate,
    })
    form.setError('title', 'Existing error')
    form.subscribe((state) => {
      if (state.isSubmitting && Object.keys(state.errors).length === 0) form.destroy()
    })
    const onSubmit = vi.fn()
    const submission = form.handleSubmit(onSubmit)()

    release({})
    await submission

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('invalidates pending validation when reset establishes new values', async () => {
    let release!: (errors: Record<string, string>) => void
    const gate = new Promise<Record<string, string>>((resolve) => {
      release = resolve
    })
    const form = nativeProvider.createForm({
      defaultValues: { title: 'A' },
      validate: () => gate,
    })

    const validation = form.validate()
    form.reset({ title: 'B' })
    release({ title: 'A is invalid' })

    await expect(validation).resolves.toBe(false)
    expect(form.getValues()).toEqual({ title: 'B' })
    expect(form.getState().errors).toEqual({})
  })

  it('validates and submits the same deeply detached snapshot', async () => {
    let release!: (errors: Record<string, string>) => void
    const gate = new Promise<Record<string, string>>((resolve) => {
      release = resolve
    })
    const validated: string[] = []
    const form = nativeProvider.createForm({
      defaultValues: { details: { title: 'Valid A' } },
      validate: async (values) => {
        validated.push(values.details.title)
        await gate
        return {}
      },
    })
    const onSubmit = vi.fn()
    const submission = form.handleSubmit(onSubmit)()

    form.getValue('details').title = ''
    release({})
    await submission

    expect(validated).toEqual(['Valid A'])
    expect(onSubmit).toHaveBeenCalledWith({ details: { title: 'Valid A' } })
  })

  it('detaches Map entries and Sets from submission but preserves Attachment identity', async () => {
    class Attachment {}
    const attachment = new Attachment()
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const form = nativeProvider.createForm({
      defaultValues: {
        labels: new Map([['status', 'valid']]),
        tags: new Set(['initial']),
        attachment,
      },
      validate: async () => {
        await gate
        return {}
      },
    })
    const onSubmit = vi.fn()
    const submission = form.handleSubmit(onSubmit)()

    form.getValue('labels').set('status', 'unvalidated')
    form.getValue('tags').add('unvalidated')
    release()
    await submission

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const submitted = onSubmit.mock.calls[0][0]
    expect(submitted.labels).toEqual(new Map([['status', 'valid']]))
    expect(submitted.tags).toEqual(new Set(['initial']))
    expect(submitted.labels).not.toBe(form.getValue('labels'))
    expect(submitted.tags).not.toBe(form.getValue('tags'))
    expect(submitted.attachment).toBe(attachment)
  })
})
