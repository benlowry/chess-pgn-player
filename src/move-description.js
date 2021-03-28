let moveDescription, nags

window.setupMoveDescription = () => {
  moveDescription = document.querySelector('.move-description')
  const nagIndex = document.querySelector('#nag-index')
  nags = {}
  for (const option of nagIndex.content.children) {
    nags[option.value] = option.text
  }
}

window.renderMoveDescription = () => {
  if (window.turn === -1) {
    moveDescription.style.display = 'none'
    return
  }

  const descriptionText = [
    describeMove()
  ]
  const move = window.turns[window.turn]
  for (const segment of move.sequence) {
    if (segment.startsWith('$')) {
      const nag = nags[segment]
      descriptionText.push(`. <span class="annotation">${nag}</span>`)
      continue
    }
    if (segment.startsWith('[%cal ')) {
      continue
    }
    if (segment.startsWith('[%csl')) {
      continue
    }
    if (segment.startsWith('{')) {
      let cleaned = segment
      while (cleaned.indexOf('[') > -1) {
        cleaned = cleaned.replace(/\[.*?\]/g, '').trim()
      }
      cleaned = cleaned.split('{').join('').split('}').join('').trim()
      if (!cleaned.length) {
        continue
      }
      descriptionText.push(`. <span class="annotation">${cleaned}</span>`)
      continue
    }
  }
  moveDescription.innerHTML = descriptionText.join('')
  moveDescription.style.display = ''
}

function describeMove () {
  if (window.turn > -1) {
    const move = window.turns[window.turn]
    let parts = [move.moveNumber + '.']
    if (move.color === 'w') {
      parts.push('White')
    } else {
      parts.push('Black')
    }
    if (move.queenSideCastling) {
      parts.push('castles')
    } else if (move.kingSideCastling) {
      parts.push('castles')
    } else if (move.coordinateBefore) {
      parts.push(pieceNameIndex[move.type], 'to', move.coordinateBefore)
    }
    if (move.capturing) {
      parts.push('captures', move.to)
    } else if (move.to) {
      parts.push('to', move.to)
    }
    if (move.promoted) {
      parts.push('and promotes', pieceNameIndex[move.type], 'to', move.promoted)
    }
    if (move.checkMate) {
      parts.push('and checkmate')
    } else if (move.check) {
      parts.push('and checks')
    } else if (window.turns === window.pgn.turns && window.turn === window.pgn.turns.length - 1) {
      parts.push('game ends')
    }
    if (move.annotations && move.annotations.length) {
      if (move.annotations.join('').trim()) {
        parts = move.annotations
      }
    }
    return parts.join(' ').replace(' .', '.')
  } else {
  }
}
