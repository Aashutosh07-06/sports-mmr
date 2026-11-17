export function Card({ className = '', children, as: Tag = 'section', ...props }) {
  return (
    <Tag className={`rounded-2xl border border-line-soft bg-card shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset] ${className}`} {...props}>
      {children}
    </Tag>
  )
}

export function CardHeader({ title, description, action, className = '' }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 ${className}`}>
      <div className="min-w-0">
        {title && <h3 className="text-base font-bold text-ink">{title}</h3>}
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function CardBody({ className = '', children }) {
  return <div className={`px-5 pb-5 pt-4 sm:px-6 ${className}`}>{children}</div>
}
