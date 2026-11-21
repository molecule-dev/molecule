<!--
  SurveyQuestion: the Svelte counterpart of
  `@molecule/app-survey-question-react`'s `SurveyQuestion` — one component that
  dispatches on `question.kind` and renders the matching control for one of 11
  supported kinds. Same props (React names), same DOM for the same input.
-->
<script lang="ts">
  import { FileDropzone } from '@molecule/app-file-dropzone-svelte'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import { reflectChecked } from './checked.js'
  import { styleText } from './style.js'
  import type {
    MatrixQuestion,
    MultiChoiceMultiQuestion,
    MultiChoiceSingleQuestion,
    SurveyAnswerValue,
    SurveyQuestionDef,
    SurveyQuestionProps,
  } from './types.js'
  import { reactInputValue } from './value.js'

  let { question, value, onChange, onSubmit, readOnly, className }: SurveyQuestionProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let error = $state<string | null>(null)
  let rootEl: HTMLDivElement | undefined

  /** The theme-token border both option rows share. */
  const BORDER = 'var(--mol-color-border, rgba(128,128,128,0.35))'

  /**
   * Returns true when `value` is a non-empty answer for the given kind.
   *
   * @param kind - Question kind discriminator.
   * @param candidate - Candidate answer value.
   * @returns Whether the value qualifies as answered.
   */
  function hasAnswer(kind: SurveyQuestionDef['kind'], candidate: unknown): boolean {
    if (candidate === undefined || candidate === null) return false
    switch (kind) {
      case 'multi-choice-multi':
        return Array.isArray(candidate) && candidate.length > 0
      case 'file-upload':
        return Array.isArray(candidate) && candidate.length > 0
      case 'matrix':
        return (
          typeof candidate === 'object' &&
          candidate !== null &&
          Object.keys(candidate as Record<string, string>).length > 0
        )
      case 'short-text':
      case 'long-text':
      case 'date':
      case 'multi-choice-single':
        return typeof candidate === 'string' && candidate.trim().length > 0
      case 'numeric':
        return typeof candidate === 'number' && Number.isFinite(candidate)
      case 'rating-scale':
      case 'nps':
        return typeof candidate === 'number' && Number.isFinite(candidate)
      case 'true-false':
        return typeof candidate === 'boolean'
      default:
        return false
    }
  }

  /**
   * Reports a new answer value: clears the error and calls `onChange`.
   *
   * @param next - The new value.
   */
  function setValue(next: SurveyAnswerValue): void {
    if (readOnly) return
    error = null
    onChange?.(next)
  }

  /** Validates the required field and calls `onSubmit`. */
  function handleSubmit(): void {
    if (readOnly) return
    if (question.required && !hasAnswer(question.kind, value)) {
      error = t(
        'surveyQuestion.required',
        {},
        {
          defaultValue: 'This question requires an answer.',
        },
      )
      return
    }
    error = null
    onSubmit?.(value as SurveyAnswerValue)
  }

  /** The current answer as text (React's `(value as string) ?? ''`). */
  const textValue = $derived(typeof value === 'string' ? value : '')

  /** The current answer as a list of option values. */
  const listValue = $derived(Array.isArray(value) ? (value as string[]) : [])

  /** The current answer as a list of files. */
  const fileValue = $derived(Array.isArray(value) ? (value as File[]) : [])

  /** The current answer as a matrix row mapping. */
  const matrixValue = $derived(
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, string>)
      : {},
  )

  /** The current numeric answer as field text. */
  const numericText = $derived(typeof value === 'number' ? String(value) : value === '' ? '' : '')

  /** The rating-scale bounds, with React's 1–5 defaults. */
  const ratingBounds = $derived({
    min: question.kind === 'rating-scale' ? (question.min ?? 1) : 1,
    max: question.kind === 'rating-scale' ? (question.max ?? 5) : 5,
  })

  /** One single-pick option's inline style. */
  const optionStyle = (selected: boolean): string =>
    styleText({
      'border-radius': '8px',
      border: `1px solid ${selected ? 'currentColor' : BORDER}`,
      opacity: readOnly ? '0.6' : '1',
      'text-align': 'left',
    })

  /** One rating-scale point's inline style. */
  const ratingStyle = (selected: boolean): string =>
    styleText({
      border: `1px solid ${selected ? 'currentColor' : BORDER}`,
      width: '36px',
      height: '36px',
      opacity: readOnly ? '0.6' : '1',
      background: selected ? 'color-mix(in srgb, currentColor 8%, transparent)' : undefined,
    })

  /** One NPS point's inline style. */
  const npsStyle = (selected: boolean): string =>
    styleText({
      border: `1px solid ${selected ? 'currentColor' : BORDER}`,
      'border-radius': '6px',
      width: '32px',
      height: '32px',
      opacity: readOnly ? '0.6' : '1',
      background: selected ? 'color-mix(in srgb, currentColor 8%, transparent)' : undefined,
    })

  /**
   * Updates a single matrix row's selected column value.
   *
   * @param rowId - The row the click came from.
   * @param column - The clicked column value.
   */
  function setRow(rowId: string, column: string): void {
    if (readOnly) return
    setValue({ ...matrixValue, [rowId]: column })
    // React restores every radio of the clicked name group to the controlled
    // value after the change event, so a click on another cell of the row
    // leaves the previously selected cell checked.
    const element = rootEl
    if (!element || question.kind !== 'matrix') return
    const name = `${question.id}-${rowId}`
    let index = 0
    for (const radio of Array.from(element.querySelectorAll('input[type="radio"]'))) {
      const input = radio as HTMLInputElement
      if (input.name !== name) continue
      input.checked = matrixValue[rowId] === question.columns[index]?.value
      index++
    }
  }
