export const DARK = {
  bg: '#0d1b2a',
  ink: '#e8e4d8',
  dim: '#7d8fa3',
  field: '#08121d',
  line: '#4f7aa3',
  edge: '#2c4a66',
  accent: '#9fc3e6',
  hover: '#1b3550',
  active: '#2c4a66',
  activeHover: '#3b5f84',
  hud: '#0d1b2aee',
  scrim: '#000a',
  gold: '#e5c04b',
  good: '#6fcf97',
  needsInk: '#0d1b2a',
  failInk: '#fff',
  askBg: '#6b4e12',
  askLine: '#d9a441',
  step: '#c9d6e3',
  labelShadow: '1px 1px 0 #000',
  headMix: '100%',
  calm0: '#1e4a72',
  calm1: '#204e78',
  wave: '#2a5c88',
  stoneLine: '#3d6f9e',
  zoneTint: '#2d6a9c55',
  bandTint: '#1d3f6655',
  divider: '#ffffff22',
  cursor: '#ffffffcc',
  anchor: '#c9d6e3',
  sail: '#e8e4d8',
  deck: '#a87a4a',
  state: { queued: '#8a8a8a', running: '#33c3d6', blocked: '#e5c04b', done: '#4fbf6f', failed: '#e5484d' },
  life: { in_review: '#9fc3e6', merged: '#9fc3e6', released: '#c9a6ff', testing: '#c9a6ff', paused: '#8a8a8a', failed: '#e5484d', abandoned: '#6b6b6b' },
}

export const LIGHT = {
  bg: '#e9f0f7',
  ink: '#0f2133',
  dim: '#34495e',
  field: '#f7fafd',
  line: '#3a6590',
  edge: '#5b82a8',
  accent: '#12416e',
  hover: '#d2e2f1',
  active: '#c3d8ec',
  activeHover: '#b0cbe4',
  hud: '#e9f0f7ee',
  scrim: '#0f213366',
  gold: '#5c4300',
  good: '#16602d',
  needsInk: '#ffffff',
  failInk: '#ffffff',
  askBg: '#f3d98a',
  askLine: '#8a6100',
  step: '#3a6590',
  labelShadow: 'none',
  headMix: '40%',
  calm0: '#cfe4f5',
  calm1: '#c7dff2',
  wave: '#a6c9e6',
  stoneLine: '#3a6590',
  zoneTint: '#2d6a9c1a',
  bandTint: '#1d3f661a',
  divider: '#174a7c55',
  cursor: '#0f2133cc',
  anchor: '#174a7c',
  sail: '#d4b86c',
  deck: '#8a5d30',
  state: { queued: '#555555', running: '#07596b', blocked: '#5c4300', done: '#16602d', failed: '#a81c26' },
  life: { in_review: '#12416e', merged: '#12416e', released: '#52318f', testing: '#52318f', paused: '#555555', failed: '#a81c26', abandoned: '#4d4d4d' },
}

export const theme = { ...DARK, state: { ...DARK.state }, life: { ...DARK.life } }

export function applyTheme(set) {
  const { state, life, ...flat } = set
  Object.assign(theme, flat)
  Object.assign(theme.state, state)
  Object.assign(theme.life, life)
}

export const cssVars = set =>
  Object.entries(set)
    .flatMap(([key, value]) => (typeof value === 'object' ? Object.entries(value).map(([name, v]) => [`${key}-${name}`, v]) : [[key, value]]))
    .map(([key, value]) => `--${key.replaceAll('_', '-').replace(/([A-Z])/g, '-$1').toLowerCase()}:${value};`)
    .join('')
