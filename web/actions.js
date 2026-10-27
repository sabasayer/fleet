export async function sendAction(ship, action) {
  const token = document.querySelector('meta[name="fleet-token"]')?.content ?? ''
  const res = await fetch('/api/ship', {
    method: 'POST',
    headers: { 'x-fleet-token': token, 'content-type': 'application/json' },
    body: JSON.stringify({ ship, action }),
  })

  return res.ok
}

export const serverError = status => (status === 403 ? 'Fleet restarted since this page loaded. Reload the page.' : `Server answered ${status}.`)
