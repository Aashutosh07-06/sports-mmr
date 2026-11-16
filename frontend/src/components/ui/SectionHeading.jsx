export default function SectionHeading({ eyebrow, title, children, align = 'left', className = '', as: H = 'h2' }) {
  return (
    <div className={`${align === 'center' ? 'mx-auto text-center' : ''} max-w-2xl ${className}`}>
      {eyebrow && <p className="eyebrow mb-2 text-violet-hi">{eyebrow}</p>}
      <H className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</H>
      {children && <p className="mt-3 text-base leading-relaxed text-muted">{children}</p>}
    </div>
  )
}
