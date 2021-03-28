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
  let expanded = [' ']
  for (const item of sequence) {
    if (!item.startsWith('{')) {
      expanded.push(item, ' ')
      continue
    }
    const itemParts = item.substring(1, item.length - 1).split(']')
    expanded.push('{', ' ')
    for (const part of itemParts) {
      if (!part.trim().length) {
        continue
      }
      if (part.startsWith('[')) {
        if (expanded[expanded.length - 1] === ' ') {
          expanded.push(`${part}]`, ' ')
        } else {
          expanded.push(' ', `${part}]`, ' ')
        }
        continue
      }
      if (part.indexOf('$') > -1) {
        let copy = part.trim()
        let dollarIndex = copy.indexOf('$')
        const annotationParts = []
        while (dollarIndex > -1) {
          const preamble = copy.substring(0, dollarIndex).trim()
          if (preamble && preamble.length) {
            annotationParts.push(preamble)
          }
          let nag = copy.substring(dollarIndex)
          const spaceIndex = nag.indexOf(' ')
          if (nag.indexOf(' ') > -1) {
            nag = nag.substring(0, spaceIndex)
          }
          if (annotationParts.length) {
            annotationParts.push(' ')
          }
          annotationParts.push(nag)
          copy = copy.substring(dollarIndex + nag.length + 1).trim()
          dollarIndex = copy.indexOf('$')
        }
        if (copy && copy.length) {
          if (annotationParts.length) {
            annotationParts.push(' ')
          }
          annotationParts.push(copy)
        }
        expanded = expanded.concat(annotationParts)
      } else {
        expanded.push(part)
      }
    }
    if (expanded[expanded.length - 1] === ' ') {
      expanded.push('}', ' ')
    } else {
      expanded.push(' ', '}', ' ')
    }
  }
  return expanded
}

function contractExpandedSequence (sequence) {
  let joined = sequence.join(' ').trim()
  while (joined.indexOf('  ') > -1) {
    joined = joined.split('  ').join(' ')
  }
  while (joined.indexOf('{ ') > -1) {
    joined = joined.split('{ ').join('{')
  }
  while (joined.indexOf(' }') > -1) {
    joined = joined.split(' }').join('}')
  }
  while (joined.indexOf('  ') > -1) {
    joined = joined.split('  ').join(' ')
  }
  return window.parser.tokenizeLine(joined)
}

