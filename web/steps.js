import { memberColor } from './art.js'

const escapeHtml = text => String(text).replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)

export const PHASES = [
  { id: 'spec', name: 'Spec', match: /^(gate-)?spec|^spike/ },
  { id: 'tests', name: 'Tests', match: /^red|^pin|^(gate-)?tests?/ },
  { id: 'build', name: 'Build', match: /^green|^move|^build/ },
  { id: 'review', name: 'Review', match: /^review|^fixer/ },
  { id: 'prove', name: 'Prove', match: /^prove|^browser|^vis|^e2e/ },
  { id: 'ship', name: 'Ship', match: /^(gate-)?captain|^ship|^first-mate|^reb|^confl/ },
]

const OTHER = { id: 'other', name: 'Other' }

export const phaseOf = role => PHASES.find(phase => phase.match.test(role)) ?? OTHER

const isLive = member => member.state === 'running' || member.state === 'blocked' || member.state === 'failed'

const label = member => (member.stale ? `${member.state} (stale)` : member.state)

const row = (member, withSummary) => {
  const summary = member.summary ?? member.phase ?? ''
  const live = isLive(member) || member.stale

  return `<div class="step ${live ? 'live' : ''} ${member.state === 'queued' ? 'wait' : ''}" style="--step:${memberColor(member)}">
    <span class="step-dot"></span><span class="step-role">${escapeHtml(member.role)}</span><span class="step-state">${escapeHtml(label(member))}</span>
    ${withSummary && summary ? `<span class="step-note">${escapeHtml(summary)}</span>` : ''}
  </div>`
}

export function stepperHtml(crew) {
  if (crew.length === 0) return '<p class="dim">No crew yet.</p>'
  const done = crew.filter(member => member.state === 'done' && !member.stale)
  const rest = crew.filter(member => !done.includes(member))
  const groups = [...PHASES, OTHER]
    .map(phase => ({ phase, steps: rest.filter(member => phaseOf(member.role).id === phase.id) }))
    .filter(group => group.steps.length > 0)
  const count = phase => {
    const all = crew.filter(member => phaseOf(member.role).id === phase.id)

    return `${all.filter(member => done.includes(member)).length}/${all.length}`
  }

  return `<div class="steps">
    ${done.length > 0 ? `<details class="steps-done"><summary>${done.length} of ${crew.length} done</summary>${done.map(member => row(member, true)).join('')}</details>` : `<p class="steps-head">0 of ${crew.length} done</p>`}
    ${groups.map(({ phase, steps }) => `<div class="phase"><h4>${phase.name} <span class="dim">${count(phase)}</span></h4>${steps.map(member => row(member, isLive(member) || member.stale)).join('')}</div>`).join('')}
  </div>`
}
