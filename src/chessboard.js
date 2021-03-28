let allPieces, cellIndex, pieceImages, pieceContainer, chessboardContainer, chessboardCells, chessboard, arrowContainer
let headerContainer
let cellSize, halfCellSize, quarterCellSize, eighthCellSize

const pieceNameIndex = {
  K: 'King',
  Q: 'Queen',
  B: 'Bishop',
  N: 'Knight',
  R: 'Rook',
  P: 'Pawn'
}

window.setupChessBoard = (chessboardTable) => {
  chessboard = chessboardTable || document.querySelector('.chessboard')
  chessboardContainer = chessboard.parentNode
  allPieces = JSON.parse(window.defaultPieces)
  pieceContainer = document.createElement('div')
  pieceContainer.className = 'chessboard-pieces'
  chessboardContainer.appendChild(pieceContainer)
  headerContainer = document.querySelector('.header-container')
  arrowContainer = document.querySelector('.chessboard-arrows')
  // draw chessboard
  if (!cellIndex) {
    cellIndex = {}
    chessboardCells = []
    const rows = '87654321'.split('')
    const columns = 'abcdefgh'.split('')
    let white = false
    for (const r of rows) {
      const row = chessboard.insertRow(chessboard.rows.length)
      white = !white
      for (const c of columns) {
        const cell = row.insertCell(row.cells.length)
        cell.id = `${c}${r}`
        cell.className = cell.originalClassName = 'chessboard-square ' + (white ? 'white-square' : 'black-square')
        white = !white
        if (r === '1') {
          cell.innerHTML = '<sub>' + c + '</sub>'
        }
        if (c === 'a') {
          cell.innerHTML += '<sup>' + r + '</sup>'
        }
        cellIndex[cell.id] = cell
        cell.style.width = '12%'
        cell.style.height = '12%'
        chessboardCells.push(cell)
      }
    }
  }
  pieceImages = {}
  for (const piece of allPieces) {
    const pieceImage = document.createElement('img')
    pieceImage.id = `${piece.type}-${piece.color}-${piece.start}`
    pieceImage.src = `themes/${window.themeName}/${piece.image}`
    pieceImage.className = 'chessboard-piece'
    pieceContainer.appendChild(pieceImage)
    pieceImages[`${piece.type}-${piece.color}-${piece.start}`] = pieceImage
  }
}

window.renderChessBoard = (event) => {
  if (!window.pieces || !window.pieces.length) {
    return
  }
  if (!cellSize || (event && event.type === 'resize')) {
    if (document.body.offsetWidth < document.body.offsetHeight) {
      cellSize = Math.min(document.body.offsetWidth / 8.5, convertRemToPixels(4))
    } else {
      cellSize = Math.min(document.body.offsetWidth / 3 / 8.5, convertRemToPixels(4))
    }
    halfCellSize = cellSize / 2
    quarterCellSize = halfCellSize / 2
    eighthCellSize = quarterCellSize / 2
    chessboard.parentNode.style.width = chessboard.style.width = chessboard.style.height = (cellSize * 8) + 'px'
    chessboard.parentNode.style.marginLeft = chessboard.parentNode.style.marginTop = cellSize / 4
    if (arrowContainer) {
      arrowContainer.style.width = arrowContainer.style.height = chessboard.offsetWidth + 'px'
      arrowContainer.innerHTML = ''
      arrowContainer.classList.remove('fade-in')
    }
  }
  for (const cell of chessboardCells) {
    cell.className = cell.originalClassName
  }
  if (arrowContainer) {
    arrowContainer.innerHTML = ''
  }
  const usedPieces = []
  const movingPieces = []
  // track used pieces
  let pieceImage
  for (const piece of window.pieces) {
    pieceImage = pieceImages[`${piece.type}-${piece.color}-${piece.start}`]
    pieceImage.classList.remove('fade-out')
    pieceImage.style.transition = ''
    usedPieces.push(`${piece.type}-${piece.color}-${piece.start}`)
    if (piece.moveSteps) {
      movingPieces.push(piece)
    }
    if (pieceImage.style.width !== `${cellSize}px` || (event && event.type === 'resize')) {
      const cellNumber = '87654321'.indexOf(piece.coordinate[1])
      const rowNumber = 'abcdefgh'.indexOf(piece.coordinate[0])
      const cellX = cellNumber * cellSize
      const cellY = rowNumber * cellSize
      const leftStyle = `${cellY}px`
      const topStyle = `${cellX}px`
      pieceImage.style.transitionDuration = 0
      pieceImage.style.left = leftStyle
      pieceImage.style.top = topStyle
      pieceImage.style.width = `${cellSize}px`
      pieceImage.style.height = `${cellSize}px`
    }
  }
  // remove any unused pieces
  if (usedPieces.length !== allPieces.length) {
    for (const piece of allPieces) {
      if (usedPieces.indexOf(`${piece.type}-${piece.color}-${piece.start}`) > -1) {
        continue
      }
      pieceImage = pieceImages[`${piece.type}-${piece.color}-${piece.start}`]
      pieceImage.classList.add('fade-out')
    }
  }
  if (window.turn === -1) {
    headerContainer.style.display = ''
    return
  }
  const columns = document.querySelector('.columns')
  columns.style.height = chessboard.parentNode.parentNode.offsetHeight + 'px'

  // play move sequence, this is at least the movement
  // arrow and piece sliding but may include more
  const move = window.turns[window.turn]
  const sequence = processSequence(move)
  headerContainer.style.display = 'none'
  let step = 0
  function nextSequenceStep () {
    const delay = parseSequenceStep(move, sequence[step], movingPieces)
    step++
    if (step === sequence.length) {
      return
    }
    return setTimeout(nextSequenceStep, delay)
  }
  return nextSequenceStep()
}

