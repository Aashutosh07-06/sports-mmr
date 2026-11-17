// chart colours (checked for colour-blind contrast on the #151E30 card background)
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
