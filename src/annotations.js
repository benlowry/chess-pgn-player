let moveList

window.setupAnnotations = function () {
  moveList = document.querySelector('.move-list')
  const forms = document.querySelectorAll('.annotate-form')
  for (const form of forms) {
    form.style.display = 'none'
  }
}

window.refreshAnnotations = function () {
  if (!moveList) {
    return
  }
  moveList.innerHTML = ''
  if (document.body.offsetHeight > document.body.offsetWidth) {
    moveList.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight - document.querySelector('.left').offsetHeight) + 'px'
  } else {
    moveList.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight - 1) + 'px'
  }
  moveList.classList.add('timeline1')
  renderMoves(window.pgn.turns, moveList, 1)
}

function expandSequence (sequence) {
  const expanded = [' ']
  for (const item of sequence) {
    if (item.startsWith('{')) {
      const itemParts = item.substring(1, item.length - 1).split(']')
      expanded.push('{', ' ')
      for (const part of itemParts) {
        if (!part.length) {
          continue
        }
        if (part.startsWith('[')) {
          if (expanded[expanded.length - 1] === ' ') {
            expanded.push(`${part}]`, ' ')
          } else {
            expanded.push(' ', `${part}]`, ' ')
          }
        } else {
          expanded.push(part)
        }
      }
      if (expanded[expanded.length - 1] === ' ') {
        expanded.push('}', ' ')
      } else {
        expanded.push(' ', '}', ' ')
      }
      continue
    }
    expanded.push(item, ' ')
  }
  return expanded
}

function renderMoves (blocks, parent, timeline) {
  for (const move of blocks) {
    const li = document.createElement('li')
    li.moveIndex = move.move
    li.move = move
    li.className = 'move-list-item'
    const moveNumber = document.createElement('li')
    moveNumber.className = 'move-sequence-item'
    moveNumber.innerHTML = move.moveNumber + '.'
    const moveMenu = document.createElement('menu')
    moveMenu.className = 'annotate-menu'
    const addAnnotationButton = document.createElement('button')
    addAnnotationButton.className = 'button move-list-button'
    addAnnotationButton.innerHTML = '<i class="fas fa-plus"></i> Annotate'
    addAnnotationButton.annotateForm = 'annotation'
    addAnnotationButton.onclick = showAnnotateForm
    moveMenu.appendChild(addAnnotationButton)
    const addBranchButton = document.createElement('button')
    addBranchButton.className = 'button move-list-button'
    addBranchButton.innerHTML = '<i class="fas fa-plus"></i></span> Alternative moves'
    addBranchButton.title = 'Add alternative move'
    moveMenu.appendChild(addBranchButton)
    li.appendChild(moveMenu)
    const sequence = document.createElement('ul')
    sequence.className = 'move-sequence'
    sequence.appendChild(moveNumber)
    const expandedSequence = expandSequence(move.sequence)
    console.log('expanded sequence', move.pgn, expandedSequence)
    for (const i in expandedSequence) {
      const item = expandedSequence[i]
      const li = document.createElement('li')
      sequence.appendChild(li)
      if (item === ' ') {
        li.className = 'sequence-position-item'
        li.innerHTML = '<input type="radio" name="position" /><i class="fas fa-plus"></i>'
        li.onclick = selectPosition
        continue
      }
      li.className = 'move-sequence-item'
      if (item.startsWith('[')) {
        li.innerHTML = item.split(',').join(' ')
        continue
      }
      if (item.startsWith('$')) {
        li.innerHTML = item
        li.onclick = showEditNagForm
        continue
      }
      if (item.startsWith('{')) {
        li.innerHTML = item
        continue
      }
      if (item.startsWith('(')) {
        li.innerHTML = item.substring(0, 10) + '...)'
        li.title = item
        continue
      }
      li.innerHTML = item
    }
    li.appendChild(sequence)
    if (move.color === 'w') {
      li.classList.add('white-move-link')
    } else {
      li.classList.add('black-move-link')
    }
    if (move.siblings) {
      for (const sibling of move.siblings) {
        timeline++
        const ul = document.createElement('ul')
        ul.className = `move-list timeline${timeline}`
        li.appendChild(ul)
        timeline = renderMoves(sibling, ul, timeline)
        const branchOptions = document.createElement('li')
        branchOptions.className = 'branch-options'
        const addBranchButton = document.createElement('button')
        addBranchButton.className = 'button move-list-button'
        addBranchButton.innerHTML = '<i class="fas fa-plus"></i></span> Add move'
        addBranchButton.title = 'Add move'
        branchOptions.appendChild(addBranchButton)
        const deleteLastButton = document.createElement('button')
        deleteLastButton.className = 'button move-list-button'
        deleteLastButton.innerHTML = '<i class="fas fa-trash"></i></span> Delete last move'
        branchOptions.appendChild(deleteLastButton)
        const deleteBranchButton = document.createElement('button')
        deleteBranchButton.className = 'button move-list-button'
        deleteBranchButton.innerHTML = '<i class="fas fa-trash"></i></span> Delete branch'
        branchOptions.appendChild(deleteBranchButton)
        ul.appendChild(branchOptions)
      }
    }
    parent.appendChild(li)
  }
  return timeline
}

