((exports) => {
  exports.expandAnnotationSequence = expandAnnotationSequence
  exports.nextTurnNumber = nextTurnNumber
  exports.proliferateChanges = proliferateChanges
  exports.refreshAnnotations = refreshAnnotations
  exports.setupAnnotations = setupAnnotations

  let parser, container, turnList, lastRenderedPGN, timeline

  if (typeof require !== 'undefined') {
    parser = require('pgn-parser')
  }
  function setupAnnotations () {
    container = document.querySelector('.annotations-container')
    turnList = document.querySelector('.turn-list')
    document.onmousedown = startHighlightArrow
    document.onmouseturn = previewHighlightArrow
    document.onmouseup = stopHighlightArrow
    if (typeof window !== 'undefined') {
      parser = window.parser
    }
  }

  function refreshAnnotations () {
    if (!turnList || container.style.display === 'none') {
      return
    }
    if (lastRenderedPGN !== window.pgn) {
      timeline = 1
      lastRenderedPGN = window.pgn
      turnList.innerHTML = ''
      turnList.classList.add('timeline1')
      renderTurns(window.pgn.turns, turnList)
    }
    if (document.body.offsetHeight > document.body.offsetWidth) {
      turnList.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight - document.querySelector('.left').offsetHeight) + 'px'
    } else {
      turnList.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight - 1) + 'px'
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
        const nestedTurns = copy.substring(0, closingIndex + 1)
        lineParts.push(nestedTurns)
        copy = copy.substring(nestedTurns.length).trim()
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
    return parser.tokenizeLine(joined)
  }

  function renderTurns (turns, parent) {
    if (turns === window.pgn.turns) {
      timeline = 1
    }
    for (const turn of turns) {
      let li
      if (turn.turnContainer && 2 === 1) {
        li = turn.turnContainer
        if (li.classList.contains('show-positioning')) {
          toggleEditOptions({ target: li.firstChild })
        }
      } else {
        li = createFromTemplate('#turn-components-template')
      }
      const sequence = li.querySelector('.turn-components')
      renderSequence(turn.sequence, sequence, false)
      if (!li.parentNode) {
        parent.appendChild(li)
        li = turn.turnContainer = parent.lastElementChild
      }
      resetTurnContainerButtons(li)
      if (turn.color === 'w') {
        li.classList.add('white-turn-link')
      } else {
        li.classList.add('black-turn-link')
      }
      const deleteLastTurnButton = li.querySelector('.delete-last-turn-button')
      if (turn === turns[turns.length - 1]) {
        deleteLastTurnButton.onclick = deleteLastTurn
      } else {
        deleteLastTurnButton.style.display = 'none'
      }
      if (!turn.siblings || !turn.siblings.length) {
        continue
      }
      for (const sibling of turn.siblings) {
        timeline++
        let ul = createFromTemplate('#sibling-components-template')
        li.appendChild(ul)
        ul = li.lastElementChild
        ul.classList.add(`timeline${timeline}`)
        timeline = renderTurns(sibling, ul)
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
      li.title = item
      li.position = i
      const nag = item.startsWith('$')
      const annotation = item.startsWith('{')
      const space = item === ' '
      if (nag || annotation || space || renderingAnnotation) {
        if (renderingAnnotation) {
          if (item !== '{' && item !== '}') {
            li.onmousedown = selectAnnotationSequencePosition
          } else {
            li.style.pointerEvents = 'none'
            li.mouseEnabled = false
          }
        } else {
          li.onmousedown = selectTurnComponentsPosition
        }
      } else {
        li.style.pointerEvents = 'none'
        li.mouseEnabled = false
      }
      container.appendChild(li)
      if (item === ' ') {
        li.className = 'sequence-position-item'
        li.innerHTML = '<button class="button turn-location-button"><i class="fas fa-circle"></i></button>'
        li.firstChild.mouseEnabled = false
        continue
      }
      li.className = 'turn-components-item'
      if (item.length > 30) {
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

  function selectTurnComponentsPosition (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const positionList = turnContainer.querySelector('.turn-components')
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
      return editTurnComponentsPosition(event)
    }
    const newForm = makeInsertionTypeSelector(turnContainer)
    const turnForms = turnContainer.querySelector('.turn-forms')
    turnForms.innerHTML = ''
    turnForms.appendChild(newForm)
  }

  function editTurnComponentsPosition (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    expandTurnContainer(turnContainer)
    const sequence = turnContainer.querySelector('.turn-components')
    let selectedPosition
    for (const child of sequence.children) {
      if (child === event.target) {
        child.classList.add('edit-position')
        selectedPosition = child
      } else if (child.classList.contains('edit-position')) {
        child.classList.remove('edit-position')
      }
    }
    const existingForm = turnContainer.querySelector('.annotation-form')
    if (existingForm) {
      existingForm.parentNode.appendChild(existingForm)
    }
    const formSelector = turnContainer.querySelector('.insertion-form-selector')
    if (formSelector) {
      formSelector.parentNode.appendChild(formSelector)
    }
    const turnForms = turnContainer.querySelector('.turn-forms')
    turnForms.innerHTML = ''
    // editing a nag
    if (selectedPosition.innerHTML.startsWith('$')) {
      const newForm = makeNagForm('#edit-nag-form')
      const nagSelect = newForm.querySelector('.nag-select')
      nagSelect.selectedIndex = parseInt(selectedPosition.innerHTML.substring(1), 10)
      const cancelButton = newForm.querySelector('.cancel-button')
      cancelButton.onclick = cancelAndCloseForm
      const formSelector = turnContainer.querySelector('.insertion-form-selector')
      if (formSelector) {
        formSelector.parentNode.appendChild(formSelector)
      }
      turnForms.appendChild(newForm)
      return
    }
    // editing an annotation
    if (selectedPosition.innerHTML.startsWith('{')) {
      const sequence = parser.tokenizeLine(selectedPosition.title)
      const newForm = makeAnnotationEditor(turnContainer, sequence)
      turnForms.appendChild(newForm)
      return setupAnnotationEditor(turnContainer)
    }
  }

  function selectAnnotationSequencePosition (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const positionList = turnContainer.querySelector('.annotation-components')
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
    const newForm = makeAnnotationTypeSelector(turnContainer)
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    formContainer.appendChild(newForm)
  }

  function editAnnotationSequencePosition (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const components = turnContainer.querySelector('.annotation-components')
    const position = findElementChildIndex(event.target)
    let selectedPosition
    for (const child of components.children) {
      if (child === event.target) {
        child.classList.add('edit-position')
        selectedPosition = child
      } else if (child.classList.contains('edit-position')) {
        child.classList.remove('edit-position')
      }
    }
    const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
    expandedSequence.pop()
    expandedSequence.shift()
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    const editing = expandedSequence[position]
    if (selectedPosition.innerHTML.startsWith('[%cal')) {
      const newForm = makeAnnotationArrowForm(turnContainer, '#edit-arrow-annotation-form')
      formContainer.appendChild(newForm)
      let arrowData = selectedPosition.title.substring('[%cal '.length)
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
    if (selectedPosition.innerHTML.startsWith('[%csl')) {
      const newForm = makeAnnotationSquareForm(turnContainer, '#edit-square-annotation-form')
      formContainer.appendChild(newForm)
      let squareData = selectedPosition.title.substring('[%cal '.length)
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
    const newForm = makeAnnotationTextForm(turnContainer, '#edit-text-annotation-form')
    const textarea = newForm.querySelector('.annotation-text')
    textarea.value = editing
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.onclick = cancelAndCloseForm
    formContainer.appendChild(newForm)
  }

  function cancelAndCloseForm (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    const turnForms = turnContainer.querySelector('.turn-forms')
    turnForms.innerHTML = ''
    unexpandTurnContainer(turnContainer)
    unselectTurnComponentsPosition(turnContainer)
  }

  function switchForm (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const button = event.target
    const formCreator = button.formCreator
    const turnContainer = findTurnContainer(event.target)
    const newForm = formCreator(turnContainer)
    if (button.formContainer) {
      button.formContainer.innerHTML = ''
      return button.formContainer.appendChild(newForm)
    }
    const turnForms = turnContainer.querySelector('.turn-forms')
    turnForms.innerHTML = ''
    turnForms.appendChild(newForm)
    if (button.formSetup) {
      button.formSetup(turnContainer)
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
    const alternativeTurnsButton = form.querySelector('.alternative-moves-button')
    alternativeTurnsButton.formCreator = makeAlternativeTurnsForm
    alternativeTurnsButton.onclick = switchForm
    const quizButton = form.querySelector('.quiz-button')
    quizButton.formCreator = makeQuizForm
    quizButton.onclick = switchForm
    const cancelButton = form.querySelector('.cancel-button')
    cancelButton.onclick = cancelAndCloseForm
    return form
  }

  function makeAnnotationEditor (turnContainer, annotationSequence) {
    const form = createFromTemplate('#annotation-editor')
    const turnComponents = turnContainer.querySelector('.turn-components')
    const annotationComponents = form.querySelector('.annotation-components')
    turnContainer.annotationSequence = annotationSequence || ['{}']
    renderSequence(turnContainer.annotationSequence, annotationComponents, true)
    const formContainer = form.querySelector('.annotation-form-container')
    const editing = !!turnComponents.querySelector('.edit-position')
    makeAnnotationOptionSelector(formContainer, editing)
    const cancelButton = formContainer.querySelector('.cancel-button')
    cancelButton.onclick = cancelAndCloseForm
    return form
  }

  function setupAnnotationEditor (turnContainer) {
    const annotationComponents = turnContainer.querySelector('.annotation-components')
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

  function makeAnnotationTypeSelector (turnContainer) {
    const form = createFromTemplate('#annotation-type-selector')
    const formContainer = turnContainer.querySelector('.annotation-form-container')
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

  function makeAlternativeTurnsForm (turnContainer) {
    const turn = findTurn(turnContainer)
    const newForm = createFromTemplate('#new-alternative-moves-form')
    const chessBoard = newForm.querySelector('.chessboard')
    const previousTurnState = {
      pieces: turn.previousPieces
    }
    const hitArea = chessBoard.parentNode.querySelector('.alternative-moves-hitarea')
    hitArea.onmousedown = selectAlternativePiece
    hitArea.onmouseup = turnAlternativePiece
    turnContainer.alternativeTurns = []
    setupMiniChessBoard(chessBoard, hitArea, previousTurnState, true)
    const insertButton = newForm.querySelector('.insert-alternative-moves-button')
    insertButton.onclick = insertAlternativeTurn
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeInsertionTypeSelector
    cancelButton.onclick = switchForm
    const pendingList = newForm.querySelector('.pending-list')
    pendingList.style.display = 'none'
    pendingList.querySelector('.cancel-button').onclick = undoLastPendingTurn
    return newForm
  }

  function selectAlternativePiece (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const coordinate = event.target.className.split('-').pop()
    if ('abcdefgh'.indexOf(coordinate[0]) === -1) {
      return
    }
    if ('12345678'.indexOf(coordinate[1]) === -1) {
      return
    }
    const turnContainer = findTurnContainer(event.target)
    const turn = findTurn(turnContainer)
    let requiredColor, pieces
    if (turnContainer.alternativeTurns && turnContainer.alternativeTurns.length) {
      requiredColor = turnContainer.alternativeTurns[turnContainer.alternativeTurns.length - 1].color === 'w' ? 'b' : 'w'
      pieces = turnContainer.alternativeTurns[turnContainer.alternativeTurns.length - 1].pieces
    } else {
      requiredColor = turn.color === 'w' ? 'w' : 'b'
      pieces = turn.previousPieces
    }
    let selectedPiece
    for (const piece of pieces) {
      if (piece.coordinate === coordinate) {
        selectedPiece = piece
        break
      }
    }
    if (!selectedPiece || selectedPiece.color !== requiredColor) {
      delete (turnContainer.selectedPiece)
      return
    }
    turnContainer.selectedPiece = selectedPiece
  }

  function turnAlternativePiece (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    if (!turnContainer.selectedPiece) {
      return
    }
    const coordinate = event.target.className.split('-').pop()
    if ('abcdefgh'.indexOf(coordinate[0]) === -1) {
      return
    }
    if ('12345678'.indexOf(coordinate[1]) === -1) {
      return
    }
    const turn = findTurn(turnContainer)
    let pieces, moveNumber, dots, color
    if (turnContainer.alternativeTurns.length) {
      pieces = turnContainer.alternativeTurns[turnContainer.alternativeTurns.length - 1].pieces
      moveNumber = nextTurnNumber(turnContainer.alternativeTurns[turnContainer.alternativeTurns.length - 1])
      dots = turnContainer.alternativeTurns[turnContainer.alternativeTurns.length - 1].color === 'w' ? '...' : '.'
      color = turnContainer.alternativeTurns[turnContainer.alternativeTurns.length - 1].color === 'w' ? 'b' : 'w'
    } else {
      pieces = turn.previousPieces
      moveNumber = turn.moveNumber
      dots = turn.color === 'w' ? '.' : '...'
      color = turn.color === 'w' ? 'w' : 'b'
    }
    const alternativeTurn = {
      color,
      moveNumber,
      to: coordinate,
      from: turnContainer.selectedPiece.coordinate,
      pieces: JSON.parse(JSON.stringify(pieces)),
      previousPieces: JSON.parse(JSON.stringify(pieces)),
      piece: turnContainer.selectedPiece
    }
    const turnment = parser.calculatePieceMovement(alternativeTurn.piece, alternativeTurn, alternativeTurn.pieces)
    if (!turnment) {
      return
    }
    for (const piece of alternativeTurn.pieces) {
      if (piece.type === alternativeTurn.piece.type && piece.coordinate === alternativeTurn.piece.coordinate) {
        piece.coordinate = coordinate
        break
      }
    }
    turnContainer.alternativeTurns.push(alternativeTurn)
    // todo:
    // 1) captured pieces do not process
    // 2) promoted pieces do not process
    // 4) cannot add alternative turns to new alternative turns
    // 5) inserted text is excesssively specific (1. Pee4 vs 1. e2 with type and column inferred)
    // 7) cannot "edit" existing alternative turns ie delete last or add next turn
    const chessBoard = turnContainer.querySelector('.alternative-moves-chessboard')
    const cellBefore = chessBoard.querySelector(`.coordinate-${turnContainer.selectedPiece.coordinate}`)
    const cellAfter = chessBoard.querySelector(`.coordinate-${coordinate}`)
    cellAfter.style.backgroundImage = cellBefore.style.backgroundImage
    cellBefore.style.backgroundImage = ''
    const pendingList = turnContainer.querySelector('.pending-turn-list')
    const listItem = document.createElement('li')
    listItem.innerHTML = `<span>${moveNumber}${dots} ${alternativeTurn.piece.type} <i>${alternativeTurn.piece.coordinate}</i> to <i>${coordinate}</i></span>`
    pendingList.insertBefore(listItem, pendingList.lastElementChild)
    pendingList.style.display = ''
  }

  function undoLastPendingTurn (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const lastTurn = turnContainer.alternativeTurns.pop()
    const chessBoard = turnContainer.querySelector('.alternative-moves-chessboard')
    const cellBefore = chessBoard.querySelector(`.coordinate-${lastTurn.to}`)
    const cellAfter = chessBoard.querySelector(`.coordinate-${lastTurn.from}`)
    cellAfter.style.backgroundImage = cellBefore.style.backgroundImage
    cellBefore.style.backgroundImage = ''

    const pendingList = turnContainer.querySelector('.pending-turn-list')
    pendingList.appendChild(pendingList.children[pendingList.children.length - 2])
    if (pendingList.children.length === 1) {
      pendingList.style.display = 'none'
    }
  }

  function nextTurnNumber (previousTurn) {
    const previousNumber = parseInt(previousTurn.moveNumber, 10)
    if (previousTurn.color === 'w') {
      return previousNumber
    }
    return previousNumber + 1
  }

  function insertAlternativeTurn (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const turn = findTurn(turnContainer)
    const pendingList = turnContainer.querySelector('.pending-turn-list')
    const annotationParts = []
    for (const child of pendingList.children) {
      if (child.firstElementChild.tagName === 'BUTTON') {
        continue
      }
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
    const pieces = JSON.parse(JSON.stringify(turn.previousPieces))
    const sibling = parser.parseTurn(annotationText.substring(1, annotationText.length - 1))
    for (const child of sibling) {
      child.parentTurn = turn
      parser.processTurn(child, sibling, pieces)
    }
    const selectedPosition = turnContainer.querySelector('.selected-position')
    const expandedSequence = expandSequence(turn.sequence)
    const position = selectedPosition.position
    expandedSequence.splice(position, 0, ' ', annotationText)
    proliferateChanges(turn, contractExpandedSequence(expandedSequence))
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
    const turnComponents = turnContainer.querySelector('.turn-components')
    renderSequence(turn.sequence, turnComponents)
    resetTurnContainerButtons(turnContainer)
    const turnForms = turnContainer.querySelector('.turn-forms')
    turnForms.innerHTML = ''
    unselectTurnComponentsPosition(turnContainer)
    unexpandTurnContainer(turnContainer)
    timeline++
    let ul = createFromTemplate('#sibling-components-template')
    turnContainer.appendChild(ul)
    ul = turnContainer.lastElementChild
    ul.className = `turn-list timeline${timeline}`
    turn.siblings = turn.siblings || []
    turn.siblings.push(sibling)
    renderTurns(sibling, ul)
  }

  function makeQuizForm () {
    const newForm = createFromTemplate('#new-quiz-form')
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeInsertionTypeSelector
    cancelButton.onclick = switchForm
    return newForm
  }

  function makeAnnotationTextForm (turnContainer, template) {
    const formContainer = turnContainer.querySelector('.annotation-form-container')
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

  function makeAnnotationSquareForm (turnContainer, templateid) {
    const formContainer = turnContainer.querySelector('.annotation-form-container')
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
      const chessBoard = (event ? findTurnContainer(event.target) : newForm).querySelector('.chessboard')
      chessBoard.onclick = clickHighlightSquareCell
      chessBoard.innerHTML = ''
      const turnContainerFromButton = event ? findTurnContainer(event.target) : turnContainer
      const turn = findTurn(turnContainerFromButton)
      setupMiniChessBoard(chessBoard, null, turn)
      const pendingList = (event ? findTurnContainer(event.target) : newForm).querySelector('.pending-list')
      pendingList.innerHTML = ''
    }
    resetButton.onclick()
    return newForm
  }

  function manuallyAddSquare (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const chessboard = turnContainer.querySelector('.annotate-square-chessboard')
    const column = document.querySelector('.select-column')
    const row = document.querySelector('.select-row')
    const coordinate = column.value + row.value
    column.selectedIndex = 0
    row.selectedIndex = 0
    return clickHighlightSquareCell({
      target: chessboard.querySelector(`.coordinate-${coordinate}`)
    })
  }

  function makeAnnotationArrowForm (turnContainer, templateid) {
    const formContainer = turnContainer.querySelector('.annotation-form-container')
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
      const chessBoard = (event ? findTurnContainer(event.target) : newForm).querySelector('.chessboard')
      chessBoard.innerHTML = ''
      const hitArea = chessBoard.parentNode.querySelector('.annotate-arrow-hitarea')
      hitArea.innerHTML = ''
      const turnContainerFromButton = event ? findTurnContainer(event.target) : turnContainer
      const turn = findTurn(turnContainerFromButton)
      setupMiniChessBoard(chessBoard, hitArea, turn)
      const pendingList = (event ? findTurnContainer(event.target) : newForm).querySelector('.pending-list')
      pendingList.innerHTML = ''
    }
    resetButton.onclick()
    return newForm
  }

  function manuallyAddArrow (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const chessboard = turnContainer.querySelector('.annotate-arrow-chessboard')
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
    const turnContainer = findTurnContainer(event.target)
    if (!turnContainer) {
      return
    }
    const previewContainer = turnContainer.querySelector('.preview-arrow-container')
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
    turnContainer.startingCoordinate = arrowStartingCoordinate
  }

  function stopHighlightArrow (event) {
    const turnContainer = findTurnContainer(event.target)
    if (!turnContainer) {
      return
    }
    const previewContainer = turnContainer.querySelector('.preview-arrow-container')
    if (!previewContainer) {
      return
    }
    previewContainer.innerHTML = ''
    if (!turnContainer.startingCoordinate) {
      return
    }
    const arrowStartingCoordinate = turnContainer.startingCoordinate
    let arrowEndingCoordinate
    for (const className of event.target.classList) {
      if (!className.startsWith('coordinate-')) {
        continue
      }
      arrowEndingCoordinate = className.split('-')[1]
    }
    delete (turnContainer.startingCoordinate)
    if (event.target.tagName !== 'TD' && (!event.target.parentNode || event.target.parentNode.tagName !== 'TD')) {
      return
    }
    const chessboard = turnContainer.querySelector('.annotate-arrow-chessboard')
    const colors = ['red', 'green', 'blue', 'yellow']
    let i = -1
    let color, activeColorButton
    const colorButtons = turnContainer.querySelectorAll('.arrow-color')
    for (const colorButton of colorButtons) {
      i++
      if (!colorButton.firstChild.classList.contains('fa-dot-circle')) {
        continue
      }
      activeColorButton = colorButton
      color = colors[i]
      break
    }
    const highlightContainer = turnContainer.querySelector('.highlight-arrow-container')
    const arrow = drawArrow(arrowStartingCoordinate, arrowEndingCoordinate, chessboard, highlightContainer)
    if (!arrow) {
      return
    }
    arrow.classList.add('chessboard-arrow')
    arrow.classList.add(`${color}-arrow`)
    arrow.style.width = chessboard.offsetWidth
    arrow.style.height = chessboard.offsetHeight
    arrow.innerHTML += ''
    const pendingList = turnContainer.querySelector('.pending-arrow-list')
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
    const turnContainer = findTurnContainer(event.target)
    if (!turnContainer) {
      return
    }
    const previewContainer = turnContainer.querySelector('.preview-arrow-container')
    if (!previewContainer) {
      return
    }
    previewContainer.innerHTML = ''
    if (!turnContainer.startingCoordinate) {
      return
    }
    const arrowStartingCoordinate = turnContainer.startingCoordinate
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
    const chessboard = turnContainer.querySelector('.annotate-arrow-chessboard')
    const colors = ['red', 'green', 'blue', 'yellow']
    let i = -1
    let color
    const colorButtons = turnContainer.querySelectorAll('.arrow-color')
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
    const turnContainer = findTurnContainer(event.target)
    if (!turnContainer) {
      return
    }
    if (event.target.tagName !== 'TD' && event.target.parentNode.tagName !== 'TD') {
      return
    }
    const colors = ['red', 'green', 'blue', 'yellow']
    let i = -1
    let color, activeColorButton
    const colorButtons = turnContainer.querySelectorAll('.square-color')
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
    const pendingList = turnContainer.querySelector('.pending-square-list')
    const cell = event.target.tagName === 'TD' ? event.target : event.target.parentNode
    const colorText = activeColorButton.innerHTML.substring(activeColorButton.innerHTML.indexOf('</i>') + 4)
    for (const colorid of colors) {
      if (cell.classList.contains(`${colorid}-square`)) {
        cell.classList.remove(`${colorid}-square`)
        for (const child of pendingList.children) {
          if (child.innerHTML.indexOf(colorid) === -1 || child.innerHTML.indexOf(coordinate) === -1) {
            continue
          }
          pendingList.appendChild(child)
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
    const turnContainer = findTurnContainer(event.target)
    if (turnContainer.classList.contains('show-positioning')) {
      unexpandTurnContainer(turnContainer)
      unselectTurnComponentsPosition(turnContainer)
      const turnForms = turnContainer.querySelector('.turn-forms')
      turnForms.innerHTML = ''
    } else {
      return expandTurnContainer(turnContainer)
    }
  }

  /**
   * adds annotation to the turn sequence
   * @param {} event
   * @returns
   */
  function addAnnotation (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    let annotation = turnContainer.annotationSequence.join(' ')
    const selectedPosition = turnContainer.querySelector('.selected-position')
    if (!selectedPosition) {
      return
    }
    const position = findElementChildIndex(selectedPosition)
    const turn = findTurn(turnContainer)
    const expandedSequence = expandSequence(turn.sequence)
    if (expandedSequence.indexOf('{') > -1 && expandedSequence.indexOf('{') < position - 1 && expandedSequence.indexOf('}') > position - 1) {
      annotation = annotation.slice(1, annotation.length - 1)
    }
    expandedSequence.splice(position, 0, ' ', annotation)
    proliferateChanges(turn, contractExpandedSequence(expandedSequence))
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
  }

  function updateAnnotation (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    const turn = findTurn(turnContainer)
    const annotation = turnContainer.annotationSequence.join(' ')
    const editPosition = turnContainer.querySelector('.edit-position')
    if (!editPosition) {
      return
    }
    const position = findElementChildIndex(editPosition)
    const expandedSequence = expandSequence(turn.sequence)
    expandedSequence[position - 1] = annotation
    proliferateChanges(turn, contractExpandedSequence(expandedSequence))
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
  }

  function deleteAnnotation (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
  }

  function deleteLastTurn (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const deletingTurn = findTurn(turnContainer)
    if (!deletingTurn.parentTurn) {
      window.pgn.turns.splice(window.pgn.turns.indexOf(deletingTurn), 1)
    } else {
      for (const i in deletingTurn.parentTurn.siblings) {
        const index = deletingTurn.parentTurn.siblings[i].indexOf(deletingTurn)
        if (index === -1) {
          continue
        }
        // remove the turn from the sibling
        deletingTurn.parentTurn.siblings[i].splice(index, 1)
        break
      }
      // update the parent sequence
      const newSequence = [].concat(deletingTurn.parentTurn.sequence)
      let siblingNumber = 0
      for (const j in newSequence) {
        if (!newSequence[j].startsWith('(')) {
          continue
        }
        newSequence[j] = recombineNestedMoves(deletingTurn.parentTurn.siblings[siblingNumber])
        siblingNumber++
      }
      proliferateChanges(deletingTurn.parentTurn, newSequence)
      
    }
    turnContainer.parentNode.removeChild(turnContainer)
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
  }


  function recombineNestedMoves (turnArray) {
    if (!turnArray.length) {
      return ''
    }
    const pgnParts = []
    for (const turn of turnArray) {
      pgnParts.push(turn.sequence.join(' '))
    }
    return '(' + parser.cleanSpacing(pgnParts.join(' ')) + ')'
  }

  /**
   * adds a nag to the turn sequence
   * @param {} event
   * @returns
   */
  function addNag (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    const nag = turnContainer.querySelector('.nag-select').value
    const turnComponents = turnContainer.querySelector('.turn-components')
    const selectedPosition = turnComponents.querySelector('.selected-position')
    const turn = findTurn(turnContainer)
    const expandedSequence = expandSequence(turn.sequence)
    const position = selectedPosition.position
    expandedSequence.splice(position, 0, ' ', nag)
    proliferateChanges(turn, contractExpandedSequence(expandedSequence))
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
  }

  function updateNag (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    const turnComponents = turnContainer.querySelector('.turn-components')
    const selectedPosition = turnComponents.querySelector('.edit-position')
    const turn = findTurn(turnContainer)
    const expandedSequence = expandSequence(turn.sequence)
    const newNag = turnContainer.querySelector('.nag-select').value
    expandedSequence[parseInt(selectedPosition.position, 10)] = newNag
    proliferateChanges(turn, contractExpandedSequence(expandedSequence))
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
  }

  function deleteNag (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    const turnComponents = turnContainer.querySelector('.turn-components')
    const selectedPosition = turnComponents.querySelector('.edit-position')
    const turn = findTurn(turnContainer)
    const expandedSequence = expandSequence(turn.sequence)
    expandedSequence.splice(parseInt(selectedPosition.position, 10), 1)
    proliferateChanges(turn, contractExpandedSequence(expandedSequence))
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
  }

  /**
   * adds text to the annotation block
   * @param {} event
   * @returns
   */
  function insertAnnotationText (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    const annotationSequence = turnContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.selected-position')
    turnContainer.annotationSequence = turnContainer.annotationSequence || ['{', '}']
    const textArea = turnContainer.querySelector('.annotation-text')
    const annotationText = textArea.value
    const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
    textArea.value = ''
    expandedSequence.splice(parseInt(annotationPosition.position, 10) + 1, 0, ' ', annotationText)
    turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    renderSequence(turnContainer.annotationSequence, annotationSequence, true)
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    const editing = !!turnComponents.querySelector('.edit-position')
    return makeAnnotationOptionSelector(formContainer, editing)
  }

  function updateAnnotationText (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    const annotationSequence = turnContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    const textArea = turnContainer.querySelector('.annotation-text')
    const annotationText = textArea.value
    textArea.value = ''
    const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
    const position = findElementChildIndex(annotationPosition)
    expandedSequence[position + 1] = annotationText
    turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    renderSequence(turnContainer.annotationSequence, annotationSequence, true)
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    return makeAnnotationOptionSelector(formContainer, true)
  }

  function deleteAnnotationText (event) {
    if (event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const turn = findTurn(turnContainer)
    const annotationSequence = turnContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
    expandedSequence.splice(parseInt(annotationPosition.position, 10) + 1, 1)
    turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    const turnComponents = turnContainer.querySelector('.turn-components')
    const turnPosition = turnComponents.querySelector('.edit-position')
    const expandedTurnComponents = expandSequence(turn.sequence)
    if (turnContainer.annotationSequence.length === 1 && turnContainer.annotationSequence[0] === '{}') {
      expandedTurnComponents.splice(turnPosition.position, 1)
      proliferateChanges(turn, contractExpandedSequence(expandedTurnComponents))
    }
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
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
    const turnContainer = findTurnContainer(event.target)
    const colors = {
      red: [],
      green: [],
      blue: [],
      yellow: []
    }
    const squareChessBoard = turnContainer.querySelector('.annotate-square-chessboard')
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
      const annotationSequence = turnContainer.querySelector('.annotation-components')
      const annotationPosition = annotationSequence.querySelector('.selected-position')
      const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
      expandedSequence.splice(parseInt(annotationPosition.position, 10) + 1, 0, annotationText)
      turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
      renderSequence(turnContainer.annotationSequence, annotationSequence, true)
    }
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    const editing = !!turnComponents.querySelector('.edit-position')
    return makeAnnotationOptionSelector(formContainer, editing)
  }

  function updateSquareText (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const colors = {
      red: [],
      green: [],
      blue: [],
      yellow: []
    }
    const squareChessBoard = turnContainer.querySelector('.annotate-square-chessboard')
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
    const annotationSequence = turnContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
    expandedSequence[parseInt(annotationPosition.position, 10) + 1] = annotationText
    turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    renderSequence(turnContainer.annotationSequence, annotationSequence, true)
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    return makeAnnotationOptionSelector(formContainer, true)
  }

  function deleteSquareText (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const turn = findTurn(turnContainer)
    const annotationSequence = turnContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
    expandedSequence.splice(parseInt(annotationPosition.position, 10) + 1, 1)
    turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    const turnComponents = turnContainer.querySelector('.turn-components')
    const turnPosition = turnComponents.querySelector('.edit-position')
    const expandedTurnComponents = expandSequence(turn.sequence)
    if (turnContainer.annotationSequence.length === 1 && turnContainer.annotationSequence[0] === '{}') {
      expandedTurnComponents.splice(turnPosition.position, 1)
      proliferateChanges(turn, contractExpandedSequence(expandedTurnComponents))
    }
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
  }

  function proliferateChanges (turn, newSequence) {
    const oldPGNText = parser.cleanSpacing(turn.sequence.join(' '))
    const newPGNText = parser.cleanSpacing(newSequence.join(' '))
    let t = turn
    t.sequence = newSequence
    while (t.parentTurn) {
      t = t.parentTurn
      for (const i in t.sequence) {
        if (t.sequence[i] === oldPGNText) {
          t.sequence[i] = oldPGNText
        } else if (t.sequence[i].indexOf(oldPGNText) > -1) {
          t.sequence[i] = t.sequence[i].replace(oldPGNText, newPGNText)
        }
      }
    }
  }

  /**
   * adds [%cal] to the annotation
   * @param {} event
   * @returns
   */
  function insertArrowText (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    const colors = {
      red: [],
      green: [],
      blue: [],
      yellow: []
    }
    const pendingList = turnContainer.querySelector('.pending-arrow-list')
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
      const annotationSequence = turnContainer.querySelector('.annotation-components')
      const annotationPosition = annotationSequence.querySelector('.selected-position')
      const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
      expandedSequence.splice(parseInt(annotationPosition.position, 10) + 1, 0, ' ', annotationText)
      turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
      renderSequence(turnContainer.annotationSequence, annotationSequence, true)
    }
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    const editing = !!turnComponents.querySelector('.edit-position')
    return makeAnnotationOptionSelector(formContainer, editing)
  }

  function updateArrowText (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const colors = {
      red: [],
      green: [],
      blue: [],
      yellow: []
    }
    const pendingList = turnContainer.querySelector('.pending-arrow-list')
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
    const annotationSequence = turnContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
    expandedSequence[parseInt(annotationPosition.position, 10) + 1] = annotationText
    turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    renderSequence(turnContainer.annotationSequence, annotationSequence, true)
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    return makeAnnotationOptionSelector(formContainer, true)
  }

  function deleteArrowText (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const turn = findTurn(turnContainer)
    const turnComponents = turnContainer.querySelector('.turn-components')
    const annotationSequence = turnContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
    expandedSequence.splice(parseInt(annotationPosition.position, 10) + 1, 1)
    turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    const expandedTurnComponents = expandSequence(turn.sequence)
    const turnPosition = turnComponents.querySelector('.edit-position')
    if (turnContainer.annotationSequence.length === 1 && turnContainer.annotationSequence[0] === '{}') {
      expandedTurnComponents.splice(turnPosition.position, 1)
      proliferateChanges(turn, contractExpandedSequence(expandedTurnComponents))
    }
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
  }

  function drawArrow (firstCoordinate, lastCoordinate, chessboard, container) {
    if (!firstCoordinate || !lastCoordinate || !chessboard) {
      return
    }
    const previousValues = {}
    const turnSteps = [firstCoordinate, lastCoordinate]
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
    for (const i in turnSteps) {
      const stepCoordinate = turnSteps[i]
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

  function setupMiniChessBoard (table, hitarea, turn) {
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
        if (!turn) {
          continue
        }
        for (const piece of turn.pieces) {
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

  function expandTurnContainer (turnContainer) {
    turnContainer.classList.add('show-positioning')
    const circle = turnContainer.querySelector('.fa-edit')
    if (circle) {
      circle.classList.add('fa-minus-circle')
      circle.classList.remove('fa-edit')
    }
  }

  function unexpandTurnContainer (turnContainer) {
    turnContainer.classList.remove('show-positioning')
    const circle = turnContainer.querySelector('.fa-minus-circle')
    if (circle) {
      circle.classList.remove('fa-minus-circle')
      circle.classList.add('fa-edit')
    }
  }

  function unselectTurnComponentsPosition (turnContainer) {
    turnContainer.classList.remove('show-positioning')
    const list = turnContainer.querySelector('.turn-components')
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

  function resetTurnContainerButtons (turnContainer) {
    const toggleInsertionSpacesButton = document.createElement('button')
    toggleInsertionSpacesButton.className = 'button turn-option-button'
    toggleInsertionSpacesButton.innerHTML = '<i class="fas fa-edit"></i>'
    toggleInsertionSpacesButton.annotateForm = 'annotation'
    toggleInsertionSpacesButton.onclick = toggleEditOptions
    const showSpacing = document.createElement('li')
    showSpacing.className = 'turn-options-item'
    showSpacing.appendChild(toggleInsertionSpacesButton)
    const sequence = turnContainer.querySelector('.turn-components')
    sequence.insertBefore(showSpacing, sequence.firstChild)
  }

  function findTurnContainer (element) {
    let turnContainer = element.parentNode
    while (turnContainer && turnContainer.classList && !turnContainer.classList.contains('turn-list-item')) {
      turnContainer = turnContainer.parentNode
    }
    return turnContainer
  }

  function findTurn (turnContainer, turns) {
    turns = turns || window.pgn.turns
    for (const turn of turns) {
      if (turn.turnContainer === turnContainer) {
        return turn
      }
      if (!turn.siblings || !turn.siblings.length) {
        continue
      }
      for (const sibling of turn.siblings) {
        const nestedTurn = findTurn(turnContainer, sibling)
        if (nestedTurn) {
          return nestedTurn
        }
      }
    }
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