</script>

<div
  bind:this={rootEl}
  class={cm.cn(cm.stack(3), className)}
  data-mol-id="survey-question-{question.id}"
  data-kind={question.kind}
>
  <header class={cm.stack(1)}>
    <h3 class={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
      {question.prompt}{#if question.required}<span
          aria-label={t('surveyQuestion.requiredIndicator', {}, { defaultValue: 'required' })}
          style="color: rgb(239, 68, 68); margin-left: 4px"
          data-mol-id="survey-question-{question.id}-required">*</span
        >{/if}
    </h3>
    {#if question.description}
      <p class={cm.textSize('sm')}>{question.description}</p>
    {/if}
  </header>

  <div data-mol-id="survey-question-{question.id}-input">
    {#if question.kind === 'multi-choice-single'}
      <div class={cm.stack(2)} role="radiogroup">
        {#each (question as MultiChoiceSingleQuestion).options as opt (opt.value)}
          <button
            type="button"
            role="radio"
            aria-checked={textValue === opt.value}
            disabled={readOnly}
            onclick={() => setValue(opt.value)}
            class={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              readOnly ? undefined : cm.cursorPointer,
              cm.touchTargetCompact,
              textValue === opt.value ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
            )}
            style={optionStyle(textValue === opt.value)}
            data-mol-id="survey-option-{question.id}-{opt.value}"
          >
            {opt.label}
          </button>
        {/each}
      </div>
    {:else if question.kind === 'multi-choice-multi'}
      <div class={cm.stack(2)} role="group">
        {#each (question as MultiChoiceMultiQuestion).options as opt (opt.value)}
          <button
            type="button"
            role="checkbox"
            aria-checked={listValue.includes(opt.value)}
            disabled={readOnly}
            onclick={() =>
              listValue.includes(opt.value)
                ? setValue(listValue.filter((x) => x !== opt.value))
                : setValue([...listValue, opt.value])}
            class={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              readOnly ? undefined : cm.cursorPointer,
              cm.touchTargetCompact,
              listValue.includes(opt.value) ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
            )}
            style={optionStyle(listValue.includes(opt.value))}
            data-mol-id="survey-option-{question.id}-{opt.value}"
          >
            <span aria-hidden="true" style="display: inline-block; width: 16px">
              {listValue.includes(opt.value) ? '☑' : '☐'}
            </span>
            <span>{opt.label}</span>
          </button>
        {/each}
      </div>
    {:else if question.kind === 'true-false'}
      <div class={cm.flex({ gap: 'sm', align: 'center' })} role="radiogroup">
        <Button
          type="button"
          variant={value === true ? 'solid' : 'ghost'}
          color={value === true ? 'primary' : undefined}
          size="sm"
          disabled={readOnly}
          onClick={() => setValue(true)}
          data-mol-id="survey-option-{question.id}-true"
        >
          {question.trueLabel ?? t('surveyQuestion.trueFalse.true', {}, { defaultValue: 'True' })}
        </Button>
        <Button
          type="button"
          variant={value === false ? 'solid' : 'ghost'}
          color={value === false ? 'primary' : undefined}
          size="sm"
          disabled={readOnly}
          onClick={() => setValue(false)}
          data-mol-id="survey-option-{question.id}-false"
        >
          {question.falseLabel ??
            t('surveyQuestion.trueFalse.false', {}, { defaultValue: 'False' })}
        </Button>
      </div>
    {:else if question.kind === 'short-text'}
      <input
        type="text"
        use:reactInputValue={{ value: textValue }}
        placeholder={question.placeholder}
        maxlength={question.maxLength}
        disabled={readOnly}
        oninput={(event) => {
          setValue(event.currentTarget.value)
          event.currentTarget.value = textValue
        }}
        aria-label={question.prompt}
        class={cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2))}
        style="border: 1px solid var(--mol-color-border, rgba(128,128,128,0.35)); border-radius: 8px; outline: none; width: 100%"
        data-mol-id="survey-input-{question.id}"
      />
    {:else if question.kind === 'long-text'}
      <textarea
        value={textValue}
        placeholder={question.placeholder}
        maxlength={question.maxLength}
        rows={question.rows ?? 4}
        disabled={readOnly}
        oninput={(event) => {
          setValue(event.currentTarget.value)
          event.currentTarget.value = textValue
        }}
        aria-label={question.prompt}
        class={cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2))}
        style="border: 1px solid var(--mol-color-border, rgba(128,128,128,0.35)); border-radius: 8px; outline: none; resize: vertical; width: 100%"
        data-mol-id="survey-input-{question.id}"></textarea>
    {:else if question.kind === 'numeric'}
      <div class={cm.flex({ align: 'center', gap: 'xs' })}>
        <input
          type="number"
          inputmode="decimal"
          use:reactInputValue={{ value: numericText }}
          min={question.min}
          max={question.max}
          step={question.step}
          disabled={readOnly}
          oninput={(event) => {
            const raw = event.currentTarget.value
            if (raw === '') setValue('')
            else {
              const parsed = Number(raw)
              if (Number.isFinite(parsed)) setValue(parsed)
            }
            event.currentTarget.value = numericText
          }}
          aria-label={question.prompt}
          class={cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2))}
          style="border: 1px solid var(--mol-color-border, rgba(128,128,128,0.35)); border-radius: 8px; outline: none; width: {question.unit
            ? '12rem'
            : '100%'}"
          data-mol-id="survey-input-{question.id}"
        />
        {#if question.unit}
          <span
            class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
            data-mol-id="survey-input-{question.id}-unit"
          >
            {question.unit}
          </span>
        {/if}
      </div>
    {:else if question.kind === 'rating-scale'}
      <div class={cm.stack(1)}>
        <div class={cm.flex({ gap: 'xs', align: 'center' })} role="radiogroup">
          {#each Array.from({ length: ratingBounds.max - ratingBounds.min + 1 }, (_unused, index) => ratingBounds.min + index) as n (n)}
            <button
              type="button"
              role="radio"
              aria-checked={value === n}
              disabled={readOnly}
              onclick={() => setValue(n)}
              class={cm.cn(
                cm.textSize('sm'),
                cm.roundedFull,
                readOnly ? undefined : cm.cursorPointer,
                cm.fontWeight(value === n ? 'bold' : 'medium'),
              )}
              style={ratingStyle(value === n)}
              data-mol-id="survey-option-{question.id}-{n}"
            >
              {n}
            </button>
          {/each}
        </div>
        {#if question.lowLabel || question.highLabel}
          <div class={cm.flex({ justify: 'between' })}>
            <span class={cm.textSize('xs')}>{question.lowLabel}</span>
            <span class={cm.textSize('xs')}>{question.highLabel}</span>
          </div>
        {/if}
      </div>
    {:else if question.kind === 'nps'}
      <div class={cm.stack(1)}>
        <div class={cm.flex({ gap: 'xs', align: 'center' })} role="radiogroup">
          {#each Array.from({ length: 11 }, (_unused, index) => index) as n (n)}
            <button
              type="button"
              role="radio"
              aria-checked={value === n}
              disabled={readOnly}
              onclick={() => setValue(n)}
              class={cm.cn(
                cm.textSize('sm'),
                readOnly ? undefined : cm.cursorPointer,
                cm.fontWeight(value === n ? 'bold' : 'medium'),
              )}
              style={npsStyle(value === n)}
              data-mol-id="survey-option-{question.id}-{n}"
            >
              {n}
            </button>
          {/each}
        </div>
        <div class={cm.flex({ justify: 'between' })}>
          <span class={cm.textSize('xs')}>
            {question.lowLabel ??
              t('surveyQuestion.nps.low', {}, { defaultValue: 'Not at all likely' })}
          </span>
          <span class={cm.textSize('xs')}>
            {question.highLabel ??
              t('surveyQuestion.nps.high', {}, { defaultValue: 'Extremely likely' })}
          </span>
        </div>
      </div>
    {:else if question.kind === 'date'}
      <input
        type="date"
        use:reactInputValue={{ value: textValue }}
        min={question.min}
        max={question.max}
        disabled={readOnly}
        oninput={(event) => {
          setValue(event.currentTarget.value)
          event.currentTarget.value = textValue
        }}
        aria-label={question.prompt}
        class={cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2))}
        style="border: 1px solid var(--mol-color-border, rgba(128,128,128,0.35)); border-radius: 8px; outline: none"
        data-mol-id="survey-input-{question.id}"
      />
    {:else if question.kind === 'file-upload'}
      <div class={cm.stack(2)}>
        <FileDropzone
          accept={question.accept}
          multiple={question.multiple}
          maxSize={question.maxSize}
          disabled={readOnly}
          onFiles={(files) => setValue(files)}
        />
        {#if fileValue.length > 0}
          <ul class={cm.stack(1)} data-mol-id="survey-input-{question.id}-files">
            {#each fileValue as file, index (`${file.name}-${index}`)}
              <li class={cm.textSize('xs')}>{file.name}</li>
            {/each}
          </ul>
        {/if}
        {#if fileValue.length === 0}
          <p class={cm.textSize('xs')}>
            {t('surveyQuestion.file.noFiles', {}, { defaultValue: 'No files selected.' })}
          </p>
        {/if}
      </div>
    {:else if question.kind === 'matrix'}
      <table
        class={cm.cn(cm.textSize('sm'))}
        style="border-collapse: collapse; width: 100%"
        data-mol-id="survey-matrix-{question.id}"
      >
        <thead>
          <tr>
            <th style="text-align: left; padding: 4px"></th>
            {#each (question as MatrixQuestion).columns as col (col.value)}
              <th style="text-align: center; padding: 4px" scope="col">{col.label}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each (question as MatrixQuestion).rows as row (row.id)}
            <tr>
              <th
                style="text-align: left; padding: 4px"
                scope="row"
                data-mol-id="survey-matrix-{question.id}-row-{row.id}"
              >
                {row.label}
              </th>
              {#each (question as MatrixQuestion).columns as col (col.value)}
                <td style="text-align: center; padding: 4px">
                  <input
                    type="radio"
                    name="{question.id}-{row.id}"
                    use:reflectChecked={matrixValue[row.id] === col.value}
                    disabled={readOnly}
                    onchange={() => setRow(row.id, col.value)}
                    aria-label="{row.label} - {col.label}"
                    data-mol-id="survey-matrix-{question.id}-{row.id}-{col.value}"
                  />
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  {#if question.helpText}
    <p class={cm.textSize('xs')} data-mol-id="survey-question-{question.id}-help">
      {question.helpText}
    </p>
  {/if}

  {#if error}
    <p
      class={cm.textSize('xs')}
      style="color: rgb(239, 68, 68)"
      role="alert"
      data-mol-id="survey-question-{question.id}-error"
    >
      {error}
    </p>
  {/if}

  {#if onSubmit && !readOnly}
    <div>
      <Button type="button" variant="solid" color="primary" onClick={handleSubmit}
        >{t('surveyQuestion.submit', {}, { defaultValue: 'Submit' })}</Button
      >
    </div>
  {/if}
</div>