function selectPosition (event) {
  const positionList = event.target.parentNode
  for (const child of positionList.children) {
    if (child === event.target) {
      child.classList.add('selected-position')
    } else {
      child.classList.remove('selected-position')
    }
  }
}

function showAnnotateForm (event) {
  const annotateMenu = document.createElement('menu')
  annotateMenu.className = 'annotate-menu'
  const buttonMenu = event.target.parentNode
  buttonMenu.style.display = 'none'
  buttonMenu.parentNode.insertBefore(annotateMenu, buttonMenu)
  buttonMenu.parentNode.classList.add('show-positioning')
  const addNagButton = document.createElement('button')
  addNagButton.className = 'button annotate-button'
  addNagButton.innerHTML = '<i class="fas fa-dollar-sign"></i></span> Nag'
  addNagButton.onclick = showNagForm
  annotateMenu.appendChild(addNagButton)
  const addAnnotationButton = document.createElement('button')
  addAnnotationButton.className = 'button annotate-button'
  addAnnotationButton.innerHTML = '<i class="fas fa-pencil-alt"></i></span> Annotate'
  annotateMenu.appendChild(addAnnotationButton)
  const addArrowButton = document.createElement('button')
  addArrowButton.className = 'button annotate-button'
  addArrowButton.innerHTML = '<i class="fas fa-chess-board"></i></span> Highlight'
  annotateMenu.appendChild(addArrowButton)
  const cancelButton = document.createElement('button')
  cancelButton.className = 'button cancel-button'
  cancelButton.onclick = closeAnnotateForm
  cancelButton.innerHTML = '<i class="fas fa-window-close"></i></span> Cancel'
  annotateMenu.appendChild(cancelButton)
  return annotateMenu
}

function showNagForm (event) {
  const nagMenu = document.createElement('menu')
  nagMenu.className = 'annotate-menu'
  const annotateMenu = event.target.parentNode
  annotateMenu.parentNode.insertBefore(nagMenu, annotateMenu)
  annotateMenu.parentNode.removeChild(annotateMenu)
  const nagSelect = document.createElement('select')
  nagSelect.className = 'nag-select'
  nagSelect.innerHTML = document.importNode(document.getElementById('nag-index'), true).innerHTML
  nagMenu.appendChild(nagSelect)
  const saveButton = document.createElement('button')
  saveButton.className = 'button annotate-button'
  saveButton.innerHTML = '<i class="fas fa-plus"></i></span> Add'
  saveButton.onclick = addNag
  nagMenu.appendChild(saveButton)
  const cancelButton = document.createElement('button')
  cancelButton.className = 'button cancel-button'
  cancelButton.onclick = closeAnnotateForm
  cancelButton.innerHTML = '<i class="fas fa-window-close"></i></span> Cancel'
  nagMenu.appendChild(cancelButton)
  return nagMenu
}

function showEditNagForm (event) {
  const nagMenu = document.createElement('menu')
  nagMenu.className = 'annotate-menu'
  const annotateMenu = event.target.parentNode
  annotateMenu.parentNode.insertBefore(nagMenu, annotateMenu)
  annotateMenu.parentNode.removeChild(annotateMenu)
  const nagSelect = document.createElement('select')
  nagSelect.className = 'nag-select'
  nagSelect.innerHTML = document.importNode(document.getElementById('nag-index'), true).innerHTML
  nagMenu.appendChild(nagSelect)
  const saveButton = document.createElement('button')
  saveButton.className = 'button annotate-button'
  saveButton.innerHTML = '<i class="fas fa-plus"></i></span> Update'
  saveButton.onclick = updateNag
  nagMenu.appendChild(saveButton)
  const deleteButton = document.createElement('button')
  deleteButton.className = 'button annotate-button'
  deleteButton.innerHTML = '<i class="fas fa-trash"></i></span> Delete'
  deleteButton.onclick = deleteNag
  nagMenu.appendChild(deleteButton)
  const cancelButton = document.createElement('button')
  cancelButton.className = 'button cancel-button'
  cancelButton.onclick = closeAnnotateForm
  cancelButton.innerHTML = '<i class="fas fa-window-close"></i></span> Cancel'
  nagMenu.appendChild(cancelButton)
  return nagMenu
}

