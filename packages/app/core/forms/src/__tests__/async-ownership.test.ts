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
})
