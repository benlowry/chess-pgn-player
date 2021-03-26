
window.setupTabs = () => {
  const containers = [
    'playback',
    'annotations',
    'pgn',
    'tags'
  ]
  const tabControls = document.querySelectorAll('.tab')
  const left = document.querySelector('.left')
  const right = document.querySelector('.right')
  for (const button of tabControls) {
    button.addEventListener('click', (event) => {
      const id = event.target.className.replace('tab', '').replace('control-', '').replace('current-tab', '').trim()
      for (const containerid of containers) {
        const container = document.querySelector(`.${containerid}-container`)
        if (!container) {
          continue
        }
        const containerButton = document.querySelector(`.control-${containerid}`)
        if (id === containerid) {
          container.style.display = 'block'
          containerButton.classList.add('current-tab')
        } else {
          container.style.display = 'none'
          containerButton.classList.remove('current-tab')
        }
      }
      if (id === 'playback') {
        left.style.display = ''
        right.style.width = ''
      } else {
        left.style.display = 'none'
        right.style.width = '100%'
      }
      return window.dispatchEvent(new window.CustomEvent('refresh'))
    })
  }
  let first = true
  for (const containerid of containers) {
    const container = document.querySelector(`.${containerid}-container`)
    if (!container) {
      continue
    }
    container.style.display = first ? 'block' : 'none'
    first = false
  }
}
