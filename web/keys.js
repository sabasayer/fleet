import { ACTION_KEY } from './life.js'

export const CONFIRM_ACTIONS = ['mark_failed', 'bug_found']

export const KEY_LIST = [
  ['j', 'Jump back'],
  ['s', 'Next state'],
  ['p', 'Pause or resume'],
  ['f', 'Mark failed (press twice)'],
  ['b', 'Bug found → back to sea (press twice)'],
  ['u', 'Undock'],
  ['n', 'New ship'],
  ['o', 'Show or hide the scouting band'],
  ['?', 'Show or hide this list'],
  ['↑ ↓ ← → Enter Esc', 'Move and zoom'],
]

export const isTyping = target => ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || Boolean(target?.isContentEditable)

export function keyAction({ key, ship, typing }) {
  if (typing) return null
  if (key === 'n') return 'new'
  if (key === '?') return 'help'
  if (!ship) return null
  if (key === 'j') return ship.session ? 'jump' : null

  return (ship.life?.actions ?? []).find(action => ACTION_KEY[action] === key) ?? null
}

export function pressAction(confirm, ship, action) {
  if (!CONFIRM_ACTIONS.includes(action)) return { fire: true, confirm: null }
  if (confirm?.ship === ship && confirm.action === action) return { fire: true, confirm: null }

  return { fire: false, confirm: { ship, action } }
}

export const keysHtml = () =>
  `<div class="modal-box hud-block"><h3>Keys</h3>${KEY_LIST.map(([key, text]) => `<p><b>${key}</b> ${text}</p>`).join('')}<p class="dim">Keys act on the open ship. Esc closes this list.</p></div>`
