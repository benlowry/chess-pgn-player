((exports) => {
  exports.expandAnnotationSequence = expandAnnotationSequence
  exports.nextMoveNumber = nextMoveNumber
  exports.refreshAnnotations = refreshAnnotations
  exports.setupAnnotations = setupAnnotations

  let container, moveList, lastRenderedPGN, timeline

  function setupAnnotations () {
    container = document.querySelector('.annotations-container')
    moveList = document.querySelector('.move-list')
    document.onmousedown = startHighlightArrow
    document.onmousemove = previewHighlightArrow
    document.onmouseup = stopHighlightArrow
  }

  function refreshAnnotations () {
    if (!moveList || container.style.display === 'none') {
      return
    }
    if (lastRenderedPGN !== window.pgn) {
      timeline = 1
      lastRenderedPGN = window.pgn
      moveList.innerHTML = ''
      moveList.classList.add('timeline1')
      renderMoves(window.pgn.turns, moveList)
    }
    if (document.body.offsetHeight > document.body.offsetWidth) {
      moveList.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight - document.querySelector('.left').offsetHeight) + 'px'
    } else {
      moveList.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight - 1) + 'px'
    }
  }

  function expandSequence (sequence, expandAnnotations) {
    const expanded = [' ']
    for (const item of sequence) {
      if (!expandAnnotations || !item.startsWith('{')) {
        expanded.push(item, ' ')
        continue
      }
      const annotationParts = expandAnnotationSequence(item)
      for (const part of annotationParts) {
        expanded.push(part, ' ')
      }
    }
    return expanded
  }

  function findClosingBracket (index, array) {
    let openParantheses = 0
    let openSquare = 0
    let openBrace = 0
    const bracket = array[index].charAt(0)
    let finish = index
    while (finish < array.length) {
      let part = '' + array[finish]
      if (bracket === '(') {
        while (part.indexOf('(') > -1) {
          openParantheses++
          part = part.replace('(', '')
        }
        while (part.indexOf(')') > -1) {
          openParantheses--
          part = part.replace(')', '')
        }
      } else if (bracket === '{') {
        while (part.indexOf('{') > -1) {
          openBrace++
          part = part.replace('{', '')
        }
        while (part.indexOf('}') > -1) {
          openBrace--
          part = part.replace('}', '')
        }
      } else if (bracket === '[') {
        while (part.indexOf('[') > -1) {
          openSquare++
          part = part.replace('[', '')
        }
        while (part.indexOf(']') > -1) {
          openSquare--
          part = part.replace(']', '')
        }
      }
      if (!openParantheses && !openSquare && !openBrace) {
        return finish + 1
      }
      finish++
    }
    return finish
  }

  function expandAnnotationSequence (annotationSequence) {
    if (annotationSequence === '{}') {
      return ['{', '}']
    }
    const lineParts = ['{']
    let copy = annotationSequence.substring(1, annotationSequence.length - 1).trim()
    while (copy.length) {
      const firstCharacter = copy.charAt(0)
      if (firstCharacter === '$') {
        const nag = copy.substring(0, copy.indexOf(' '))
        lineParts.push(nag)
        copy = copy.substring(nag.length).trim()
        continue
      }
      if (firstCharacter === '[') {
        const highlight = copy.substring(0, copy.indexOf(']') + 1)
        lineParts.push(highlight)
        copy = copy.substring(highlight.length).trim()
        continue
      }
      if (firstCharacter === '(') {
        const closingIndex = findClosingBracket(0, copy)
        const nestedMoves = copy.substring(0, closingIndex + 1)
        lineParts.push(nestedMoves)
        copy = copy.substring(nestedMoves.length).trim()
        continue
      }
      if (firstCharacter === '{') {
        const closingIndex = findClosingBracket(0, copy)
        const nestedAnnotation = copy.substring(0, closingIndex + 1)
        lineParts.push(nestedAnnotation)
        copy = copy.substring(nestedAnnotation.length).trim()
        continue
      }
      const nextSegment = copy.substring(0, firstInterruption(copy))
      copy = copy.substring(nextSegment.length).trim()
      lineParts.push(nextSegment)
    }
    lineParts.push('}')
    return lineParts
  }

  function firstInterruption (text) {
    const nextBrace = text.indexOf('{')
    const nextParanthesis = text.indexOf('(')
    const nextSquare = text.indexOf('[')
    const nextDollar = text.indexOf('$')
    if (nextBrace === -1 && nextParanthesis === -1 && nextSquare === -1 && nextDollar === -1) {
      return text.length
    }
    const valid = []
    if (nextBrace > -1) {
      valid.push({ nextBrace, value: nextBrace })
    }
    if (nextParanthesis > -1) {
      valid.push({ nextParanthesis, value: nextParanthesis })
    }
    if (nextSquare > -1) {
      valid.push({ nextSquare, value: nextSquare })
    }
    if (nextDollar > -1) {
      valid.push({ nextDollar, value: nextDollar })
    }
    valid.sort((a, b) => {
      return a.value > b.value ? 1 : -1
    })
    return valid[0].value
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
    let parser
    if (typeof require !== 'undefined') {
      parser = require('pgn-parser')
    } else {
      parser = window.parser
    }
    return parser.tokenizeLine(joined)
  }

  function renderMoves (moves, parent) {
    for (const move of moves) {
      let li = createFromTemplate('#move-components-template')
      parent.appendChild(li)
      li = parent.lastElementChild
      li.move = move
      li.sequence = move.sequence
      const sequence = li.querySelector('.move-components')
      renderSequence(move.sequence, sequence)
      resetMoveContainerButtons(li)
      if (move.color === 'w') {
        li.classList.add('white-move-link')
      } else {
        li.classList.add('black-move-link')
      }
      if (!move.siblings || !move.siblings.length) {
        continue
      }
      for (const sibling of move.siblings) {
        timeline++
        let ul = createFromTemplate('#sibling-components-template')
        li.appendChild(ul)
        ul = li.lastElementChild
        ul.classList.add(`timeline${timeline}`)
        timeline = renderMoves(sibling, ul)
      }
    }
    return timeline
  }

  function renderSequence (sequence, container, insideSpacingOnly) {
    container.innerHTML = ''
    const expandedSequence = expandSequence(sequence, !!insideSpacingOnly)
    if (insideSpacingOnly) {
      expandedSequence.pop()
      expandedSequence.shift()
    }
    const renderingAnnotation = container.classList.contains('annotation-components')
    for (const i in expandedSequence) {
      const item = expandedSequence[i]
      const li = document.createElement('li')
      const nag = item.startsWith('$')
      const annotation = item.startsWith('{')
      const space = item === ' '
      if (nag || annotation || space || renderingAnnotation) {
        if (renderingAnnotation) {
          if (item !== '{' && item !== '}') {
            li.onmousedown = selectAnnotationSequencePosition
            li.position = i
            li.sequence = expandedSequence
          } else {
            li.style.pointerEvents = 'none'
            li.mouseEnabled = false
          }
        } else {
          li.onmousedown = selectMoveComponentsPosition
          li.position = i
          li.sequence = expandedSequence
        }
      } else {
        li.style.pointerEvents = 'none'
        li.mouseEnabled = false
      }
      container.appendChild(li)
      if (item === ' ') {
        li.className = 'sequence-position-item'
        li.innerHTML = '<button class="button move-location-button"><i class="fas fa-circle"></i></button>'
        li.firstChild.mouseEnabled = false
        continue
      }
      li.className = 'move-components-item'
      if (item.length > 30) {
        li.title = item
        li.innerHTML = item.substring(0, 20) + '...'
        if (item.charAt(0) === '{') {
          li.innerHTML += '}'
        }
        if (item.charAt(0) === '(') {
          li.innerHTML += ')'
        }
      } else {
        li.innerHTML = item
      }
    }
    return container
  }

  function selectMoveComponentsPosition (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    const positionList = moveContainer.querySelector('.move-components')
    let editing
    for (const child of positionList.children) {
      if (child.classList.contains('edit-position')) {
        child.classList.remove('edit-position')
      }
      if (child.classList.contains('selected-position')) {
        child.classList.remove('selected-position')
      }
      if (!child.classList.contains('sequence-position-item')) {
        if (child === event.target) {
          if (child.innerHTML === '{' || child.innerHTML === '}') {
            continue
          }
          editing = true
        }
        continue
      }
      if (child.firstChild === event.target || child === event.target) {
        child.classList.add('selected-position')
        child.firstChild.firstChild.classList.remove('fa-circle')
        child.firstChild.firstChild.classList.add('fa-dot-circle')
      } else {
        child.firstChild.firstChild.classList.add('fa-circle')
        child.firstChild.firstChild.classList.remove('fa-dot-circle')
      }
    }
    if (editing) {
      return editMoveComponentsPosition(event)
    }
    const newForm = makeInsertionTypeSelector(moveContainer)
    const moveForms = moveContainer.querySelector('.move-forms')
    moveForms.innerHTML = ''
    moveForms.appendChild(newForm)
  }

  function editMoveComponentsPosition (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    expandMoveContainer(moveContainer)
    const sequence = moveContainer.querySelector('.move-components')
    const position = findElementChildIndex(event.target) - 1
    for (const child of sequence.children) {
      if (child === event.target) {
        child.classList.add('edit-position')
      } else if (child.classList.contains('edit-position')) {
        child.classList.remove('edit-position')
      }
    }
    const existingForm = moveContainer.querySelector('.annotation-form')
    if (existingForm) {
      existingForm.parentNode.removeChild(existingForm)
    }
    const formSelector = moveContainer.querySelector('.insertion-form-selector')
    if (formSelector) {
      formSelector.parentNode.removeChild(formSelector)
    }
    const expandedSequence = expandSequence(moveContainer.sequence)
    const moveForms = moveContainer.querySelector('.move-forms')
    moveForms.innerHTML = ''
    const editing = expandedSequence[position]
    // editing a nag
    if (event.target.innerHTML.startsWith('$')) {
      const newForm = makeNagForm('#edit-nag-form')
      const nagSelect = newForm.querySelector('.nag-select')
      nagSelect.selectedIndex = parseInt(editing.substring(1), 10)
      const cancelButton = newForm.querySelector('.cancel-button')
      cancelButton.onclick = cancelAndCloseForm
      const formSelector = moveContainer.querySelector('.insertion-form-selector')
      if (formSelector) {
        formSelector.parentNode.removeChild(formSelector)
      }
      moveForms.appendChild(newForm)
      return
    }
    // editing an annotation
    if (event.target.innerHTML.startsWith('{')) {
      const newForm = makeAnnotationEditor(moveContainer, window.parser.tokenizeLine(editing))
      moveForms.appendChild(newForm)
    }
  }

  function selectAnnotationSequencePosition (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    const positionList = moveContainer.querySelector('.annotation-components')
    let editing
    for (const child of positionList.children) {
      if (child.classList.contains('edit-position')) {
        child.classList.remove('edit-position')
      }
      if (child.classList.contains('selected-position')) {
        child.classList.remove('selected-position')
      }
      if (!child.classList.contains('sequence-position-item')) {
        if (child === event.target) {
          if (child.innerHTML === '{' || child.innerHTML === '}') {
            continue
          }
          editAnnotationSequencePosition(event)
          editing = true
        }
        continue
      }
      if (child.firstChild === event.target || child === event.target) {
        child.classList.add('selected-position')
        child.firstChild.firstChild.classList.remove('fa-circle')
        child.firstChild.firstChild.classList.add('fa-dot-circle')
      } else {
        child.firstChild.firstChild.classList.add('fa-circle')
        child.firstChild.firstChild.classList.remove('fa-dot-circle')
      }
    }
    if (editing) {
      return
    }
    const newForm = makeAnnotationTypeSelector(moveContainer)
    const formContainer = moveContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    formContainer.appendChild(newForm)
  }

  function editAnnotationSequencePosition (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    const components = moveContainer.querySelector('.annotation-components')
    const position = findElementChildIndex(event.target)
    for (const child of components.children) {
      if (child === event.target) {
        child.classList.add('edit-position')
      } else if (child.classList.contains('edit-position')) {
        child.classList.remove('edit-position')
      }
    }
    const expandedSequence = expandSequence(moveContainer.annotationSequence, true)
    expandedSequence.pop()
    expandedSequence.shift()
    const formContainer = moveContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    const editing = expandedSequence[position]
    if (event.target.innerHTML.startsWith('[%cal')) {
      const newForm = makeAnnotationArrowForm(moveContainer, '#edit-arrow-annotation-form')
      formContainer.appendChild(newForm)
      let arrowData = event.target.innerHTML.substring('[%cal '.length)
      arrowData = arrowData.substring(0, arrowData.indexOf(']'))
      const pendingList = formContainer.querySelector('.pending-list')
      const arrows = arrowData.split(',')
      for (const arrow of arrows) {
        let color
        switch (arrow[0]) {
          case 'R':
            color = 'red'
            break
          case 'G':
            color = 'green'
            break
          case 'Y':
            color = 'yellow'
            break
          case 'B':
            color = 'blue'
            break
        }
        const activeColorButton = formContainer.querySelector(`.${color}-arrow-button`)
        const colorText = activeColorButton.innerHTML.substring(activeColorButton.innerHTML.indexOf('</i>') + 4)
        const column1 = arrow[1]
        const row1 = arrow[2]
        const coordinate1 = `${column1}${row1}`
        const column2 = arrow[3]
        const row2 = arrow[4]
        const coordinate2 = `${column2}${row2}`
        const listItem = document.createElement('li')
        listItem.innerHTML = `<span class="${color}">${colorText} <i>${coordinate1}</i> <i>${coordinate2}</i></span>`
        const chessBoard = formContainer.querySelector('.chessboard')
        const highlightContainer = formContainer.querySelector('.highlight-arrow-container')
        const arrowSVG = drawArrow(coordinate1, coordinate2, chessBoard, highlightContainer)
        arrowSVG.classList.add('chessboard-arrow')
        arrowSVG.classList.add(`${color}-arrow`)
        arrowSVG.style.width = chessBoard.offsetWidth
        arrowSVG.style.height = chessBoard.offsetHeight
        arrowSVG.innerHTML += ''
        const deleteButton = document.createElement('button')
        deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete'
        deleteButton.className = 'button annotation-form-button'
        deleteButton.color = color
        deleteButton.arrow = arrowSVG
        deleteButton.onclick = deleteArrow
        listItem.appendChild(deleteButton)
        pendingList.appendChild(listItem)
      }
      const cancelButton = formContainer.querySelector('.cancel-button')
      cancelButton.onclick = cancelAndCloseForm
      return
    }
    if (event.target.innerHTML.startsWith('[%csl')) {
      const newForm = makeAnnotationSquareForm(moveContainer, '#edit-square-annotation-form')
      formContainer.appendChild(newForm)
      let squareData = event.target.innerHTML.substring('[%cal '.length)
      squareData = squareData.substring(0, squareData.indexOf(']'))
      const pendingList = formContainer.querySelector('.pending-list')
      const squares = squareData.split(',')
      for (const square of squares) {
        let color
        switch (square.charAt(0)) {
          case 'R':
            color = 'red'
            break
          case 'G':
            color = 'green'
            break
          case 'Y':
            color = 'yellow'
            break
          case 'B':
            color = 'blue'
            break
        }
        const activeColorButton = formContainer.querySelector(`.${color}-square-button`)
        const colorText = activeColorButton.innerHTML.substring(activeColorButton.innerHTML.indexOf('</i>') + 4)
        const column = square[1]
        const row = square[2]
        const coordinate = `${column}${row}`
        const cell = formContainer.querySelector(`.coordinate-${column}${row}`)
        cell.classList.add(`${color}-square`)
        const listItem = document.createElement('li')
        listItem.innerHTML = `<span class="${color}">${colorText} <i>${coordinate}</i></span>`
        const deleteButton = document.createElement('button')
        deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete'
        deleteButton.className = 'button annotation-form-button'
        deleteButton.square = cell
        deleteButton.color = color
        deleteButton.onclick = deleteSquare
        listItem.appendChild(deleteButton)
        pendingList.appendChild(listItem)
      }
      const cancelButton = formContainer.querySelector('.cancel-button')
      cancelButton.onclick = cancelAndCloseForm
      return
    }
    // a text block
    const newForm = makeAnnotationTextForm(moveContainer, '#edit-text-annotation-form')
    const textarea = newForm.querySelector('.annotation-text')
    textarea.value = editing
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.onclick = cancelAndCloseForm
    formContainer.appendChild(newForm)
  }

  function cancelAndCloseForm (event) {
    event.preventDefault()
    const moveContainer = findMoveContainer(event.target)
    const moveForms = moveContainer.querySelector('.move-forms')
    moveForms.innerHTML = ''
    unexpandMoveContainer(moveContainer)
    unselectMoveComponentsPosition(moveContainer)
  }

  function switchForm (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const button = event.target
    const formCreator = button.formCreator
    const moveContainer = findMoveContainer(event.target)
    const newForm = formCreator(moveContainer)
    if (button.formContainer) {
      button.formContainer.innerHTML = ''
      return button.formContainer.appendChild(newForm)
    }
    const moveForms = moveContainer.querySelector('.move-forms')
    moveForms.innerHTML = ''
    moveForms.appendChild(newForm)
    if (button.formSetup) {
      button.formSetup(moveContainer)
    }
  }

  function makeInsertionTypeSelector () {
    const template = document.querySelector('#insertion-form-selector')
    const form = document.importNode(template.content, true)
    const nagButton = form.querySelector('.nag-button')
    nagButton.formCreator = makeNagForm
    nagButton.onclick = switchForm
    const annotationButton = form.querySelector('.annotation-button')
    annotationButton.formCreator = makeAnnotationEditor
    annotationButton.formSetup = setupAnnotationEditor
    annotationButton.onclick = switchForm
    const alternativeMovesButton = form.querySelector('.alternative-moves-button')
    alternativeMovesButton.formCreator = makeAlternativeMovesForm
    alternativeMovesButton.onclick = switchForm
    const quizButton = form.querySelector('.quiz-button')
    quizButton.formCreator = makeQuizForm
    quizButton.onclick = switchForm
    const cancelButton = form.querySelector('.cancel-button')
    cancelButton.onclick = cancelAndCloseForm
    return form
  }

  function makeAnnotationEditor (moveContainer, annotationSequence) {
    const form = createFromTemplate('#annotation-editor')
    const moveComponents = moveContainer.querySelector('.move-components')
    const annotationComponents = form.querySelector('.annotation-components')
    moveContainer.annotationSequence = annotationSequence || ['{}']
    renderSequence(moveContainer.annotationSequence, annotationComponents, true)
    const formContainer = form.querySelector('.annotation-form-container')
    const editing = !!moveComponents.querySelector('.edit-position')
    makeAnnotationOptionSelector(formContainer, editing)
    const cancelButton = formContainer.querySelector('.cancel-button')
    cancelButton.onclick = cancelAndCloseForm
    return form
  }
  function setupAnnotationEditor (moveContainer) {
    const annotationComponents = moveContainer.querySelector('.annotation-components')
    const preselectPosition = annotationComponents.children.length === 5 ? annotationComponents.children[2] : annotationComponents.children[annotationComponents.children.length - 2]
    selectAnnotationSequencePosition({
      target: preselectPosition
    })
  }

  function makeAnnotationOptionSelector (formContainer, editing) {
    const form = createFromTemplate('#annotation-editor-options')
    formContainer.innerHTML = ''
    formContainer.appendChild(form)
    const insertAnnotationButton = formContainer.querySelector('.insert-annotation-button')
    insertAnnotationButton.onclick = addAnnotation
    insertAnnotationButton.style.display = editing ? 'none' : 'inline-block'
    const updateAnnotationButton = formContainer.querySelector('.update-annotation-button')
    updateAnnotationButton.onclick = updateAnnotation
    updateAnnotationButton.style.display = editing ? 'inline-block' : 'none'
    const cancelButton = formContainer.querySelector('.cancel-button')
    cancelButton.formCreator = makeInsertionTypeSelector
    cancelButton.onclick = switchForm
    return form
  }

  function makeAnnotationTypeSelector (moveContainer) {
    const form = createFromTemplate('#annotation-type-selector')
    const formContainer = moveContainer.querySelector('.annotation-form-container')
    const addTextButton = form.querySelector('.add-text-button')
    addTextButton.formCreator = makeAnnotationTextForm
    addTextButton.formContainer = formContainer
    addTextButton.onclick = switchForm
    const addSquareButton = form.querySelector('.add-square-button')
    addSquareButton.formCreator = makeAnnotationSquareForm
    addSquareButton.formContainer = formContainer
    addSquareButton.onclick = switchForm
    const addArrowButton = form.querySelector('.add-arrow-button')
    addArrowButton.formCreator = makeAnnotationArrowForm
    addArrowButton.formContainer = formContainer
    addArrowButton.onclick = switchForm
    const cancelButton = form.querySelector('.cancel-button')
    cancelButton.formCreator = makeAnnotationEditor
    cancelButton.onclick = switchForm
    return form
  }

  function makeNagForm (eventOrTemplate) {
    const template = eventOrTemplate && eventOrTemplate.substring ? eventOrTemplate : '#new-nag-form'
    const newForm = createFromTemplate(template)
    const nagIndex = document.querySelector('#nag-index')
    const nagSelect = newForm.querySelector('.nag-select')
    nagSelect.innerHTML = nagIndex.content.firstElementChild.innerHTML
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeInsertionTypeSelector
    cancelButton.onclick = switchForm
    const addNagButton = newForm.querySelector('.add-nag-button')
    if (addNagButton) {
      addNagButton.onclick = addNag
    }
    const updateNagButton = newForm.querySelector('.update-nag-button')
    if (updateNagButton) {
      updateNagButton.onclick = updateNag
    }
    const deleteNagButton = newForm.querySelector('.delete-nag-button')
    if (deleteNagButton) {
      deleteNagButton.onclick = deleteNag
    }
    return newForm
  }

  function makeAlternativeMovesForm (moveContainer) {
    const newForm = createFromTemplate('#new-alternative-moves-form')
    const chessBoard = newForm.querySelector('.chessboard')
    const previousMoveState = {
      pieces: moveContainer.move.previousPieces
    }
    if (moveContainer.move.color === 'w') {
      newForm.querySelector('.black-move-title').style.display = 'none'
    } else {
      newForm.querySelector('.white-move-title').style.display = 'none'
    }
    const hitArea = chessBoard.parentNode.querySelector('.alternative-moves-hitarea')
    hitArea.onmousedown = selectAlternativePiece
    hitArea.onmouseup = moveAlternativePiece
    moveContainer.alternativeMoves = []
    setupMiniChessBoard(chessBoard, hitArea, previousMoveState, true)
    const insertButton = newForm.querySelector('.insert-alternative-moves-button')
    insertButton.onclick = insertAlternativeMove
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeInsertionTypeSelector
    cancelButton.onclick = switchForm
    return newForm
  }

  function selectAlternativePiece (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    console.log('selecting alternative piece')
    const moveContainer = findMoveContainer(event.target)
    const pieces = moveContainer.move.previousPieces
    const coordinate = event.target.className.split('-').pop()
    if ('abcdefgh'.indexOf(coordinate[0]) === -1) {
      return
    }
    if ('12345678'.indexOf(coordinate[1]) === -1) {
      return
    }
    let requiredColor
    if (moveContainer.alternativeMoves && moveContainer.alternativeMoves.length) {
      requiredColor = moveContainer.alternativeMoves[moveContainer.alternativeMoves.length - 1].color === 'w' ? 'b' : 'w'
    } else {
      requiredColor = moveContainer.move.color === 'w' ? 'w' : 'b'
    }
    console.log('got valid coordinate', coordinate)
    let selectedPiece
    for (const piece of pieces) {
      if (piece.coordinate === coordinate) {
        selectedPiece = piece
        break
      }
    }
    if (!selectedPiece || selectedPiece.color !== requiredColor) {
      delete (moveContainer.selectedPiece)
      return
    }
    moveContainer.selectedPiece = selectedPiece
  }

  function moveAlternativePiece (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    if (!moveContainer.selectedPiece) {
      return
    }
    const coordinate = event.target.className.split('-').pop()
    if ('abcdefgh'.indexOf(coordinate[0]) === -1) {
      return
    }
    if ('12345678'.indexOf(coordinate[1]) === -1) {
      return
    }
    const alternativeMoves = moveContainer.alternativeMoves
    let pieces, moveNumber, dots, color
    if (alternativeMoves.length) {
      pieces = alternativeMoves[alternativeMoves.length - 1].pieces
      moveNumber = nextMoveNumber(alternativeMoves[alternativeMoves.length - 1])
      dots = alternativeMoves[alternativeMoves.length - 1].color === 'w' ? '...' : '.'
      color = moveContainer.alternativeMoves[moveContainer.alternativeMoves.length - 1].color === 'w' ? 'b' : 'w'
    } else {
      pieces = moveContainer.move.previousPieces
      moveNumber = moveContainer.move.moveNumber
      dots = moveContainer.move.color === 'w' ? '.' : '...'
      color = moveContainer.move.color === 'w' ? 'w' : 'b'
    }
    const pseudoMove = {
      color,
      moveNumber,
      to: coordinate,
      pieces: JSON.parse(JSON.stringify(pieces)),
      piece: moveContainer.selectedPiece
    }
    const movement = window.parser.calculatePieceMovement(pseudoMove.piece, pseudoMove, pseudoMove.pieces)
    if (!movement) {
      return
    }
    for (const piece of pseudoMove.pieces) {
      if (piece.type === pseudoMove.piece.type && piece.coordinate === pseudoMove.piece.coordinate) {
        piece.coordinate = coordinate
        break
      }
    }
    // todo:
    // 1) captured pieces do not process
    // 2) promoted pieces do not process
    // 3) cannot move a piece two times
    // 4) cannot add alternative moves to new alternative moves
    // 5) inserted text is excesssively specific (1. Pee4 vs 1. e2 with type and column inferred)
    // 6) cannot delete the last move in pending list
    // 7) cannot "edit" existing alternative moves ie delete last or add next move
    const chessBoard = moveContainer.querySelector('.alternative-moves-chessboard')
    const cellBefore = chessBoard.querySelector(`.coordinate-${moveContainer.selectedPiece.coordinate}`)
    const cellAfter = chessBoard.querySelector(`.coordinate-${coordinate}`)
    cellAfter.style.backgroundImage = cellBefore.style.backgroundImage
    cellBefore.style.backgroundImage = ''
    alternativeMoves.push(pseudoMove)
    const pendingList = moveContainer.querySelector('.pending-move-list')
    const listItem = document.createElement('li')
    listItem.innerHTML = `<span>${moveNumber}${dots} ${pseudoMove.piece.type} <i>${pseudoMove.piece.coordinate}</i> to <i>${coordinate}</i></span>`
    pendingList.appendChild(listItem)
  }

  function nextMoveNumber (previousMove) {
    const previousNumber = parseInt(previousMove.moveNumber, 10)
    if (previousMove.color === 'w') {
      return previousNumber
    }
    return previousNumber + 1
  }

  function insertAlternativeMove (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    const pendingList = moveContainer.querySelector('.pending-move-list')
    const annotationParts = []
    for (const child of pendingList.children) {
      let moveNumber = child.innerHTML.substring('<span>'.length)
      moveNumber = moveNumber.substring(0, moveNumber.indexOf(' '))
      let coordinate = child.innerHTML.substring(child.innerHTML.lastIndexOf('<i>') + 3)
      coordinate = coordinate.substring(0, coordinate.indexOf('<'))
      let coordinateBefore = child.innerHTML.substring(child.innerHTML.indexOf('<i>') + 3)
      coordinateBefore = coordinateBefore[0]
      let piece = child.innerHTML.substring(child.innerHTML.indexOf(' ') + 1)
      piece = piece[0]
      // TODO: this is a very verbose "1.Kde4" structure, it should be
      // possible to calculate the smallest unambiguous expression
      annotationParts.push(`${moveNumber}${piece}${coordinateBefore}${coordinate}`)
    }
    const annotationText = `(${annotationParts.join(' ')})`
    const sibling = window.parser.parseTurn(annotationText.substring(1, annotationText.length - 1))
    const selectedItem = moveContainer.querySelector('.selected-position')
    const expandedSequence = selectedItem.sequence
    const position = selectedItem.position
    expandedSequence.splice(position, 0, ' ', annotationText)
    moveContainer.sequence = moveContainer.move.sequence = contractExpandedSequence(expandedSequence)
    const moveComponents = moveContainer.querySelector('.move-components')
    renderSequence(moveContainer.sequence, moveComponents)
    resetMoveContainerButtons(moveContainer)
    const moveForms = moveContainer.querySelector('.move-forms')
    moveForms.innerHTML = ''
    unselectMoveComponentsPosition(moveContainer)
    unexpandMoveContainer(moveContainer)

    let ul = createFromTemplate('#sibling-components-template')
    moveContainer.appendChild(ul)
    ul = moveContainer.lastElementChild
    ul.className = `move-list timeline${timeline++}`
    moveContainer.move.siblings = moveContainer.move.siblings || []
    moveContainer.move.siblings.push(sibling)
    renderMoves(sibling, ul)
  }

  function makeQuizForm () {
    const newForm = createFromTemplate('#new-quiz-form')
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeInsertionTypeSelector
    cancelButton.onclick = switchForm
    return newForm
  }

  function makeAnnotationTextForm (moveContainer, template) {
    const formContainer = moveContainer.querySelector('.annotation-form-container')
    const newForm = createFromTemplate(template || '#new-text-annotation-form')
    const insertTextButton = newForm.querySelector('.insert-text-button')
    if (insertTextButton) {
      insertTextButton.onclick = insertAnnotationText
    }
    const updateButton = newForm.querySelector('.update-text-button')
    if (updateButton) {
      updateButton.onclick = updateAnnotationText
    }
    const deleteButton = newForm.querySelector('.delete-text-button')
    if (deleteButton) {
      deleteButton.onclick = deleteAnnotationText
    }
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeAnnotationTypeSelector
    cancelButton.formContainer = formContainer
    cancelButton.onclick = switchForm
    return newForm
  }

  function makeAnnotationSquareForm (moveContainer, templateid) {
    const formContainer = moveContainer.querySelector('.annotation-form-container')
    const newForm = createFromTemplate(templateid || '#new-square-annotation-form')
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeAnnotationTypeSelector
    cancelButton.formContainer = formContainer
    cancelButton.onclick = switchForm
    if (templateid) {
      const updateButton = newForm.querySelector('.update-squares-text-button')
      updateButton.onclick = updateSquareText
    } else {
      const insertButton = newForm.querySelector('.insert-squares-text-button')
      insertButton.onclick = insertSquareText
    }
    const colors = newForm.querySelectorAll('.square-color')
    for (const color of colors) {
      color.onclick = selectColor
    }
    const manualAddButton = newForm.querySelector('.highlight-square-button')
    manualAddButton.onclick = manuallyAddSquare
    const resetButton = newForm.querySelector('.reset-squares-button')
    resetButton.onclick = (event) => {
      if (event && event.preventDefault) {
        event.preventDefault()
      }
      const chessBoard = (event ? findMoveContainer(event.target) : newForm).querySelector('.chessboard')
      chessBoard.onclick = clickHighlightSquareCell
      chessBoard.innerHTML = ''
      setupMiniChessBoard(chessBoard, null, moveContainer.move)
      const pendingList = (event ? findMoveContainer(event.target) : newForm).querySelector('.pending-list')
      pendingList.innerHTML = ''
    }
    resetButton.onclick()
    return newForm
  }

  function manuallyAddSquare (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    const chessboard = moveContainer.querySelector('.annotate-square-chessboard')
    const column = document.querySelector('.select-column')
    const row = document.querySelector('.select-row')
    const coordinate = column.value + row.value
    column.selectedIndex = 0
    row.selectedIndex = 0
    return clickHighlightSquareCell({
      target: chessboard.querySelector(`.coordinate-${coordinate}`)
    })
  }

  function makeAnnotationArrowForm (moveContainer, templateid) {
    const formContainer = moveContainer.querySelector('.annotation-form-container')
    const newForm = createFromTemplate(templateid || '#new-arrow-annotation-form')
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeAnnotationTypeSelector
    cancelButton.formContainer = formContainer
    cancelButton.onclick = switchForm
    if (templateid) {
      const updateButton = newForm.querySelector('.update-arrows-text-button')
      updateButton.onclick = updateArrowText
    } else {
      const insertButton = newForm.querySelector('.insert-arrows-text-button')
      insertButton.onclick = insertArrowText
    }
    const colors = newForm.querySelectorAll('.arrow-color')
    for (const color of colors) {
      color.onclick = selectColor
    }
    const manualAddButton = newForm.querySelector('.highlight-arrow-button')
    manualAddButton.onclick = manuallyAddArrow
    const resetButton = newForm.querySelector('.reset-arrows-button')
    resetButton.onclick = (event) => {
      if (event && event.preventDefault) {
        event.preventDefault()
      }
      const chessBoard = (event ? findMoveContainer(event.target) : newForm).querySelector('.chessboard')
      chessBoard.innerHTML = ''
      const hitArea = chessBoard.parentNode.querySelector('.annotate-arrow-hitarea')
      hitArea.innerHTML = ''
      setupMiniChessBoard(chessBoard, hitArea, moveContainer.move)
      const pendingList = (event ? findMoveContainer(event.target) : newForm).querySelector('.pending-list')
      pendingList.innerHTML = ''
    }
    resetButton.onclick()
    return newForm
  }

  function manuallyAddArrow (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    const chessboard = moveContainer.querySelector('.annotate-arrow-chessboard')
    const column1 = document.querySelector('.select-column-start')
    const row1 = document.querySelector('.select-row-start')
    const coordinate1 = column1.value + row1.value
    column1.selectedIndex = 0
    row1.selectedIndex = 0
    startHighlightArrow({
      target: chessboard.querySelector(`.coordinate-${coordinate1}`)
    })
    const column2 = document.querySelector('.select-column-end')
    const row2 = document.querySelector('.select-row-end')
    const coordinate2 = column2.value + row2.value
    column2.selectedIndex = 0
    row2.selectedIndex = 0
    stopHighlightArrow({
      target: chessboard.querySelector(`.coordinate-${coordinate2}`)
    })
  }

  function createFromTemplate (templateid) {
    const template = document.querySelector(templateid)
    const newForm = document.importNode(template.content, true)
    return newForm
  }

  function startHighlightArrow (event) {
    const moveContainer = findMoveContainer(event.target)
    if (!moveContainer) {
      return
    }
    const previewContainer = moveContainer.querySelector('.preview-arrow-container')
    if (!previewContainer) {
      return
    }
    previewContainer.innerHTML = ''
    if (event.target.tagName !== 'TD' && event.target.parentNode.tagName !== 'TD') {
      return
    }
    let arrowStartingCoordinate
    for (const className of event.target.classList) {
      if (!className.startsWith('coordinate-')) {
        continue
      }
      arrowStartingCoordinate = className.split('-')[1]
    }
    moveContainer.startingCoordinate = arrowStartingCoordinate
  }

  function stopHighlightArrow (event) {
    const moveContainer = findMoveContainer(event.target)
    if (!moveContainer) {
      return
    }
    const previewContainer = moveContainer.querySelector('.preview-arrow-container')
    if (!previewContainer) {
      return
    }
    previewContainer.innerHTML = ''
    if (!moveContainer.startingCoordinate) {
      return
    }
    const arrowStartingCoordinate = moveContainer.startingCoordinate
    let arrowEndingCoordinate
    for (const className of event.target.classList) {
      if (!className.startsWith('coordinate-')) {
        continue
      }
      arrowEndingCoordinate = className.split('-')[1]
    }
    delete (moveContainer.startingCoordinate)
    if (event.target.tagName !== 'TD' && (!event.target.parentNode || event.target.parentNode.tagName !== 'TD')) {
      return
    }
    const chessboard = moveContainer.querySelector('.annotate-arrow-chessboard')
    const colors = ['red', 'green', 'blue', 'yellow']
    let i = -1
    let color, activeColorButton
    const colorButtons = moveContainer.querySelectorAll('.arrow-color')
    for (const colorButton of colorButtons) {
      i++
      if (!colorButton.firstChild.classList.contains('fa-dot-circle')) {
        continue
      }
      activeColorButton = colorButton
      color = colors[i]
      break
    }
    const highlightContainer = moveContainer.querySelector('.highlight-arrow-container')
    const arrow = drawArrow(arrowStartingCoordinate, arrowEndingCoordinate, chessboard, highlightContainer)
    if (!arrow) {
      return
    }
    arrow.classList.add('chessboard-arrow')
    arrow.classList.add(`${color}-arrow`)
    arrow.style.width = chessboard.offsetWidth
    arrow.style.height = chessboard.offsetHeight
    arrow.innerHTML += ''
    const pendingList = moveContainer.querySelector('.pending-arrow-list')
    const listItem = document.createElement('li')
    listItem.innerHTML = `<span>${activeColorButton.innerHTML.substring(activeColorButton.innerHTML.indexOf('</i>') + 4)} <i>${arrowStartingCoordinate}</i> to <i>${arrowEndingCoordinate}</i></span>`
    const deleteButton = document.createElement('button')
    deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete'
    deleteButton.className = 'button annotation-form-button'
    deleteButton.arrow = arrow
    deleteButton.onclick = deleteArrow
    listItem.appendChild(deleteButton)
    pendingList.appendChild(listItem)
  }

  function deleteArrow (event) {
    if (event.preventDefault) {
      event.preventDefault()
    }
    const button = event.target
    const listItem = button.parentNode
    const list = listItem.parentNode
    list.removeChild(listItem)
    const arrow = event.target.arrow
    arrow.parentNode.removeChild(arrow)
  }

  function previewHighlightArrow (event) {
    const moveContainer = findMoveContainer(event.target)
    if (!moveContainer) {
      return
    }
    const previewContainer = moveContainer.querySelector('.preview-arrow-container')
    if (!previewContainer) {
      return
    }
    previewContainer.innerHTML = ''
    if (!moveContainer.startingCoordinate) {
      return
    }
    const arrowStartingCoordinate = moveContainer.startingCoordinate
    let arrowEndingCoordinate
    for (const className of event.target.classList) {
      if (!className.startsWith('coordinate-')) {
        continue
      }
      arrowEndingCoordinate = className.split('-')[1]
    }
    if (event.target.tagName !== 'TD' && (!event.target.parentNode || event.target.parentNode.tagName !== 'TD')) {
      return
    }
    const chessboard = moveContainer.querySelector('.annotate-arrow-chessboard')
    const colors = ['red', 'green', 'blue', 'yellow']
    let i = -1
    let color
    const colorButtons = moveContainer.querySelectorAll('.arrow-color')
    for (const colorButton of colorButtons) {
      i++
      if (!colorButton.firstChild.classList.contains('fa-dot-circle')) {
        continue
      }
      color = colors[i]
      break
    }
    const arrow = drawArrow(arrowStartingCoordinate, arrowEndingCoordinate, chessboard, previewContainer)
    if (!arrow) {
      return
    }
    arrow.classList.add('chessboard-arrow')
    arrow.classList.add(`${color}-arrow`)
    arrow.style.width = chessboard.offsetWidth
    arrow.style.height = chessboard.offsetHeight
    arrow.innerHTML += ''
  }

  function clickHighlightSquareCell (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    if (!moveContainer) {
      return
    }
    if (event.target.tagName !== 'TD' && event.target.parentNode.tagName !== 'TD') {
      return
    }
    const colors = ['red', 'green', 'blue', 'yellow']
    let i = -1
    let color, activeColorButton
    const colorButtons = moveContainer.querySelectorAll('.square-color')
    for (const colorButton of colorButtons) {
      i++
      if (!colorButton.firstChild.classList.contains('fa-dot-circle')) {
        continue
      }
      color = colors[i]
      activeColorButton = colorButton
      break
    }
    let coordinate
    for (const className of event.target.classList) {
      if (!className.startsWith('coordinate-')) {
        continue
      }
      coordinate = className.split('-')[1]
      break
    }
    const pendingList = moveContainer.querySelector('.pending-square-list')
    const cell = event.target.tagName === 'TD' ? event.target : event.target.parentNode
    const colorText = activeColorButton.innerHTML.substring(activeColorButton.innerHTML.indexOf('</i>') + 4)
    for (const colorid of colors) {
      if (cell.classList.contains(`${colorid}-square`)) {
        cell.classList.remove(`${colorid}-square`)
        for (const child of pendingList.children) {
          if (child.innerHTML.indexOf(colorid) === -1 || child.innerHTML.indexOf(coordinate) === -1) {
            continue
          }
          pendingList.removeChild(child)
        }
        if (colorid === color) {
          return
        }
      }
    }
    cell.classList.add(`${color}-square`)
    const listItem = document.createElement('li')
    listItem.innerHTML = `<span class="${color}">${colorText} <i>${coordinate}</i></span>`
    const deleteButton = document.createElement('button')
    deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete'
    deleteButton.className = 'button annotation-form-button'
    deleteButton.square = cell
    deleteButton.color = color
    deleteButton.onclick = deleteSquare
    listItem.appendChild(deleteButton)
    pendingList.appendChild(listItem)
  }

  function deleteSquare (event) {
    if (event.preventDefault) {
      event.preventDefault()
    }
    const button = event.target
    const listItem = button.parentNode
    const list = listItem.parentNode
    list.removeChild(listItem)
    const square = event.target.square
    square.classList.remove(`${event.target.color}-square`)
  }

  function selectColor (event) {
    event.preventDefault()
    const buttonList = event.target.parentNode
    for (const button of buttonList.children) {
      if (event.target === button) {
        button.firstChild.classList.remove('fa-circle')
        button.firstChild.classList.add('fa-dot-circle')
      } else if (button.firstChild.classList.contains('fa-dot-circle')) {
        button.firstChild.classList.add('fa-circle')
        button.firstChild.classList.remove('fa-dot-circle')
      }
    }
  }

  function toggleEditOptions (event) {
    const moveContainer = findMoveContainer(event.target)
    if (moveContainer.classList.contains('show-positioning')) {
      unexpandMoveContainer(moveContainer)
      unselectMoveComponentsPosition(moveContainer)
      const moveForms = moveContainer.querySelector('.move-forms')
      moveForms.innerHTML = ''
    } else {
      return expandMoveContainer(moveContainer)
    }
  }

  /**
   * adds annotation to the move sequence
   * @param {} event
   * @returns
   */
  function addAnnotation (event) {
    event.preventDefault()
    const moveContainer = findMoveContainer(event.target)
    let annotation = moveContainer.annotationSequence.join(' ')
    const selectedPosition = moveContainer.querySelector('.selected-position')
    if (!selectedPosition) {
      return
    }
    const position = findElementChildIndex(selectedPosition)
    const expandedSequence = expandSequence(moveContainer.sequence)
    if (expandedSequence.indexOf('{') > -1 && expandedSequence.indexOf('{') < position - 1 && expandedSequence.indexOf('}') > position - 1) {
      annotation = annotation.slice(1, annotation.length - 1)
    }
    expandedSequence.splice(position, 0, ' ', annotation)
    moveContainer.sequence = moveContainer.move.sequence = contractExpandedSequence(expandedSequence)
    const sequence = selectedPosition.parentNode
    renderSequence(moveContainer.sequence, sequence)
    resetMoveContainerButtons(moveContainer)
    const moveForms = moveContainer.querySelector('.move-forms')
    moveForms.innerHTML = ''
    unselectMoveComponentsPosition(moveContainer)
    unexpandMoveContainer(moveContainer)
  }

  function updateAnnotation (event) {
    event.preventDefault()
    const moveContainer = findMoveContainer(event.target)
    const annotation = moveContainer.annotationSequence.join(' ')
    const editPosition = moveContainer.querySelector('.edit-position')
    if (!editPosition) {
      return
    }
    const position = findElementChildIndex(editPosition)
    const expandedSequence = expandSequence(moveContainer.sequence)
    expandedSequence[position - 1] = annotation
    moveContainer.sequence = moveContainer.move.sequence = contractExpandedSequence(expandedSequence)
    const sequence = moveContainer.querySelector('.move-components')
    renderSequence(moveContainer.sequence, sequence)
    resetMoveContainerButtons(moveContainer)
    const moveForms = moveContainer.querySelector('.move-forms')
    moveForms.innerHTML = ''
    unselectMoveComponentsPosition(moveContainer)
    unexpandMoveContainer(moveContainer)
  }

  function deleteAnnotation () {

  }

  /**
   * adds a nag to the move sequence
   * @param {} event
   * @returns
   */
  function addNag (event) {
    event.preventDefault()
    const moveContainer = findMoveContainer(event.target)
    const nag = moveContainer.querySelector('.nag-select').value
    const moveComponents = moveContainer.querySelector('.move-components')
    const selectedItem = moveComponents.querySelector('.selected-position')
    const expandedSequence = selectedItem.sequence
    const position = selectedItem.position
    expandedSequence.splice(position, 0, ' ', nag)
    moveContainer.sequence = moveContainer.move.sequence = contractExpandedSequence(expandedSequence)
    renderSequence(moveContainer.sequence, moveComponents)
    resetMoveContainerButtons(moveContainer)
    const moveForms = moveContainer.querySelector('.move-forms')
    moveForms.innerHTML = ''
    unselectMoveComponentsPosition(moveContainer)
    unexpandMoveContainer(moveContainer)
  }

  function updateNag (event) {
    event.preventDefault()
    const moveContainer = findMoveContainer(event.target)
    const moveComponents = moveContainer.querySelector('.move-components')
    const selectedItem = moveComponents.querySelector('.edit-position')
    const expandedSequence = selectedItem.sequence
    const position = selectedItem.position
    const newNag = moveContainer.querySelector('.nag-select').value
    expandedSequence[position] = newNag
    moveContainer.sequence = moveContainer.move.sequence = contractExpandedSequence(expandedSequence)
    renderSequence(moveContainer.sequence, moveComponents)
    resetMoveContainerButtons(moveContainer)
    const moveForms = moveContainer.querySelector('.move-forms')
    moveForms.innerHTML = ''
    unselectMoveComponentsPosition(moveContainer)
    unexpandMoveContainer(moveContainer)
  }

  function deleteNag (event) {
    event.preventDefault()
    const moveContainer = findMoveContainer(event.target)
    const moveComponents = moveContainer.querySelector('.move-components')
    const selectedItem = moveComponents.querySelector('.edit-position')
    const expandedSequence = selectedItem.sequence
    const position = selectedItem.position
    expandedSequence.splice(position, 1)
    moveContainer.sequence = moveContainer.move.sequence = contractExpandedSequence(expandedSequence)
    renderSequence(moveContainer.sequence, moveComponents)
    resetMoveContainerButtons(moveContainer)
    const moveForms = moveContainer.querySelector('.move-forms')
    moveForms.innerHTML = ''
    unselectMoveComponentsPosition(moveContainer)
    unexpandMoveContainer(moveContainer)
  }

  /**
   * adds text to the annotation block
   * @param {} event
   * @returns
   */
  function insertAnnotationText (event) {
    event.preventDefault()
    const moveContainer = findMoveContainer(event.target)
    const annotationSequence = moveContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.selected-position')
    const textArea = moveContainer.querySelector('.annotation-text')
    const annotationText = textArea.value
    textArea.value = ''
    annotationPosition.sequence.splice(annotationPosition.position, 0, ' ', annotationText)
    moveContainer.annotationSequence = contractExpandedSequence(annotationPosition.sequence)
    renderSequence(moveContainer.annotationSequence, annotationSequence, true)
    const formContainer = moveContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    return makeAnnotationOptionSelector(formContainer)
  }

  function updateAnnotationText (event) {
    event.preventDefault()
    const moveContainer = findMoveContainer(event.target)
    const annotationSequence = moveContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    const textArea = moveContainer.querySelector('.annotation-text')
    const annotationText = textArea.value
    textArea.value = ''
    const expandedSequence = annotationPosition.sequence
    const position = annotationPosition.position
    expandedSequence[position] = annotationText
    moveContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    renderSequence(moveContainer.annotationSequence, annotationSequence, true)
    const formContainer = moveContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    return makeAnnotationOptionSelector(formContainer, true)
  }

  function deleteAnnotationText (event) {
    if (event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    const moveComponents = moveContainer.querySelector('.move-components')
    const annotationSequence = moveContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    annotationPosition.sequence.splice(annotationPosition.position, 1)
    moveContainer.annotationSequence = contractExpandedSequence(annotationPosition.sequence)
    const movePosition = moveComponents.querySelector('.edit-position')
    const expandedmoveComponents = expandSequence(moveContainer.sequence)
    if (moveContainer.annotationSequence.length === 1 && moveContainer.annotationSequence[0] === '{}') {
      delete (moveContainer.annotationSequence)
      expandedmoveComponents.splice(movePosition.position, 1)
      moveContainer.sequence = moveContainer.move.sequence = contractExpandedSequence(expandedmoveComponents)
    } else {
      expandedmoveComponents[movePosition.position - 1] = contractExpandedSequence(annotationPosition.sequence).join(' ')
    }
    annotationPosition.sequence = moveContainer.expandedSequence
    renderSequence(moveContainer.sequence, moveComponents)
    if (moveContainer.annotationSequence) {
      renderSequence(moveContainer.annotationSequence, annotationSequence, true)
    }
    resetMoveContainerButtons(moveContainer)
    const moveForms = moveContainer.querySelector('.move-forms')
    moveForms.innerHTML = ''
    unselectMoveComponentsPosition(moveContainer)
    unexpandMoveContainer(moveContainer)
  }

  /**
   * adds [% csl] to the annotation block
   * @param {*} event
   * @returns
   */
  function insertSquareText (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    const colors = {
      red: [],
      green: [],
      blue: [],
      yellow: []
    }
    const squareChessBoard = moveContainer.querySelector('.annotate-square-chessboard')
    for (const row of squareChessBoard.rows) {
      for (const cell of row.cells) {
        let coordinate
        for (const className of cell.classList) {
          if (!className.startsWith('coordinate-')) {
            continue
          }
          coordinate = className.split('-')[1]
          break
        }
        if (cell.classList.contains('red-square')) {
          colors.red.push(`R${coordinate}`)
        } else if (cell.classList.contains('blue-square')) {
          colors.blue.push(`B${coordinate}`)
        } else if (cell.classList.contains('green-square')) {
          colors.green.push(`G${coordinate}`)
        } else if (cell.classList.contains('yellow-square')) {
          colors.yellow.push(`Y${coordinate}`)
        }
      }
    }
    let annotationParts = []
    for (const color in colors) {
      if (!colors[color].length) {
        continue
      }
      annotationParts = annotationParts.concat(colors[color])
    }
    if (annotationParts.length) {
      const annotationText = `[%csl ${annotationParts.join(',')}]`
      const annotationSequence = moveContainer.querySelector('.annotation-components')
      const annotationPosition = annotationSequence.querySelector('.selected-position')
      annotationPosition.sequence.splice(annotationPosition.position, 0, ' ', annotationText)
      moveContainer.annotationSequence = contractExpandedSequence(annotationPosition.sequence)
      renderSequence(moveContainer.annotationSequence, annotationSequence, true)
    }
    const formContainer = moveContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    return makeAnnotationOptionSelector(formContainer)
  }

  function updateSquareText (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    const colors = {
      red: [],
      green: [],
      blue: [],
      yellow: []
    }
    const squareChessBoard = moveContainer.querySelector('.annotate-square-chessboard')
    for (const row of squareChessBoard.rows) {
      for (const cell of row.cells) {
        let coordinate
        for (const className of cell.classList) {
          if (!className.startsWith('coordinate-')) {
            continue
          }
          coordinate = className.split('-')[1]
          break
        }
        if (cell.classList.contains('red-square')) {
          colors.red.push(`R${coordinate}`)
        } else if (cell.classList.contains('blue-square')) {
          colors.blue.push(`B${coordinate}`)
        } else if (cell.classList.contains('green-square')) {
          colors.green.push(`G${coordinate}`)
        } else if (cell.classList.contains('yellow-square')) {
          colors.yellow.push(`Y${coordinate}`)
        }
      }
    }
    let annotationParts = []
    for (const color in colors) {
      if (!colors[color].length) {
        continue
      }
      annotationParts = annotationParts.concat(colors[color])
    }
    if (!annotationParts.length) {
      return deleteSquareText(event)
    }
    const annotationText = `[%csl ${annotationParts.join(',')}]`
    const annotationSequence = moveContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    annotationPosition.sequence[annotationPosition.position] = annotationText
    moveContainer.annotationSequence = contractExpandedSequence(annotationPosition.sequence)
    renderSequence(moveContainer.annotationSequence, annotationSequence, true)
    const formContainer = moveContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    return makeAnnotationOptionSelector(formContainer, true)
  }

  function deleteSquareText (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    const moveComponents = moveContainer.querySelector('.move-components')
    const annotationSequence = moveContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    annotationPosition.sequence.splice(annotationPosition.position, 1)
    moveContainer.annotationSequence = contractExpandedSequence(annotationPosition.sequence)
    const movePosition = moveComponents.querySelector('.edit-position')
    const expandedmoveComponents = expandSequence(moveContainer.sequence)
    if (moveContainer.annotationSequence.length === 1 && moveContainer.annotationSequence[0] === '{}') {
      delete (moveContainer.annotationSequence)
      expandedmoveComponents.splice(movePosition.position, 1)
      moveContainer.sequence = moveContainer.move.sequence = contractExpandedSequence(expandedmoveComponents)
    } else {
      expandedmoveComponents[movePosition.position - 1] = contractExpandedSequence(annotationPosition.sequence).join(' ')
    }
    annotationPosition.sequence = moveContainer.expandedSequence
    renderSequence(moveContainer.sequence, moveComponents)
    if (moveContainer.annotationSequence) {
      renderSequence(moveContainer.annotationSequence, annotationSequence, true)
    }
    resetMoveContainerButtons(moveContainer)
    const moveForms = moveContainer.querySelector('.move-forms')
    moveForms.innerHTML = ''
    unselectMoveComponentsPosition(moveContainer)
    unexpandMoveContainer(moveContainer)
  }

  /**
   * adds [%cal] to the annotation
   * @param {} event
   * @returns
   */
  function insertArrowText (event) {
    event.preventDefault()
    const moveContainer = findMoveContainer(event.target)
    const colors = {
      red: [],
      green: [],
      blue: [],
      yellow: []
    }
    const pendingList = moveContainer.querySelector('.pending-arrow-list')
    for (const child of pendingList.children) {
      const span = child.firstChild
      let color = span.innerHTML.trim()
      color = color.substring(0, color.indexOf(' ')).toLowerCase()
      const coordinates = span.querySelectorAll('i')
      colors[color].push(color[0].toUpperCase() + coordinates[0].innerHTML + coordinates[1].innerHTML)
    }
    let annotationParts = []
    for (const color in colors) {
      if (!colors[color].length) {
        continue
      }
      annotationParts = annotationParts.concat(colors[color])
    }
    if (annotationParts.length) {
      const annotationText = `[%cal ${annotationParts.join(',')}]`
      const annotationSequence = moveContainer.querySelector('.annotation-components')
      const annotationPosition = annotationSequence.querySelector('.selected-position')
      annotationPosition.sequence.splice(annotationPosition.position, 0, ' ', annotationText)
      moveContainer.annotationSequence = contractExpandedSequence(annotationPosition.sequence)
      renderSequence(moveContainer.annotationSequence, annotationSequence, true)
    }
    const formContainer = moveContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    return makeAnnotationOptionSelector(formContainer)
  }

  function updateArrowText (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    const colors = {
      red: [],
      green: [],
      blue: [],
      yellow: []
    }
    const pendingList = moveContainer.querySelector('.pending-arrow-list')
    for (const child of pendingList.children) {
      const span = child.firstChild
      let color = span.innerHTML.trim()
      color = color.substring(0, color.indexOf(' ')).toLowerCase()
      const coordinates = span.querySelectorAll('i')
      colors[color].push(color[0].toUpperCase() + coordinates[0].innerHTML + coordinates[1].innerHTML)
    }
    let annotationParts = []
    for (const color in colors) {
      if (!colors[color].length) {
        continue
      }
      annotationParts = annotationParts.concat(colors[color])
    }
    if (!annotationParts.length) {
      return deleteArrowText(event)
    }
    const annotationText = `[%cal ${annotationParts.join(',')}]`
    const annotationSequence = moveContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    annotationPosition.sequence[annotationPosition.position] = annotationText
    moveContainer.annotationSequence = contractExpandedSequence(annotationPosition.sequence)
    renderSequence(moveContainer.annotationSequence, annotationSequence, true)
    const formContainer = moveContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    return makeAnnotationOptionSelector(formContainer, true)
  }

  function deleteArrowText (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    const moveComponents = moveContainer.querySelector('.move-components')
    const annotationSequence = moveContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    annotationPosition.sequence.splice(annotationPosition.position, 1)
    moveContainer.annotationSequence = contractExpandedSequence(annotationPosition.sequence)
    const movePosition = moveComponents.querySelector('.edit-position')
    const expandedmoveComponents = expandSequence(moveContainer.sequence)
    if (moveContainer.annotationSequence.length === 1 && moveContainer.annotationSequence[0] === '{}') {
      delete (moveContainer.annotationSequence)
      expandedmoveComponents.splice(movePosition.position, 1)
      moveContainer.sequence = moveContainer.move.sequence = contractExpandedSequence(expandedmoveComponents)
    } else {
      expandedmoveComponents[movePosition.position - 1] = contractExpandedSequence(annotationPosition.sequence).join(' ')
    }
    annotationPosition.sequence = moveContainer.expandedSequence
    renderSequence(moveContainer.sequence, moveComponents)
    if (moveContainer.annotationSequence) {
      renderSequence(moveContainer.annotationSequence, annotationSequence, true)
    }
    resetMoveContainerButtons(moveContainer)
    const moveForms = moveContainer.querySelector('.move-forms')
    moveForms.innerHTML = ''
    unselectMoveComponentsPosition(moveContainer)
    unexpandMoveContainer(moveContainer)
  }

  function drawArrow (firstCoordinate, lastCoordinate, chessboard, container) {
    if (!firstCoordinate || !lastCoordinate || !chessboard) {
      return
    }
    const previousValues = {}
    const moveSteps = [firstCoordinate, lastCoordinate]
    const sixteenthCellSize = chessboard.offsetWidth / 8 / 8 / 2
    const eighthCellSize = sixteenthCellSize * 2
    const quarterCellSize = eighthCellSize * 2
    const halfCellSize = quarterCellSize * 2
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    const markerWidth = eighthCellSize
    const markerHeight = eighthCellSize
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
    marker.id = `arrow-highlight-${firstCoordinate}-${lastCoordinate}`
    marker.setAttributeNS(null, 'markerWidth', markerWidth)
    marker.setAttributeNS(null, 'markerHeight', markerHeight)
    marker.setAttributeNS(null, 'refX', markerWidth * 0.8)
    marker.setAttributeNS(null, 'refY', markerHeight / 2)
    marker.setAttributeNS(null, 'orient', 'auto')
    defs.appendChild(marker)
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    polygon.setAttributeNS(null, 'points', `0,0 ${markerWidth},${markerHeight / 2} 0,${markerHeight}`)
    polygon.style.strokeWidth = 0
    marker.appendChild(polygon)
    let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    if (container) {
      container.appendChild(svg)
      svg = container.lastChild
    } else {
      chessboard.parentNode.insertBefore(svg, chessboard.parentNode.children[1])
      svg = chessboard.parentNode.children[chessboard.parentNode.children.length - 2]
    }
    svg.style.strokeWidth = (sixteenthCellSize * 1.5) + 'px'
    svg.appendChild(defs)
    for (const i in moveSteps) {
      const stepCoordinate = moveSteps[i]
      const cell = chessboard.querySelector(`.coordinate-${stepCoordinate}`)
      if (stepCoordinate === firstCoordinate) {
        const xPosition = cell.offsetLeft + halfCellSize
        const yPosition = cell.offsetTop + halfCellSize
        previousValues.xPosition = xPosition
        previousValues.yPosition = yPosition
        continue
      }
      const xPosition = cell.offsetLeft + halfCellSize
      const yPosition = cell.offsetTop + halfCellSize
      const line = document.createElement('line')
      if (stepCoordinate === lastCoordinate) {
        line.setAttributeNS(null, 'marker-end', `url(#arrow-highlight-${firstCoordinate}-${lastCoordinate})`)
      }
      line.setAttributeNS(null, 'x1', previousValues.xPosition)
      line.setAttributeNS(null, 'y1', previousValues.yPosition)
      line.setAttributeNS(null, 'x2', xPosition)
      line.setAttributeNS(null, 'y2', yPosition)
      svg.appendChild(line)
      previousValues.xPosition = xPosition
      previousValues.yPosition = yPosition
    }
    return svg
  }

  function setupMiniChessBoard (table, hitarea, move) {
    const rows = '87654321'.split('')
    const columns = 'abcdefgh'.split('')
    let white = false
    for (const r of rows) {
      const row = table.insertRow(table.rows.length)
      let clickableRow
      if (hitarea) {
        clickableRow = hitarea.insertRow(hitarea.rows.length)
      }
      white = !white
      for (const c of columns) {
        const cell = row.insertCell(row.cells.length)
        cell.className = `coordinate-${c}${r} chessboard-square ` + (white ? 'white-square' : 'black-square')
        cell.coordinate = `${c}${r}`
        cell.style.backgroundSize = 'cover'
        white = !white
        if (r === '1') {
          cell.innerHTML = '<sub>' + c + '</sub>'
        }
        if (c === 'a') {
          cell.innerHTML += '<sup>' + r + '</sup>'
        }
        cell.style.width = '12%'
        cell.style.height = '12%'
        if (!move) {
          continue
        }
        for (const piece of move.pieces) {
          if (piece.coordinate !== `${c}${r}`) {
            continue
          }
          const color = piece.color === 'w' ? 'o' : 'b'
          cell.style.backgroundImage = `url(themes/${window.themeName}/${color}${piece.type}.png)`
        }
        if (!hitarea) {
          continue
        }
        const clickableCell = clickableRow.insertCell(clickableRow.cells.length)
        clickableCell.style.width = '12%'
        clickableCell.style.height = '12%'
        clickableCell.coordinate = `${c}${r}`
        clickableCell.className = `coordinate-${c}${r}`
      }
    }
  }

  function expandMoveContainer (moveContainer) {
    moveContainer.classList.add('show-positioning')
    const circle = moveContainer.querySelector('.fa-edit')
    if (circle) {
      circle.classList.add('fa-minus-circle')
      circle.classList.remove('fa-edit')
    }
  }

  function unexpandMoveContainer (moveContainer) {
    moveContainer.classList.remove('show-positioning')
    const circle = moveContainer.querySelector('.fa-minus-circle')
    if (circle) {
      circle.classList.remove('fa-minus-circle')
      circle.classList.add('fa-edit')
    }
  }

  function unselectMoveComponentsPosition (moveContainer) {
    moveContainer.classList.remove('show-positioning')
    const list = moveContainer.querySelector('.move-components')
    for (const child of list.children) {
      if (child.classList.contains('selected-position')) {
        child.classList.remove('selected-position')
        child.firstChild.firstChild.classList.add('fa-circle')
        child.firstChild.firstChild.classList.remove('fa-dot-circle')
      }
      if (child.classList.contains('edit-position')) {
        child.classList.remove('edit-position')
      }
    }
  }

  function resetMoveContainerButtons (moveContainer) {
    const toggleInsertionSpacesButton = document.createElement('button')
    toggleInsertionSpacesButton.className = 'button move-option-button'
    toggleInsertionSpacesButton.innerHTML = '<i class="fas fa-edit"></i>'
    toggleInsertionSpacesButton.annotateForm = 'annotation'
    toggleInsertionSpacesButton.onclick = toggleEditOptions
    const showSpacing = document.createElement('li')
    showSpacing.className = 'move-options-item'
    showSpacing.appendChild(toggleInsertionSpacesButton)
    const sequence = moveContainer.querySelector('.move-components')
    sequence.insertBefore(showSpacing, sequence.firstChild)
  }

  function findMoveContainer (element) {
    let moveContainer = element.parentNode
    while (moveContainer && moveContainer.classList && !moveContainer.classList.contains('move-list-item')) {
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
})(typeof exports === 'undefined' ? this.annotations = {} : exports)
