window.defaultPieces = JSON.stringify([
  { type: 'R', color: 'b', start: 'a8', coordinate: 'a8', image: 'bR.png' },
  { type: 'N', color: 'b', start: 'b8', coordinate: 'b8', image: 'bN.png' },
  { type: 'B', color: 'b', start: 'c8', coordinate: 'c8', image: 'bB.png' },
  { type: 'Q', color: 'b', start: 'd8', coordinate: 'd8', image: 'bQ.png' },
  { type: 'K', color: 'b', start: 'e8', coordinate: 'e8', image: 'bK.png' },
  { type: 'B', color: 'b', start: 'f8', coordinate: 'f8', image: 'bB.png' },
  { type: 'N', color: 'b', start: 'g8', coordinate: 'g8', image: 'bN.png' },
  { type: 'R', color: 'b', start: 'h8', coordinate: 'h8', image: 'bR.png' },
  { type: 'P', color: 'b', start: 'a7', coordinate: 'a7', image: 'bP.png' },
  { type: 'P', color: 'b', start: 'b7', coordinate: 'b7', image: 'bP.png' },
  { type: 'P', color: 'b', start: 'c7', coordinate: 'c7', image: 'bP.png' },
  { type: 'P', color: 'b', start: 'd7', coordinate: 'd7', image: 'bP.png' },
  { type: 'P', color: 'b', start: 'e7', coordinate: 'e7', image: 'bP.png' },
  { type: 'P', color: 'b', start: 'f7', coordinate: 'f7', image: 'bP.png' },
  { type: 'P', color: 'b', start: 'g7', coordinate: 'g7', image: 'bP.png' },
  { type: 'P', color: 'b', start: 'h7', coordinate: 'h7', image: 'bP.png' },
  { type: 'P', color: 'w', start: 'a2', coordinate: 'a2', image: 'oP.png' },
  { type: 'P', color: 'w', start: 'b2', coordinate: 'b2', image: 'oP.png' },
  { type: 'P', color: 'w', start: 'c2', coordinate: 'c2', image: 'oP.png' },
  { type: 'P', color: 'w', start: 'd2', coordinate: 'd2', image: 'oP.png' },
  { type: 'P', color: 'w', start: 'e2', coordinate: 'e2', image: 'oP.png' },
  { type: 'P', color: 'w', start: 'f2', coordinate: 'f2', image: 'oP.png' },
  { type: 'P', color: 'w', start: 'g2', coordinate: 'g2', image: 'oP.png' },
  { type: 'P', color: 'w', start: 'h2', coordinate: 'h2', image: 'oP.png' },
  { type: 'R', color: 'w', start: 'a1', coordinate: 'a1', image: 'oR.png' },
  { type: 'N', color: 'w', start: 'b1', coordinate: 'b1', image: 'oN.png' },
  { type: 'B', color: 'w', start: 'c1', coordinate: 'c1', image: 'oB.png' },
  { type: 'Q', color: 'w', start: 'd1', coordinate: 'd1', image: 'oQ.png' },
  { type: 'K', color: 'w', start: 'e1', coordinate: 'e1', image: 'oK.png' },
  { type: 'B', color: 'w', start: 'f1', coordinate: 'f1', image: 'oB.png' },
  { type: 'N', color: 'w', start: 'g1', coordinate: 'g1', image: 'oN.png' },
  { type: 'R', color: 'w', start: 'h1', coordinate: 'h1', image: 'oR.png' }
])

window.onload = function () {
  // theme
  const themes = window.themes || [
    'default'
  ]
  const urlParams = new URLSearchParams(window.location.search)
  window.themeName = window.localStorage.getItem('theme') || urlParams.get('theme') || themes[0]
  const link = document.createElement('link')
  link.href = `themes/${window.themeName}/theme.css`
  link.rel = 'stylesheet'
  document.head.appendChild(link)
  // shared method for loading PGN file/text
  window.loadPGNFile = (pgnFileData) => {
    window.turn = -1
    window.pieces = JSON.parse(window.defaultPieces)
    window.pgnRaw = pgnFileData
    try {
      window.pgn = window.parser.parse(pgnFileData)
    } catch (error) {
      return errorMessage(error.message)
    }
    window.turns = window.pgn.turns
    if (!window.components || !window.components.length) {
      const allComponents = [
        { name: 'chessboard', setup: window.setupChessBoard, refresh: window.renderChessBoard },
        { name: 'move-description', setup: window.setupMoveDescription, refresh: window.renderMoveDescription },
        { name: 'playback', setup: window.setupPlayback, refresh: window.refreshPlayback },
        { name: 'header', setup: window.setupHeader, refresh: window.refreshHeader },
        { name: 'tabs', setup: window.setupTabs },
        { name: 'annotations', setup: window.annotations.setupAnnotations, refresh: window.annotations.refreshAnnotations },
        { name: 'pgn', setup: window.setupPGN, refresh: window.refreshPGN },
        { name: 'tags', setup: window.setupTags }
      ]
      window.components = []
      for (const component of allComponents) {
        const element = document.getElementsByClassName(component.name)
        if (!element || !component.setup) {
          continue
        }
        component.setup()
        window.components.push(component)
      }
      window.addEventListener('refresh', refresh)
      window.addEventListener('resize', refresh)
    }
    return refresh()
  }

  function errorMessage (message) {
    console.log('error message', message)
  }

  function refresh (event) {
    if (window.turn === -1) {
      window.pieces = JSON.parse(window.defaultPieces)
    } else if (window.turns === window.pgn.turns && window.turn === window.pgn.turns.length - 1) {
      window.pieces = window.turns[window.turn].pieces
    } else {
      window.pieces = window.turns[window.turn].pieces
    }
    for (const component of window.components) {
      if (component.refresh) {
        component.refresh(event)
      }
    }
  }
  // preload the piece images
  const pieceImages = []
  for (const piece of 'QBKNPR') {
    pieceImages.push(`themes/${window.themeName}/o${piece}.png`)
    pieceImages.push(`themes/${window.themeName}/b${piece}.png`)
  }

  function loadNextImage () {
    if (pieceImages.length === 0) {
      if (window.pgnRaw) {
        return window.loadPGNFile(window.pgnRaw)
      }
      const url = urlParams.get('url') || '/sample1.pgn'
      if (url) {
        return window.Request.get(url, (error, pgnFileData) => {
          if (error) {
            return errorMessage(error.message)
          }
          return window.loadPGNFile(pgnFileData)
        })
      }
    }
    const image = new window.Image()
    image.src = pieceImages.pop()
    image.onload = loadNextImage
  }
  return loadNextImage()
}