function parseSequenceStep (move, step, movingPieces) {
  // highlight arrow or square
  if (step.type === 'highlight') {
    if (step.arrow) {
      const arrow = drawArrow(step.color, step.from, step.to)
      arrow.classList.add('chessboard-arrow')
      arrow.classList.add(`${step.color}-arrow`)
      arrowContainer.innerHTML += ''
      arrowContainer.classList.add('fade-in')
    } else if (step.square) {
      const square = cellIndex[step.coordinate]
      square.classList.add(`${step.color}-square`)
    }
    return 0
  }
  // move arrow
  if (step.type === 'arrow' && step.arrow === 'move') {
    for (const piece of movingPieces) {
      const castlingOffset = piece.type === 'K' ? -1 : 1
      const arrow = drawArrow('move', piece.coordinateBefore, piece.coordinate, piece.moveSteps, move.kingSideCastling || move.queenSideCastling ? castlingOffset : 0)
      arrow.classList.add('chessboard-arrow')
      arrow.classList.add('move-arrow')
    }
    arrowContainer.innerHTML += ''
    arrowContainer.classList.add('fade-in')
    return 500
  }
  // move coordinate
  if (step.move) {
    for (const piece of movingPieces) {
      const cellNumber = '87654321'.indexOf(piece.coordinate[1])
      const rowNumber = 'abcdefgh'.indexOf(piece.coordinate[0])
      const cellX = cellNumber * cellSize
      const cellY = rowNumber * cellSize
      const leftStyle = `${cellY}px`
      const topStyle = `${cellX}px`
      const pieceImage = pieceImages[`${piece.type}-${piece.color}-${piece.start}`]
      pieceImage.style.left = leftStyle
      pieceImage.style.top = topStyle
      pieceImage.style.transitionDuration = '800ms'
      pieceImage.style.transitionProperty = 'left,top'
    }
    return 800
  }
}

