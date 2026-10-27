import { ANCHOR, BACKDROP, beaconGrid, blit, CALM, flagColor, GOLD, hash, memberColor, shipGrid, snap, STATE, STONE_LINE, WAVE, WOOD } from './art.js'
import { crewOf, crewRight, detailFor, easeOut, layoutFor, LABEL_COLUMN, lerp, mixLayout, RIGHT_MARGIN, shapeKey, shipPlaceX, stoneX, TWEEN_MS, zoneEdge } from './layout.js'
import { lifeState, LIFE_COLOR, LIFE_SHORT, ZONE_NAME, ZONES } from './life.js'

const escapeHtml = text => String(text).replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)

function calmLane(ctx, dpr, frame, x, y, w, h, shade) {
  ctx.fillStyle = CALM[shade]
  ctx.fillRect(Math.round(x * dpr), Math.round(y * dpr), Math.round(w * dpr), Math.round(h * dpr))
  ctx.fillStyle = WAVE
  for (let r = 0; r * 22 < h - 10; r++) {
    for (let k = 0; k < w / 140; k++) {
      const wx = x + ((k * 140 + r * 53 + frame * 2 + (hash(`${Math.round(y)},${r}`) % 90)) % w)
      ctx.fillRect(Math.round(wx * dpr), Math.round((y + 10 + r * 22) * dpr), 12 * dpr, 2 * dpr)
    }
  }
}

const needsBadge = ship => (ship.needsCaptain ? `<span class="${ship.needsCaptain.kind === 'failed' ? 'fail' : 'needs'}">!</span>` : '')

const label = (x, y, html, extra = '') => `<div class="label" style="left:${x}px;top:${y}px;${extra}">${html}</div>`

