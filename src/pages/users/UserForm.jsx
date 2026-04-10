import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { FormField } from '../../components/forms/FormField'
import { FormActions } from '../../components/forms/FormActions'
import { Card } from '../../components/ui/Card'
import { validateUser, cloneForm, ROLE_OPTIONS } from './userShared'

export function UserForm({
  defaultValues,
  onSubmitRecord,
  submitLabel,
  title,
  subtitle,
  accent,
  listPath = '/users',
}) {
  const navigate = useNavigate()
  const snapshotRef = useRef(cloneForm(defaultValues))
  const [form, setForm] = useState(() => cloneForm(defaultValues))
  const [errors, setErrors] = useState({})

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const v = validateUser(form)
    setErrors(v)
    if (Object.keys(v).length) return
    onSubmitRecord(form)
  }

  function reset() {
    setForm(cloneForm(snapshotRef.current))
    setErrors({})
  }

  return (
    <Card title={title} subtitle={subtitle} accent={accent}>
      <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
        <FormField label="Email" htmlFor="email" error={errors.email} required>
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setField('email', e.target.value)} error={errors.email} />
        </FormField>
        <FormField label="Display name" htmlFor="name" error={errors.name} required>
          <Input id="name" value={form.name} onChange={(e) => setField('name', e.target.value)} error={errors.name} />
        </FormField>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1">
            <FormField label="Profile picture URL" htmlFor="avatar_url">
              <Input
                id="avatar_url"
                type="url"
                value={form.avatar_url}
                onChange={(e) => setField('avatar_url', e.target.value)}
                placeholder="https://… (optional)"
              />
            </FormField>
          </div>
          {form.avatar_url?.trim() ? (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Preview</span>
              <img
                src={form.avatar_url.trim()}
                alt=""
                className="h-14 w-14 rounded-full border border-slate-200 bg-slate-50 object-cover dark:border-slate-600 dark:bg-slate-800"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : null}
        </div>
        <FormField label="Role" htmlFor="role" error={errors.role} required>
          <Select id="role" value={form.role} onChange={(e) => setField('role', e.target.value)} error={errors.role}>
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormActions onReset={reset} onCancel={() => navigate(listPath)}>
          <Button type="submit" variant="primary">
            {submitLabel}
          </Button>
        </FormActions>
      </form>
    </Card>
  )
}