function addNag (event) {
  const nagMenu = event.target.parentNode
  const nag = nagMenu.firstChild.value
  let position = 0
  let selectedPosition
  for (const sibling of nagMenu.parentNode.children) {
    if (sibling.className !== 'move-sequence') {
      continue
    }
    for (const item of sibling.children) {
      if (item.classList.contains('move-sequence-item')) {
        continue
      }
      if (item.classList.contains('selected-position')) {
        selectedPosition = item
        break
      }
      position++
    }
    break
  }
  // add js object move
  const move = nagMenu.parentNode.move
  move.sequence.splice(position, 0, { type: 'nag', nag })
  // redraw move sequence
  const newSequenceItem = document.createElement('li')
  newSequenceItem.className = 'move-sequence-item'
  newSequenceItem.innerHTML = nag
  newSequenceItem.onclick = selectPosition
  selectedPosition.parentNode.insertBefore(newSequenceItem, selectedPosition)
  const newPositionItem = document.createElement('li')
  newPositionItem.className = 'sequence-position-item'
  newPositionItem.innerHTML = '<input type="radio" name="position" />'
  newPositionItem.onclick = selectPosition
  selectedPosition.parentNode.insertBefore(newPositionItem, selectedPosition)
  // replace in pgn raw
  let newPGN = move.pgn
  if (position === 0) {
    newPGN = `${nag} ${newPGN}`
  } else {
    const rightOfNag = move.sequence.length > position + 1 ? move.sequence[position + 1] : null
    if (rightOfNag && newPGN.indexOf(rightOfNag) > -1) {
      newPGN = newPGN.replace(rightOfNag, `${nag} ${rightOfNag}`)
    } else {
      const leftOfNag = move.sequence[position - 1].pgn
      if (newPGN.indexOf(leftOfNag) > -1) {
        newPGN = newPGN.replace(leftOfNag, `${leftOfNag} ${nag}`)
      }
    }
  }
  // window.pgnRaw = window.pgnRaw.replace(move.pgn, newPGN)
  return closeAnnotateForm(event)
}

function closeAnnotateForm (event) {
  const annotateMenu = event.target.parentNode
  const container = annotateMenu.parentNode
  container.removeChild(annotateMenu)
  const buttonMenu = container.firstChild
  buttonMenu.style.display = ''
  buttonMenu.parentNode.classList.remove('show-positioning')
}

function addPieceGlyph (text, color, type) {
  let compareText = text
  if (compareText.indexOf('{') > -1) {
    compareText = compareText.substring(0, compareText.indexOf('{'))
  }
  if (type === 'Q') {
    if (compareText.indexOf('Q') > -1) {
      return compareText.replace('Q', `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-queen ${color}-piece-glyph piece-glyph"></i></span> `)
    } else {
      return `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-queen ${color}-piece-glyph piece-glyph"></i></span>&nbsp;${text}`
    }
  }
  if (type === 'K') {
    if (compareText.indexOf('K') > -1) {
      return compareText.replace('K', `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-king ${color}-piece-glyph piece-glyph"></i></span> `)
    } else {
      return `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-king ${color}-piece-glyph piece-glyph"></i></span>&nbsp;${text}`
    }
  }
  if (type === 'B') {
    if (compareText.indexOf('B') > -1) {
      return compareText.replace('B', `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-bishop ${color}-piece-glyph piece-glyph"></i></span> `)
    } else {
      return `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-bishop ${color}-piece-glyph piece-glyph"></i></span>&nbsp;${text}`
    }
  }
  if (type === 'N') {
    if (compareText.indexOf('N') > -1) {
      return compareText.replace('N', `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-knight ${color}-piece-glyph piece-glyph"></i></span> `)
    } else {
      return `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-knight ${color}-piece-glyph piece-glyph"></i></span>&nbsp;${text}`
    }
  }
  if (type === 'R') {
    if (compareText.indexOf('R') > -1) {
      return compareText.replace('R', `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-rook ${color}-piece-glyph piece-glyph"></i></span> `)
    } else {
      return `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-rook ${color}-piece-glyph piece-glyph"></i></span>&nbsp;${text}`
    }
  }
  if (compareText.indexOf('P') > -1) {
    return compareText.replace('P', `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-pawn ${color}-piece-glyph piece-glyph"></i></span> `)
  } else {
    if (compareText.indexOf('.') > -1) {
      const moveNumber = compareText.substring(0, compareText.lastIndexOf('.') + 1)
      const moveWithoutNumber = text.substring(moveNumber.length).trim()
      return `${moveNumber} <span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-pawn ${color}-piece-glyph piece-glyph"></i></span>&nbsp;${moveWithoutNumber}`
    } else {
      return `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-pawn ${color}-piece-glyph piece-glyph"></i></span>&nbsp;${text}`
    }
  }
}