export function createSea(canvas, ui) {
  const ctx = canvas.getContext('2d')
  const tween = { key: '', from: null, to: null, cur: null, t0: 0 }
  let cursorBox = null
  let hits = []

  const layoutNow = (view, fleets, size) => {
    const key = `${JSON.stringify(view)}|${size.w}x${size.h}|${shapeKey(fleets)}`
    if (tween.key !== key) {
      tween.to = layoutFor(view, fleets, size)
      tween.from = tween.cur ?? tween.to
      tween.t0 = performance.now()
      tween.key = key
    }
    const t = Math.min(1, (performance.now() - tween.t0) / TWEEN_MS)
    tween.cur = t < 1 ? mixLayout(tween.from, tween.to, easeOut(t)) : tween.to

    return { layout: tween.cur, animating: t < 1 }
  }

  function draw({ fleets, view, frame }) {
    const dpr = window.devicePixelRatio || 1
    const size = { w: canvas.clientWidth, h: canvas.clientHeight }
    const buffer = { w: Math.round(size.w * dpr), h: Math.round(size.h * dpr) }
    if (canvas.width !== buffer.w || canvas.height !== buffer.h) {
      canvas.width = buffer.w
      canvas.height = buffer.h
    }
    ctx.imageSmoothingEnabled = false
    ctx.globalAlpha = 1
    ctx.fillStyle = BACKDROP
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    hits = []

    const { layout, animating } = layoutNow(view, fleets, size)
    const scale = layout.scale
    const detail = detailFor(scale)
    const left = LABEL_COLUMN
    const right = size.w - RIGHT_MARGIN
    const opacity = a => `opacity:${a.toFixed(2)};`
    let html = ''

    fleets.forEach((fleet, li) => {
      const lane = layout.lanes[fleet.id]
      if (lane.a < 0.01 && (lane.y + lane.h < 0 || lane.y > size.h)) return
      const laneAlpha = Math.max(lane.a, 0.15)
      ctx.globalAlpha = laneAlpha
      calmLane(ctx, dpr, frame, 0, lane.y, right + 60, lane.h, li % 2)
      const stop = crewRight(left, right)
      ctx.fillStyle = '#2d6a9c55'
      ctx.fillRect(Math.round(stop * dpr), Math.round((lane.y + 24) * dpr), Math.round((right - stop) * dpr), Math.round((lane.h - 24) * dpr))
      html += label(left + (stop - left) / 2, lane.y + 6, `<span class="dim">crew at work</span>`, `transform:translateX(-50%);${opacity(laneAlpha)}`)
      ZONES.forEach((zone, j) => {
        const edge = zoneEdge(j, left, right)
        ctx.fillStyle = '#ffffff22'
        ctx.fillRect(Math.round(edge * dpr), Math.round((lane.y + 24) * dpr), dpr, Math.round((lane.h - 24) * dpr))
        html += label((edge + zoneEdge(j + 1, left, right)) / 2, lane.y + 6, `<span class="dim">${ZONE_NAME[zone]}</span>`, `transform:translateX(-50%);${opacity(laneAlpha)}`)
      })
      ctx.fillStyle = WOOD
      ctx.fillRect(Math.round((right + 40) * dpr), Math.round(lane.y * dpr), 12 * dpr, Math.round(lane.h * dpr))

      const waiting = fleet.ships.filter(s => s.needsCaptain).length
      html += `<div class="lane-head" data-fleet="${escapeHtml(fleet.id)}" style="top:${lane.y + 5}px;${opacity(laneAlpha)}"><span style="color:${escapeHtml(fleet.color)}">▶ ${escapeHtml(fleet.name.toUpperCase())}</span> <span class="dim">${fleet.ships.length} ships</span> ${waiting ? `<span class="needs">${waiting} need you</span>` : ''}</div>`

      fleet.ships.forEach(ship => {
        const place = layout.ships[ship.ship]
        const life = lifeState(ship)
        const alpha = place.a * laneAlpha * (life === 'abandoned' ? 0.6 : life === 'paused' ? 0.75 : 1)
        if (alpha < 0.02) return
        ctx.globalAlpha = alpha
        const crew = crewOf(ship)
        const grid = shipGrid(crew, flagColor(ship, fleet.color), frame, detail, life)
        const rowY = place.y
        const lineY = rowY + grid.length * scale + 4
        const rowPx = snap(scale, dpr)

        ctx.fillStyle = STONE_LINE
        ctx.fillRect(Math.round(left * dpr), Math.round(lineY * dpr), Math.round((right + 40 - left) * dpr), dpr)
        crew.forEach((member, k) => {
          const stone = 4 + scale
          const cx = stoneX(k, crew.length, left, stop)
          ctx.fillStyle = memberColor(member)
          ctx.fillRect(Math.round((cx - stone / 2) * dpr), Math.round((lineY - stone / 2) * dpr), Math.round(stone * dpr), Math.round(stone * dpr))
          if (scale >= 3) html += label(cx, lineY + 8, `<span style="color:${memberColor(member)}">${escapeHtml(member.role)}</span>`, `transform:translateX(-50%);${opacity(alpha)}`)
        })

        const cx = shipPlaceX(ship, crew, left, right)
        const sx = Math.min(cx - (grid[0].length * rowPx) / 2, right + 36 - grid[0].length * rowPx)
        const working = life === 'sailing' && crew.some(m => m.state === 'running' && !m.stale)
        const sy = rowY + (working && frame % 2 ? rowPx / 2 : 0)
        blit(ctx, grid, sx, sy, scale, dpr)
        if (life === 'paused') blit(ctx, ANCHOR, sx + grid[0].length * rowPx + 2, rowY + grid.length * rowPx - 5 * snap(Math.max(2, scale / 2), dpr), Math.max(2, scale / 2), dpr)
        if (ship.needsCaptain) {
          const bangScale = Math.max(3, scale / 2)
          const color = ship.needsCaptain.kind === 'failed' ? STATE.failed : GOLD
          if (frame % 4 < 3) blit(ctx, beaconGrid(color), cx - 2.5 * snap(bangScale, dpr), sy - (8 + (frame % 2)) * snap(bangScale, dpr), bangScale, dpr)
        }
        if (place.a > 0.5) hits.push({ x: sx, y: sy, w: grid[0].length * rowPx, h: grid.length * rowPx + 10, ship: ship.ship })
        const tag = LIFE_SHORT[life] ? `${view.level === 'armada' ? ' ' : '<br>'}<span style="color:${LIFE_COLOR[life]};font-size:11px">${LIFE_SHORT[life]}</span>` : ''
        html += label(left - 6, rowY + 2, `${view.level === 'armada' ? '' : `<span class="dim ship-id">${escapeHtml(ship.ship)}</span><br>`}${needsBadge(ship)} ${escapeHtml(ship.title)}${tag}`, `text-align:right;transform:translateX(-100%);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:${view.level === 'armada' ? 'nowrap' : 'normal'};${opacity(alpha)}`)
      })
    })
    ctx.globalAlpha = 1

    const box = view.level === 'ship' ? null : layout.cursorBox
    if (box) {
      cursorBox = cursorBox ? { top: lerp(cursorBox.top, box.top, 0.3), height: lerp(cursorBox.height, box.height, 0.3) } : box
      const settled = Math.abs(cursorBox.top - box.top) + Math.abs(cursorBox.height - box.height) < 0.5
      if (settled) cursorBox = box
      ctx.strokeStyle = '#ffffffcc'
      ctx.lineWidth = 2 * dpr
      ctx.strokeRect(4 * dpr, Math.round(cursorBox.top * dpr), Math.round((right + 52) * dpr), Math.round(cursorBox.height * dpr))
      if (!settled) return { html, animating: true }
    } else cursorBox = null

    return { html, animating }
  }

  const hitAt = (x, y) => [...hits].reverse().find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h)?.ship

  return { draw, hitAt }
}