function drawArrow (arrowType, firstCoordinate, lastCoordinate, moveSteps, offsetForCastling) {
  const previousValues = {}
  if (!moveSteps) {
    moveSteps = [firstCoordinate, lastCoordinate]
  }
  let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  arrowContainer.appendChild(svg)
  svg = arrowContainer.lastChild
  svg.setAttribute('style', `stroke-width: ${eighthCellSize}; width: ${chessboard.offsetWidth}px; height: ${chessboard.offsetHeight}px`)
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  svg.appendChild(defs)
  const markerWidth = convertRemToPixels(1) / 4
  const markerHeight = convertRemToPixels(1) / 4
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
  marker.id = `arrow-${arrowType}-${firstCoordinate}-${lastCoordinate}`
  marker.setAttributeNS(null, 'markerWidth', markerWidth)
  marker.setAttributeNS(null, 'markerHeight', markerHeight)
  marker.setAttributeNS(null, 'refX', 0)
  marker.setAttributeNS(null, 'refY', markerHeight / 2)
  marker.setAttributeNS(null, 'orient', 'auto')
  defs.appendChild(marker)
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
  polygon.setAttributeNS(null, 'points', `0,0 ${markerWidth},${markerHeight / 2} 0,${markerHeight}`)
  polygon.style.strokeWidth = 0
  marker.appendChild(polygon)
  for (const i in moveSteps) {
    const stepCoordinate = moveSteps[i]
    const cell = cellIndex[stepCoordinate]
    if (stepCoordinate === firstCoordinate) {
      const xPosition = cell.offsetLeft + halfCellSize
      let yPosition = cell.offsetTop + halfCellSize
      if (offsetForCastling) {
        yPosition += offsetForCastling * quarterCellSize
      }
      previousValues.xPosition = xPosition
      previousValues.yPosition = yPosition
      continue
    }
    const previousCell = cellIndex[moveSteps[i - 1]]
    const previousStepColumn = previousCell.id[0]
    const previousStepRow = previousCell.id[1]
    const currentStepColumn = stepCoordinate[0]
    const currentStepRow = stepCoordinate[1]
    const columnDifference = calculateColumnDifference(previousStepColumn, currentStepColumn)
    const rowDifference = parseInt(previousStepRow, 10) - parseInt(currentStepRow, 10)
    let xPosition = cell.offsetLeft + halfCellSize
    let yPosition = cell.offsetTop + halfCellSize
    if (offsetForCastling) {
      yPosition += offsetForCastling * quarterCellSize
    }
    const line = document.createElement('line')
    line.setAttributeNS(null, 'x1', previousValues.xPosition)
    line.setAttributeNS(null, 'y1', previousValues.yPosition)
    if (stepCoordinate === lastCoordinate) {
      line.setAttributeNS(null, 'marker-end', `url(#arrow-${arrowType}-${firstCoordinate}-${lastCoordinate})`)
      // deduct some length to fit the arrowhead
      if (columnDifference > 0) {
        xPosition += halfCellSize
      } else if (columnDifference < 0) {
        xPosition -= halfCellSize
      }
      if (rowDifference > 0) {
        yPosition -= halfCellSize
      } else if (rowDifference < 0) {
        yPosition += halfCellSize
      }
    }
    line.setAttributeNS(null, 'x2', xPosition)
    line.setAttributeNS(null, 'y2', yPosition)
    svg.appendChild(line)
    previousValues.xPosition = xPosition
    previousValues.yPosition = yPosition
  }
  return svg
}

function calculateColumnDifference (column1, column2) {
  const index1 = 'abcdefgh'.indexOf(column1)
  const index2 = 'abcdefgh'.indexOf(column2)
  if (index1 > index2) {
    return 1
  } else if (index1 === index2) {
    return 0
  } else {
    return -1
  }
}

function processSequence (move) {
  const sequence = []
  for (const segment of move.sequence) {
    if (segment.startsWith('$')) {
      continue
    }
    if (segment.startsWith('[%cal ')) {
      const arrow = true
      const targets = segment.substring(segment.indexOf(' ') + 1, segment.indexOf(']')).split(',')
      for (const target of targets) {
        let color = target.trim().substring(0, 1)
        if (color === 'R') {
          color = 'red'
        } else if (color === 'B') {
          color = 'blue'
        } else if (color === 'Y') {
          color = 'yellow'
        } else if (color === 'G') {
          color = 'green'
        }
        let coordinate = target.trim().substring(1)
        let from, to
        if (coordinate.length === 4) {
          from = coordinate.substring(0, 2)
          to = coordinate.substring(2)
          coordinate = null
        }
        sequence.push({ type: 'highlight', arrow, color, from, to, annotation: segment.annotation })
      }
      continue
    }
    if (segment.startsWith('[%csl')) {
      const square = true
      const targets = segment.substring(segment.indexOf(' ') + 1, segment.indexOf(']')).split(',')
      for (const target of targets) {
        let color = target.trim().substring(0, 1)
        if (color === 'R') {
          color = 'red'
        } else if (color === 'B') {
          color = 'blue'
        } else if (color === 'Y') {
          color = 'yellow'
        } else if (color === 'G') {
          color = 'green'
        }
        const coordinate = target.trim().substring(1).split(',')
        sequence.push({ type: 'highlight', square, color, coordinate, annotation: segment.annotation })
      }
      continue
    }
    if (segment.startsWith('{')) {
      sequence.push({ type: 'annotation', annotation: segment.substring(1, segment.length - 1) })
      continue
    }
    sequence.push({ type: 'arrow', arrow: 'move' }, { type: 'move', move: segment })
  }
  return sequence
}

function convertRemToPixels (rem) {
  return rem * parseFloat(window.getComputedStyle(document.documentElement).fontSize)
}