function renderMoves (blocks, parent, timeline) {
  for (const move of blocks) {
    const li = document.createElement('li')
    li.moveIndex = move.move
    li.move = move
    li.className = 'move-list-item'
    const addAnnotationButton = document.createElement('button')
    addAnnotationButton.className = 'button move-option-button'
    addAnnotationButton.innerHTML = '<i class="fas fa-edit"></i>'
    addAnnotationButton.annotateForm = 'annotation'
    addAnnotationButton.onclick = showEditOptions
    const showSpacing = document.createElement('li')
    showSpacing.className = 'move-options-item'
    showSpacing.appendChild(addAnnotationButton)
    const sequence = document.createElement('ul')
    sequence.className = 'move-sequence'
    renderSequence(move.sequence, sequence)
    sequence.insertBefore(showSpacing, sequence.firstChild)
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

function renderSequence (sequence, container, insideSpacingOnly) {
  container.innerHTML = ''
  const expandedSequence = expandSequence(sequence)
  if (insideSpacingOnly) {
    expandedSequence.pop()
    expandedSequence.shift()
  }
  for (const i in expandedSequence) {
    const item = expandedSequence[i]
    const li = document.createElement('li')
    li.onclick = selectPosition
    container.appendChild(li)
    if (item === ' ') {
      li.className = 'sequence-position-item'
      li.innerHTML = '<button class="button move-location-button"><i class="fas fa-circle"></i></button>'
      continue
    }
    li.className = 'move-sequence-item'
    if (item.startsWith('[')) {
      li.innerHTML = item.split(',').join(' ')
      continue
    }
    if (item.startsWith('$')) {
      li.innerHTML = item
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
    if (item.length > 20) {
      li.innerHTML = item.substring(0, 20) + '...'
    } else {
      li.innerHTML = item
    }
  }
}

function selectPosition (event) {
  if (event && event.preventDefault) {
    event.preventDefault()
  }
  const positionList = event.target.parentNode.parentNode
  if (!positionList.classList.contains('move-sequence')) {
    return
  }
  for (const child of positionList.children) {
    if (!child.classList.contains('sequence-position-item')) {
      continue
    }
    if (child.firstChild === event.target) {
      child.classList.add('selected-position')
      child.firstChild.firstChild.classList.remove('fa-circle')
      child.firstChild.firstChild.classList.add('fa-dot-circle')
    } else {
      child.classList.remove('selected-position')
      child.firstChild.firstChild.classList.add('fa-circle')
      child.firstChild.firstChild.classList.remove('fa-dot-circle')
    }
  }
  if (positionList.classList.contains('annotation-sequence')) {
    return
  }
  const moveContainer = positionList.parentNode
  let foundForms = false
  for (const child of moveContainer.children) {
    if (child.classList.contains('annotation-forms')) {
      foundForms = true
      break
    }
  }
  if (!foundForms) {
    const annotationFormsTemplate = document.querySelector('#annotation-forms')
    const annotationForms = document.importNode(annotationFormsTemplate.content, true)
    moveContainer.insertBefore(annotationForms, positionList.nextSibling)
    // tabs for different types of insertion
    const tabButtons = moveContainer.querySelectorAll('.annotation-tab-button')
    for (const button of tabButtons) {
      button.onclick = showAnnotationTab
    }
    showAnnotationTab({ target: tabButtons[0] })
    // tabs for different annotation segments
    const typeButtons = moveContainer.querySelectorAll('.annotation-type-button')
    for (const button of typeButtons) {
      button.onclick = showAnnotationType
    }
    showAnnotationType({ target: typeButtons[0] })
    // set up nag form
    const commitNagButton = moveContainer.querySelector('.add-nag-button')
    commitNagButton.onclick = commitNag
    // set up annotation form
    const moveSequence = moveContainer.querySelector('.annotation-sequence')
    moveContainer.annotationSequence = ['{}']
    renderSequence(moveContainer.annotationSequence, moveSequence, true)
    moveSequence.children[1].classList.add('selected-position')
    moveSequence.children[1].firstChild.firstChild.classList.remove('fa-circle')
    moveSequence.children[1].firstChild.firstChild.classList.add('fa-dot-circle')
    const miniChessBoards = moveContainer.querySelectorAll('.mini-chessboard')
    for (const miniChessBoard of miniChessBoards) {
      setupMiniChessBoard(miniChessBoard.querySelector('.chessboard'))
    }
    const insertTextButton = moveContainer.querySelector('.insert-text-button')
    insertTextButton.onclick = commitAnnotationText
    // cancel buttons
    const cancelButtons = moveContainer.querySelectorAll('.cancel-button')
    for (const button of cancelButtons) {
      button.onclick = cancelAndCloseForm
    }
  }
}

function showAnnotationType (event) {
  if (event && event.preventDefault) {
    event.preventDefault()
  }
  const moveContainer = findMoveContainer(event.target)
  const buttons = moveContainer.querySelectorAll('.annotation-type-button')
  for (const button of buttons) {
    if (button === event.target) {
      button.classList.add('current-annotation-button')
    } else {
      button.classList.remove('current-annotation-button')
    }
  }
  const tabs = moveContainer.querySelectorAll('.annotation-type')
  const buttonIndex = findElementChildIndex(event.target.parentNode)
  let tabIndex = -1
  for (const tab of tabs) {
    tabIndex++
    if (buttonIndex === tabIndex) {
      tab.classList.add('current-annotation-tab')
    } else {
      tab.classList.remove('current-annotation-tab')
    }
  }
}

function showAnnotationTab (event) {
  if (event && event.preventDefault) {
    event.preventDefault()
  }
  const moveContainer = findMoveContainer(event.target)
  const buttons = moveContainer.querySelectorAll('.annotation-tab-button')
  for (const button of buttons) {
    if (button === event.target) {
      button.classList.add('current-annotation-button')
    } else if (button.classList.contains('current-annotation-button')) {
      button.classList.remove('current-annotation-button')
    }
  }
  const tabs = moveContainer.querySelectorAll('.annotation-tab')
  const buttonIndex = findElementChildIndex(event.target.parentNode)
  let tabIndex = -1
  for (const tab of tabs) {
    tabIndex++
    if (buttonIndex === tabIndex) {
      tab.classList.add('current-annotation-tab')
    } else if (tab.classList.contains('current-annotation-tab')) {
      tab.classList.remove('current-annotation-tab')
    }
  }
}

function showEditOptions (event) {
  const button = event.target
  const buttonMenu = button.parentNode.parentNode
  if (button.firstChild.classList.contains('fa-edit')) {
    buttonMenu.parentNode.classList.add('show-positioning')
    button.firstChild.classList.remove('fa-edit')
    button.firstChild.classList.add('fa-minus-circle')
  } else {
    buttonMenu.parentNode.classList.remove('show-positioning')
    button.firstChild.classList.add('fa-edit')
    button.firstChild.classList.remove('fa-minus-circle')
  }
}

function commitNag (event) {
  event.preventDefault()
  const moveContainer = findMoveContainer(event.target)
  const nag = moveContainer.querySelector('.nag-select').value
  const selectedPosition = moveContainer.querySelector('.selected-position')
  const position = findElementChildIndex(selectedPosition)
  const move = moveContainer.move
  const expandedSequence = expandSequence(move.sequence)
  expandedSequence.splice(position || 0, 0, ' ', nag)
  move.sequence = contractExpandedSequence(expandedSequence)
  const addAnnotationButton = document.createElement('button')
  addAnnotationButton.className = 'button move-option-button'
  addAnnotationButton.innerHTML = '<i class="fas fa-edit"></i>'
  addAnnotationButton.annotateForm = 'annotation'
  addAnnotationButton.onclick = showEditOptions
  const showSpacing = document.createElement('li')
  showSpacing.className = 'move-options-item'
  showSpacing.appendChild(addAnnotationButton)
  const sequence = selectedPosition.parentNode
  renderSequence(move.sequence, sequence)
  sequence.insertBefore(showSpacing, sequence.firstChild)
  moveContainer.classList.remove('show-positioning')
}

function commitAnnotationText (event) {
  event.preventDefault()
  const moveContainer = findMoveContainer(event.target)
  const textArea = moveContainer.querySelector('.annotation-text')
  const annotationText = textArea.value
  textArea.value = ''
  const moveSequence = moveContainer.querySelector('.annotation-sequence')
  const selectedPosition = moveSequence.querySelector('.selected-position')
  const position = findElementChildIndex(selectedPosition)
  const expandedSequence = expandSequence(moveContainer.annotationSequence)
  expandedSequence.splice((position || 0) + 1, 0, ' ', annotationText)
  moveContainer.annotationSequence = contractExpandedSequence(expandedSequence)
  renderSequence(moveContainer.annotationSequence, moveSequence, true)
  moveSequence.children[1].firstChild.firstChild.classList.remove('fa-circle')
  moveSequence.children[1].firstChild.firstChild.classList.add('fa-dot-circle')
}

function commitSquareText (event) {
  event.preventDefault()
  const moveContainer = findMoveContainer(event.target)
  const annotationText = '[%csl Ra1,b1,b3]'
  const moveSequence = moveContainer.querySelector('.annotation-sequence')
  const selectedPosition = moveSequence.querySelector('.selected-position')
  const position = findElementChildIndex(selectedPosition)
  const expandedSequence = expandSequence(moveContainer.annotationSequence)
  expandedSequence.splice((position || 0) + 1, 0, ' ', annotationText)
  moveContainer.annotationSequence = contractExpandedSequence(expandedSequence)
  renderSequence(moveContainer.annotationSequence, moveSequence, true)
  moveSequence.children[1].firstChild.firstChild.classList.remove('fa-circle')
  moveSequence.children[1].firstChild.firstChild.classList.add('fa-dot-circle')
}

function setupMiniChessBoard (table) {
  const rows = '87654321'.split('')
  const columns = 'abcdefgh'.split('')
  let white = false
  for (const r of rows) {
    const row = table.insertRow(table.rows.length)
    white = !white
    for (const c of columns) {
      const cell = row.insertCell(row.cells.length)
      cell.id = `${c}${r}`
      cell.className = 'chessboard-square ' + (white ? 'white-square' : 'black-square')
      cell.onclick = unedfined
      white = !white
      if (r === '1') {
        cell.innerHTML = '<sub>' + c + '</sub>'
      }
      if (c === 'a') {
        cell.innerHTML += '<sup>' + r + '</sup>'
      }
      cell.style.width = '12%'
      cell.style.height = '12%'
    }
  }
}

function cancelAndCloseForm (event) {
  event.preventDefault()
  const moveContainer = findMoveContainer(event.target)
  moveContainer.classList.remove('show-positioning')
  const annotationForm = moveContainer.querySelector('.annotation-forms')
  if (annotationForm) {
    annotationForm.parentNode.removeChild(annotationForm)
  }
  const minusCircle = moveContainer.querySelector('.fa-minus-circle')
  minusCircle.classList.remove('fa-minus-circle')
  minusCircle.classList.add('fa-edit')
}

function findMoveContainer (element) {
  let moveContainer = element.parentNode
  while (moveContainer && !moveContainer.classList.contains('move-list-item')) {
    moveContainer = moveContainer.parentNode
  }
  return moveContainer
}

function findElementChildIndex (selectedPosition) {
  if (!selectedPosition) {
    return -1
  }
  for (const i in selectedPosition.parentNode.children) {
    if (selectedPosition.parentNode.children[i] === selectedPosition) {
      return parseInt(i, 10)
    }
  }
  return -1
}
