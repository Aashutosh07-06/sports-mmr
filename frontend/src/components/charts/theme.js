/**
 * Chart colours. Validated with the dataviz palette checker against the card surface #151E30:
 *   series #8B5CF6 / #0EA5C4  -> CVD ΔE 14.4, normal-vision ΔE 22.8, both ≥ 3:1 contrast
 *   pos/neg #0EA5C4 / #E5484D -> CVD ΔE 17.2, normal-vision ΔE 31.1, both ≥ 3:1 contrast
 */
export const C = {
  series1: '#8B5CF6',
  series2: '#0EA5C4',
  pos: '#0EA5C4',
  neg: '#E5484D',
  muted: '#475569',
  grid: '#1F2A44',
  axis: '#6B7A93',
  ink: '#F8FAFC',
  ink2: '#CBD5E1',
  surface: '#151E30',
}

export const axisProps = {
  stroke: C.grid,
  tick: { fill: C.axis, fontSize: 11 },
  tickLine: false,
}
