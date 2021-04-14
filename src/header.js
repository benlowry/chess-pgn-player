let header

window.setupHeader = () => {
  header = document.querySelector('.header')
}

window.refreshHeader = () => {
  if (!header) {
    return
  }
  const properties = Object.keys(window.pgn.tags)
  if (properties.indexOf('White') === -1) {
    properties.push('White')
  }
  if (properties.indexOf('Black') === -1) {
    properties.push('Black')
  }
  if (properties.indexOf('Result') === -1) {
    properties.push('Result')
  }
  for (const property of properties) {
    const element = document.querySelector(`.header-${property.toLowerCase()}`)
    if (!element) {
      continue
    }
    if (window.pgn.tags[property] === '?') {
      continue
    }
    if (property === 'Site') {
      element.innerHTML = '(' + (window.pgn.tags[property] || '?') + ')'
    } else if (property === 'Round') {
      element.innerHTML = '[' + (window.pgn.tags[property] || '?') + ']'
    } else {
      element.innerHTML = window.pgn.tags[property] || '?'
    }
  }
  if (window.pgn.tags.White !== '?' && window.pgn.tags.Black === '?') {
    document.querySelector('.header-title').innerHTML = `<span class="header-player-name">${window.pgn.tags.White}</span>`
  }
}
