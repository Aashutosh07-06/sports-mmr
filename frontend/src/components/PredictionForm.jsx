import { useMemo, useState } from 'react'
import { CircleAlert, Eraser, Sparkles, WandSparkles } from 'lucide-react'
import Button from './ui/Button'
import InfoTip from './ui/InfoTip'
import { fmt } from '../utils/format'

/** Client-side validation mirroring the API rules (the server re-validates everything). */
export function validateField(field, raw) {
  if (field.dtype === 'category') {
    return field.options.includes(raw) ? null : 'Choose an option'
  }
  if (raw === '' || raw === null || raw === undefined) return 'Required'
  const n = Number(raw)
  if (!Number.isFinite(n)) return 'Enter a number'
  if (field.dtype === 'int' && !Number.isInteger(n)) return 'Must be a whole number'
  if (field.hard_min !== undefined && n < field.hard_min) return `Must be at least ${field.hard_min}`
  if (field.hard_max !== undefined && n > field.hard_max) return `Must be at most ${field.hard_max}`
  return null
}

const isOutsideTypical = (field, raw) =>
  field.dtype !== 'category' && raw !== '' && Number.isFinite(Number(raw)) &&
  (Number(raw) < field.typical_min || Number(raw) > field.typical_max)

const emptyValues = (inputs) =>
  Object.fromEntries(inputs.map((f) => [f.name, f.dtype === 'category' ? f.default : '']))

/**
 * Form generated from the trained model's schema (GET /api/model-info/{game}).
 * Fields, groups, tooltips, ranges and categories all come from that game's schema.
 */
export default function PredictionForm({ schema, onSubmit, submitting, serverErrors }) {
  const [values, setValues] = useState(() => emptyValues(schema.inputs))
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const groups = useMemo(() => {
    const out = []
    for (const f of schema.inputs) {
      let g = out.find((x) => x.name === f.group)
      if (!g) out.push((g = { name: f.group, fields: [] }))
      g.fields.push(f)
    }
    return out
  }, [schema])

  const errors = Object.fromEntries(schema.inputs.map((f) => [f.name, validateField(f, values[f.name])]))
  const hasErrors = Object.values(errors).some(Boolean)

  const set = (name, v) => setValues((s) => ({ ...s, [name]: v }))
  const fillMedians = () => {
    setValues(Object.fromEntries(schema.inputs.map((f) => [f.name, String(f.default)])))
    setTouched({})
  }
  const clear = () => {
    setValues(emptyValues(schema.inputs))
    setTouched({})
    setSubmitted(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    if (hasErrors) {
      const first = schema.inputs.find((f) => errors[f.name])
      document.getElementById(`f-${first.name}`)?.focus()
      return
    }
    const payload = Object.fromEntries(
      schema.inputs.map((f) => [f.name, f.dtype === 'category' ? values[f.name] : Number(values[f.name])]),
    )
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={`${schema.name} prediction form`}>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" icon={WandSparkles} onClick={fillMedians}>
          Fill with dataset medians
        </Button>
        <Button type="button" variant="ghost" size="sm" icon={Eraser} onClick={clear}>
          Clear
        </Button>
        <span className="text-xs text-muted">Medians = the typical value of each stat in the training data.</span>
      </div>

      {serverErrors?.general?.length > 0 && (
        <div role="alert" className="mb-6 rounded-xl border border-bad/35 bg-bad/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <CircleAlert className="size-4 text-bad" aria-hidden /> The server rejected these values
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-ink-2">
            {serverErrors.general.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-8">
        {groups.map((g) => (
          <fieldset key={g.name}>
            <legend className="eyebrow mb-3">{g.name}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {g.fields.map((f) => (
                <Field
                  key={f.name}
                  field={f}
                  value={values[f.name]}
                  onChange={(v) => set(f.name, v)}
                  onBlur={() => setTouched((t) => ({ ...t, [f.name]: true }))}
                  error={(touched[f.name] || submitted ? errors[f.name] : null) || serverErrors?.fields?.[f.name]}
                />
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-line-soft pt-6">
        <Button type="submit" size="lg" loading={submitting} icon={submitting ? undefined : Sparkles}>
          {submitting ? 'Predicting…' : 'Submit prediction'}
        </Button>
        {submitted && hasErrors && (
          <p className="text-sm text-bad" role="status">
            {Object.values(errors).filter(Boolean).length} field(s) need attention.
          </p>
        )}
      </div>
    </form>
  )
}

function Field({ field, value, onChange, onBlur, error }) {
  const id = `f-${field.name}`
  const helpId = `${id}-help`
  const errId = `${id}-err`
  const outside = !error && isOutsideTypical(field, value)

  if (field.dtype === 'category') {
    return (
      <div className="sm:col-span-2">
        <div className="mb-1.5 flex items-center gap-1">
          <span id={`${id}-label`} className="text-sm font-semibold text-ink">
            {field.label}
          </span>
          <InfoTip text={field.description} label={`About ${field.label}`} />
        </div>
        <div role="radiogroup" aria-labelledby={`${id}-label`} className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-bg-2 p-1">
          {field.options.map((opt) => (
            <button
              key={opt}
              id={opt === value ? id : undefined}
              type="button"
              role="radio"
              aria-checked={opt === value}
              onClick={() => onChange(opt)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
                opt === value ? 'bg-violet text-white' : 'text-muted hover:bg-card-2 hover:text-ink'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {field.label}
        </label>
        <InfoTip text={field.description} label={`About ${field.label}`} />
      </div>
      <div
        className={`flex h-11 items-center rounded-xl border bg-bg-2 transition-colors focus-within:border-violet ${
          error ? 'border-bad/70' : 'border-line hover:border-faint/60'
        }`}
      >
        <input
          id={id}
          name={field.name}
          type="number"
          inputMode={field.dtype === 'int' ? 'numeric' : 'decimal'}
          step={field.dtype === 'int' ? 1 : field.step || 'any'}
          min={field.hard_min}
          max={field.hard_max}
          value={value}
          placeholder={`e.g. ${field.default}`}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={`${helpId}${error ? ` ${errId}` : ''}`}
          className="num h-full w-full min-w-0 bg-transparent px-3.5 text-[15px] text-ink placeholder:text-faint focus:outline-none"
        />
        {field.unit && <span className="pr-3.5 text-sm text-muted">{field.unit}</span>}
      </div>
      <p id={helpId} className={`mt-1 text-xs ${outside ? 'text-warn' : 'text-muted'}`}>
        {outside ? 'Unusual value · ' : ''}Typical {fmt(field.typical_min, field.dtype === 'int' ? 0 : 1)} to{' '}
        {fmt(field.typical_max, field.dtype === 'int' ? 0 : 1)}
        {field.unit ? ` ${field.unit}` : ''}
      </p>
      {error && (
        <p id={errId} className="mt-0.5 text-xs font-medium text-bad">
          {error}
        </p>
      )}
    </div>
  )
}
