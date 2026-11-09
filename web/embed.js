const switchKey = event => event.altKey && !event.metaKey && !event.ctrlKey
  && (/^Digit[1-9]$/.test(event.code) || event.key === 'ArrowLeft' || event.key === 'ArrowRight')

if (window.parent !== window) {
  window.addEventListener('keydown', event => {
    if (!switchKey(event)) return
    event.preventDefault()
    event.stopImmediatePropagation()
    window.parent.postMessage({ type: 'console-key', key: event.key, code: event.code, altKey: true }, '*')
  }, true)
}
