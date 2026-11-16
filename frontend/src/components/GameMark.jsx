import { metaFor } from '../utils/games'

/** Small square icon tile in the game's accent colour (no official logos are used). */
export default function GameMark({ game, size = 'md' }) {
  const meta = metaFor(game)
  const Icon = meta.icon
  const dims = { sm: 'size-8 rounded-lg', md: 'size-11 rounded-xl', lg: 'size-14 rounded-2xl' }[size]
  const icon = { sm: 'size-4', md: 'size-5', lg: 'size-7' }[size]
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border ${dims}`}
      style={{
        color: meta.accent,
        background: `color-mix(in oklab, ${meta.accent} 12%, transparent)`,
        borderColor: `color-mix(in oklab, ${meta.accent} 30%, transparent)`,
      }}
      aria-hidden
    >
      <Icon className={icon} />
    </span>
  )
}
