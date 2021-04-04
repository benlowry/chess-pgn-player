((exports) => {
  exports.setupAnnotations = setupAnnotations
  exports.refreshAnnotations = refreshAnnotations
  exports.expandAnnotationSequence = expandAnnotationSequence

  let moveList, lastRenderedPGN

  function setupAnnotations () {
    moveList = document.querySelector('.move-list')
    document.onmousedown = startHighlightArrow
    document.onmousemove = previewHighlightArrow
    document.onmouseup = stopHighlightArrow
  }

  function refreshAnnotations () {
    if (!moveList) {
      return
    }
    if (lastRenderedPGN !== window.pgn) {
      lastRenderedPGN = window.pgn
      moveList.innerHTML = ''
      moveList.classList.add('timeline1')
      renderMoves(window.pgn.turns, moveList, 1)
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
    return window.parser.tokenizeLine(joined)
  }

  function renderMoves (blocks, parent, timeline) {
    for (const move of blocks) {
      const li = document.createElement('li')
      li.moveIndex = move.move
      li.move = move
      li.className = 'move-list-item'
      const sequence = document.createElement('ul')
      sequence.className = 'move-sequence'
      renderSequence(move.sequence, sequence)
      li.appendChild(sequence)
      resetMoveContainerButtons(li)
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
    const expandedSequence = expandSequence(sequence, !!insideSpacingOnly)
    if (insideSpacingOnly) {
      expandedSequence.pop()
      expandedSequence.shift()
    }
    const renderingAnnotation = container.classList.contains('annotation-sequence')
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
          li.onmousedown = selectMoveSequencePosition
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
      li.className = 'move-sequence-item'
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

  function selectMoveSequencePosition (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    const positionList = moveContainer.querySelector('.move-sequence')
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
          editMoveSequencePosition(event)
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
    const newForm = makeInsertionTypeSelector(moveContainer)
    clearContents(moveContainer)
    const moveSequence = moveContainer.querySelector('.move-sequence')
    if (moveSequence.nextSibling) {
      moveContainer.insertBefore(newForm, moveSequence.nextSibling)
    } else {
      moveContainer.appendChild(newForm)
    }
  }

  function editMoveSequencePosition(event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    expandMoveContainer(moveContainer)
    const sequence = moveContainer.querySelector('.move-sequence')
    const position = findElementChildIndex(event.target) - 1
    for (const child of sequence.children) {
      if (child === event.target) {
        child.classList.add('edit-position')
      } else if (child.classList.contains('edit-position')) {
        child.classList.remove('edit-position')
      }
    }
    const expandedSequence = expandSequence(moveContainer.move.sequence)
    const moveSequence = moveContainer.querySelector('.move-sequence')
    const editing = expandedSequence[position]
    // editing a nag
    if (event.target.innerHTML.startsWith('$')) {
      clearContents(moveContainer)
      const newForm = makeNagForm('#edit-nag-form')
      const nagSelect = newForm.querySelector('.nag-select')
      nagSelect.selectedIndex = parseInt(editing.substring(1), 10)
      const cancelButton = newForm.querySelector('.cancel-button')
      cancelButton.onclick = (event) => {
        event.preventDefault()
        const moveContainer = findMoveContainer(event.target)
        unexpandMoveContainer(moveContainer)
        unselectMoveSequencePosition(moveContainer)
        clearContents(moveContainer)
      }
      const existingForm = moveContainer.querySelector('.annotation-form')
      if (existingForm) {
        existingForm.parentNode.removeChild(existingForm)
      }
      const formSelector = moveContainer.querySelector('.insertion-form-selector')
      if (formSelector) {
        formSelector.parentNode.removeChild(formSelector)
      }
      if (moveSequence.nextSibling) {
        moveContainer.insertBefore(newForm, moveSequence.nextSibling)
      } else {
        moveContainer.appendChild(newForm)
      }
      return
    }
    // editing an annotation
    if (event.target.innerHTML.startsWith('{')) {
      clearContents(moveContainer)
      const newForm = makeAnnotationBuilder(moveContainer, window.parser.tokenizeLine(editing))
      const cancelButton = newForm.querySelector('.cancel-button')
      cancelButton.onclick = (event) => {
        event.preventDefault()
        const moveContainer = findMoveContainer(event.target)
        unexpandMoveContainer(moveContainer)
        unselectMoveSequencePosition(moveContainer)
        clearContents(moveContainer)
      }
      const existingForm = moveContainer.querySelector('.annotation-form')
      if (existingForm) {
        existingForm.parentNode.removeChild(existingForm)
      }
      const formSelector = moveContainer.querySelector('.insertion-form-selector')
      if (formSelector) {
        formSelector.parentNode.removeChild(formSelector)
      }
      if (moveSequence.nextSibling) {
        moveContainer.insertBefore(newForm, moveSequence.nextSibling)
      } else {
        moveContainer.appendChild(newForm)
      }
      return
    }
  }

  function selectAnnotationSequencePosition(event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    const positionList = moveContainer.querySelector('.annotation-sequence')
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

  function editAnnotationSequencePosition(event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const moveContainer = findMoveContainer(event.target)
    const sequence = moveContainer.querySelector('.annotation-sequence')
    const position = findElementChildIndex(event.target)
    for (const child of sequence.children) {
      if (child === event.target) {
        child.classList.add('edit-position')
      } else if (child.classList.contains('edit-position')) {
        child.classList.remove('edit-position')
      }
    }
    const expandedSequence = expandSequence(moveContainer.annotationSequence, true)
    expandedSequence.pop()
    expandedSequence.shift()
    const editing = expandedSequence[position]
    if (event.target.innerHTML.startsWith('[%cal')) {
      clearContents(moveContainer)
      const newForm = makeAnnotationArrowForm(moveContainer, '#edit-arrow-annotation-form')
      const cancelButton = newForm.querySelector('.cancel-button')
      cancelButton.onclick = (event) => {
        event.preventDefault()
        const moveContainer = findMoveContainer(event.target)
        unexpandMoveContainer(moveContainer)
        unselectMoveSequencePosition(moveContainer)
        clearContents(moveContainer)
      }
      const formContainer = moveContainer.querySelector('.annotation-form-container')
      formContainer.innerHTML = ''
      return formContainer.appendChild(newForm)
    }
    if (event.target.innerHTML.startsWith('[%csl')) {
      clearContents(moveContainer)
      const newForm = makeAnnotationSquareForm(moveContainer, '#edit-square-annotation-form')
      const cancelButton = newForm.querySelector('.cancel-button')
      cancelButton.onclick = (event) => {
        event.preventDefault()
        const moveContainer = findMoveContainer(event.target)
        unexpandMoveContainer(moveContainer)
        unselectMoveSequencePosition(moveContainer)
        clearContents(moveContainer)
      }
      const formContainer = moveContainer.querySelector('.annotation-form-container')
      formContainer.innerHTML = ''
      return formContainer.appendChild(newForm)
    }
    // a text block
    const newForm = makeAnnotationTextForm(moveContainer, '#edit-text-annotation-form')
    const textarea = newForm.querySelector('.annotation-text')
    textarea.value = editing
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.onclick = (event) => {
      event.preventDefault()
      const moveContainer = findMoveContainer(event.target)
      unexpandMoveContainer(moveContainer)
      unselectMoveSequencePosition(moveContainer)
      clearContents(moveContainer)
    }
    const formContainer = moveContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    formContainer.appendChild(newForm)
  }

  function switchForm (event) {
    const button = event.target
    const formCreator = button.formCreator
    const moveContainer = findMoveContainer(event.target)
    if (button.formContainer) {
      button.formContainer.innerHTML = ''
    } else {
      clearContents(moveContainer)
    }
    const newForm = formCreator(moveContainer)
    if (button.formContainer) {
      return button.formContainer.appendChild(newForm)
    }
    const moveSequence = moveContainer.querySelector('.move-sequence')
    if (moveSequence.nextSibling) {
      moveContainer.insertBefore(newForm, moveSequence.nextSibling)
    } else{
      moveContainer.appendChild(newForm)
    }
  }

  function makeInsertionTypeSelector () {
    const template = document.querySelector('#insertion-form-selector')
    const form = document.importNode(template.content, true)
    const nagButton = form.querySelector('.nag-button')
    nagButton.formCreator = makeNagForm
    nagButton.onclick = switchForm
    const annotationButton = form.querySelector('.annotation-button')
    annotationButton.formCreator = makeAnnotationBuilder
    annotationButton.onclick = switchForm
    const alternativeMovesButton = form.querySelector('.alternative-moves-button')
    alternativeMovesButton.formCreator = makeAlternativeMovesForm
    alternativeMovesButton.onclick = switchForm
    const quizButton = form.querySelector('.quiz-button')
    quizButton.formCreator = makeQuizForm
    quizButton.onclick = switchForm
    const cancelButton = form.querySelector('.cancel-button')
    cancelButton.onclick = (event) => {
      event.preventDefault()
      const moveContainer = findMoveContainer(event.target)
      unexpandMoveContainer(moveContainer)
      unselectMoveSequencePosition(moveContainer)
      clearContents(moveContainer)
    }
    return form
  }

  function makeAnnotationBuilder(moveContainer, annotationSequence) {
    clearContents(moveContainer)
    const form = createForm('#annotation-builder')
    const moveSequence = form.querySelector('.annotation-sequence')
    moveContainer.annotationSequence = annotationSequence || ['{}']
    renderSequence(moveContainer.annotationSequence, moveSequence, true)
    const defaultOptions = createForm('#annotation-builder-options')
    const formContainer = form.querySelector('.annotation-form-container')
    formContainer.appendChild(defaultOptions)
    const addAnnotationButton = form.querySelector('.add-annotation-button')
    addAnnotationButton.formCreator = makeAnnotationTypeSelector
    addAnnotationButton.formContainer = formContainer
    addAnnotationButton.onclick = switchForm
    const cancelButton = form.querySelector('.cancel-button')
    cancelButton.formCreator = makeInsertionTypeSelector
    cancelButton.onclick = switchForm
    return form
  }

  function makeAnnotationTypeSelector (moveContainer) {
    const form = createForm('#annotation-type-selector')
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
    cancelButton.formCreator = makeAnnotationBuilder
    cancelButton.onclick = switchForm
    return form
  }

  function makeNagForm (eventOrTemplate) {
    const template = eventOrTemplate && eventOrTemplate.substring ? eventOrTemplate : '#new-nag-form'
    const newForm = createForm(template)
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

  function makeAlternativeMovesForm () {
    const newForm = createForm('#new-alternative-moves-form')
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeInsertionTypeSelector
    cancelButton.onclick = switchForm
    return newForm
  }

  function makeQuizForm () {
    const newForm = createForm('#new-quiz-form')
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeInsertionTypeSelector
    cancelButton.onclick = switchForm
    return newForm
  }

  function makeAnnotationTextForm(moveContainer, template) {
    const formContainer = moveContainer.querySelector('.annotation-form-container')
    const newForm = createForm(template || '#new-text-annotation-form')
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

  function makeAnnotationSquareForm (moveContainer) {
    const formContainer = moveContainer.querySelector('.annotation-form-container')
    const newForm = createForm('#new-square-annotation-form')
    const chessboard = newForm.querySelector('.chessboard')
    setupMiniChessBoard(chessboard, null, moveContainer.move)
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeAnnotationTypeSelector
    cancelButton.formContainer = formContainer
    cancelButton.onclick = switchForm
    return newForm
  }

  function makeAnnotationArrowForm (moveContainer) {
    const formContainer = moveContainer.querySelector('.annotation-form-container')
    const newForm = createForm('#new-arrow-annotation-form')
    const chessboard = newForm.querySelector('.chessboard')
    const hitarea = newForm.querySelector('.hitarea')
    setupMiniChessBoard(chessboard, hitarea, moveContainer.move)
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeAnnotationTypeSelector
    cancelButton.formContainer = formContainer
    cancelButton.onclick = switchForm
    return newForm
  }

  function createForm (templateid) {
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
    if (event.target.tagName !== 'TD' && event.target.parentNode.tagName !== 'TD') {
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
    listItem.innerHTML = `<span>${color} <i>${arrowStartingCoordinate}</i> to <i>${arrowEndingCoordinate}</i></span>`
    const deleteButton = document.createElement('button')
    deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete'
    deleteButton.className = 'button annotation-form-button'
    deleteButton.arrow = arrow
    deleteButton.onclick = deleteArrow
    listItem.appendChild(deleteButton)
    pendingList.appendChild(listItem)
  }

  function deleteArrow (event) {
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
    if (event.target.tagName !== 'TD' && event.target.parentNode.tagName !== 'TD') {
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
    const moveContainer = findMoveContainer(event.target)
    if (!moveContainer) {
      return
    }
    event.preventDefault()
    if (event.target.tagName !== 'TD' && event.target.parentNode.tagName !== 'TD') {
      return
    }
    const colors = ['red', 'green', 'blue', 'yellow']
    let i = -1
    let color
    const colorButtons = moveContainer.querySelectorAll('.square-color')
    for (const colorButton of colorButtons) {
      i++
      if (!colorButton.firstChild.classList.contains('fa-dot-circle')) {
        continue
      }
      color = colors[i]
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
    const cell = event.target.tagName === 'TD' ? event.target : event.target.parentNode
    if (cell.classList.contains(`${color}-square`)) {
      cell.classList.remove(`${color}-square`)
    } else {
      cell.classList.add(`${color}-square`)
    }
    const pendingList = moveContainer.querySelector('.pending-square-list')
    const listItem = document.createElement('li')
    listItem.innerHTML = `<span>${color} <i>${coordinate}</i></span>`
    const deleteButton = document.createElement('button')
    deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete'
    deleteButton.className = 'button annotation-form-button'
    deleteButton.square = cell
    deleteButton.color = color
    deleteButton.onclick = deleteSquare
    listItem.appendChild(deleteButton)
    pendingList.appendChild(listItem)
  }

  function deleteSquare(event) {
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
      unselectMoveSequencePosition(moveContainer)
      return clearContents(moveContainer)
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
    const expandedSequence = expandSequence(moveContainer.move.sequence)
    if (expandedSequence.indexOf('{') > -1 && expandedSequence.indexOf('{') < position - 1 && expandedSequence.indexOf('}') > position - 1) {
      annotation = annotation.slice(1, annotation.length - 1)
    }
    expandedSequence.splice(position || 0, 0, ' ', annotation)
    moveContainer.move.sequence = contractExpandedSequence(expandedSequence)
    const sequence = selectedPosition.parentNode
    renderSequence(moveContainer.move.sequence, sequence)
    resetMoveContainerButtons(moveContainer)
    clearContents(moveContainer)
    unselectMoveSequencePosition(moveContainer)
    unexpandMoveContainer(moveContainer)
  }

  function updateAnnotation () {

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
    const moveSequence = moveContainer.querySelector('.move-sequence')
    const selectedItem = moveSequence.querySelector('.selected-position')
    const expandedSequence = selectedItem.sequence
    const position = selectedItem.position
    expandedSequence.splice(position || 0, 0, ' ', nag)
    moveContainer.move.sequence = contractExpandedSequence(expandedSequence)
    renderSequence(moveContainer.move.sequence, moveSequence)
    resetMoveContainerButtons(moveContainer)
    clearContents(moveContainer)
    unselectMoveSequencePosition(moveContainer)
    unexpandMoveContainer(moveContainer)
  }

  function updateNag (event) {
    const moveContainer = findMoveContainer(event.target)
    const moveSequence = moveContainer.querySelector('.move-sequence')
    const selectedItem = moveSequence.querySelector('.edit-position')
    const expandedSequence = selectedItem.sequence
    const position = selectedItem.position
    const newNag = moveContainer.querySelector('.nag-select').value
    expandedSequence[position] = newNag
    moveContainer.move.sequence = contractExpandedSequence(expandedSequence)
    renderSequence(moveContainer.move.sequence, moveSequence)
    resetMoveContainerButtons(moveContainer)
    clearContents(moveContainer)
    unselectMoveSequencePosition(moveContainer)
    unexpandMoveContainer(moveContainer)
  }

  function deleteNag (event) {
    const moveContainer = findMoveContainer(event.target)
    const moveSequence = moveContainer.querySelector('.move-sequence')
    const selectedItem = moveSequence.querySelector('.edit-position')
    const expandedSequence = selectedItem.sequence
    const position = selectedItem.position
    expandedSequence.splice(position, 1)
    moveContainer.move.sequence = contractExpandedSequence(expandedSequence)
    renderSequence(moveContainer.move.sequence, moveSequence)
    resetMoveContainerButtons(moveContainer)
    clearContents(moveContainer)
    unselectMoveSequencePosition(moveContainer)
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
    const annotationSequence = moveContainer.querySelector('.annotation-sequence')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    const textArea = moveContainer.querySelector('.annotation-text')
    const annotationText = textArea.value
    textArea.value = ''
    const expandedSequence = annotationPosition.sequence
    const position = annotationPosition.position
    expandedSequence.splice(position, 0, ' ', annotationText)
    moveContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    const selectedPosition = moveSequence.querySelector('.selected-position')
    moveContainer.move.sequence[selectedPosition.position] = contractExpandedSequence(expandedSequence)
    renderSequence(moveContainer.annotationSequence, annotationSequence, true)
    resetMoveContainerButtons(moveContainer)
    clearContents(moveContainer)
    unselectMoveSequencePosition(moveContainer)
    unexpandMoveContainer(moveContainer)
  }

  function updateAnnotationText (event) {
    event.preventDefault()
    const moveContainer = findMoveContainer(event.target)
    const moveSequence = moveContainer.querySelector('.move-sequence')
    const annotationSequence = moveContainer.querySelector('.annotation-sequence')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    const textArea = moveContainer.querySelector('.annotation-text')
    const annotationText = textArea.value
    textArea.value = ''
    const expandedSequence = annotationPosition.sequence
    const position = annotationPosition.position
    expandedSequence[position] = annotationText
    moveContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    const movePosition = moveSequence.querySelector('.edit-position')
    moveContainer.move.sequence[movePosition.position - 1] = moveContainer.annotationSequence.join(' ')
    renderSequence(moveContainer.annotationSequence, annotationSequence, true)
    renderSequence(moveContainer.move.sequence, moveSequence, true)
    clearContents(moveContainer)
    unselectMoveSequencePosition(moveContainer)
    unexpandMoveContainer(moveContainer)
  }

  function deleteAnnotationText (event) {
    event.preventDefault()
    const moveContainer = findMoveContainer(event.target)
    const moveSequence = moveContainer.querySelector('.move-sequence')
    const annotationSequence = moveContainer.querySelector('.annotation-sequence')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    const expandedSequence = annotationPosition.sequence
    const position = annotationPosition.position
    expandedSequence.splice(position, 2)
    moveContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    const movePosition = moveSequence.querySelector('.edit-position')
    if (moveContainer.annotationSequence.length === 1 && moveContainer.annotationSequence[0] === '{}') {
      delete (moveContainer.annotationSequence)
      moveContainer.move.sequence.splice([movePosition.position - 1], 1)
      moveContainer.move.sequence = contractExpandedSequence(moveContainer.move.sequence)
    } else {
      moveContainer.move.sequence[movePosition.position - 1] = contractExpandedSequence(expandedSequence).join(' ')
    }
    annotationPosition.sequence = moveContainer.expandedSequence
    movePosition.sequence = moveContainer.move.sequence
    renderSequence(moveContainer.move.sequence, moveSequence, true)
    if (moveContainer.annotationSequence) {
      renderSequence(moveContainer.annotationSequence, annotationSequence, true)
    }
    resetMoveContainerButtons(moveContainer)
    clearContents(moveContainer)
    // unselectMoveSequencePosition(moveContainer)
    // unexpandMoveContainer(moveContainer)
  }

  /**
   * adds [% csl] to the annotation block
   * @param {*} event 
   * @returns 
   */
  function insertSquareText (event) {
    event.preventDefault()
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
          colors.red.push(coordinate)          
        } else if (cell.classList.contains('blue-square')) {
          colors.blue.push(coordinate)
        } else if (cell.classList.contains('green-square')) {
          colors.green.push(coordinate)
        } else if (cell.classList.contains('yellow-square')) {
          colors.yellow.push(coordinate)
        }
      }
    }
    let annotationParts = []
    for (const color in colors) {
      if (!colors[color].length) {
        continue
      }
      annotationParts.push(`[%csl ${color.charAt(0).toUpperCase()}${colors[color].join(',')}]`)
    }
    const annotationText = annotationParts.join('')
    const annotationSequence = moveContainer.querySelector('.annotation-sequence')
    const selectedPosition = annotationSequence.querySelector('.selected-position')
    const position = findElementChildIndex(selectedPosition)
    const expandedSequence = expandSequence(moveContainer.annotationSequence)
    expandedSequence.splice((position || 0) + 1, 0, ' ', annotationText)
    moveContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    renderSequence(moveContainer.annotationSequence, annotationSequence, true)
    const resetSquareChessBoardButton = moveContainer.querySelector('.reset-squares-button')
    resetSquareChessBoardButton.onclick({ target: resetSquareChessBoardButton })
    clearContents(moveContainer)
    unselectMoveSequencePosition(moveContainer)
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
      const color = span.innerHTML.substring(0, span.innerHTML.indexOf(' '))
      const coordinates = span.querySelectorAll('i')
      colors[color].push(coordinates[0].innerHTML + coordinates[1].innerHTML)
    }
    let annotationParts = []
    for (const color in colors) {
      if (!colors[color].length) {
        continue
      }
      annotationParts.push(`[%cal ${color.charAt(0).toUpperCase()}${colors[color].join(',')}]`)
    }
    const annotationText = annotationParts.join('')
    const annotationSequence = moveContainer.querySelector('.annotation-sequence')
    const selectedPosition = annotationSequence.querySelector('.selected-position')
    const position = findElementChildIndex(selectedPosition)
    const expandedSequence = expandSequence(moveContainer.annotationSequence)
    expandedSequence.splice((position || 0) + 1, 0, ' ', annotationText)
    moveContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    renderSequence(moveContainer.annotationSequence, annotationSequence, true)
    const resetArrowChessBoardButton = moveContainer.querySelector('.reset-arrows-button')
    resetArrowChessBoardButton.onclick({ target: resetArrowChessBoardButton })
    clearContents(moveContainer)
    unselectMoveSequencePosition(moveContainer)
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
        white = !white
        if (r === '1') {
          cell.innerHTML = '<sub>' + c + '</sub>'
        }
        if (c === 'a') {
          cell.innerHTML += '<sup>' + r + '</sup>'
        }
        cell.style.width = '12%'
        cell.style.height = '12%'
        for (const piece of move.pieces) {
          if (piece.coordinate !== `${c}${r}`) {
            continue
          }
          const color = piece.color === 'w' ? 'o' : 'b'
          cell.style.backgroundImage = `url(themes/${window.themeName}/${color}${piece.type}.png)`
          cell.style.backgroundSize = 'cover'
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

  function expandMoveContainer(moveContainer) {
    moveContainer.classList.add('show-positioning')
    const circle = moveContainer.querySelector('.fa-edit')
    if (circle) {
      circle.classList.add('fa-minus-circle')
      circle.classList.remove('fa-edit')
    }
  }

  function unexpandMoveContainer(moveContainer) {
    moveContainer.classList.remove('show-positioning')
    const circle = moveContainer.querySelector('.fa-minus-circle')
    if (circle) {
      circle.classList.remove('fa-minus-circle')
      circle.classList.add('fa-edit')
    }
  }

  function unselectMoveSequencePosition (moveContainer) {
    moveContainer.classList.remove('show-positioning')
    const list = moveContainer.querySelector('.move-sequence')
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
    const sequence = moveContainer.querySelector('.move-sequence')
    sequence.insertBefore(showSpacing, sequence.firstChild)
  }

  function clearContents (moveContainer) {
    for (const child of moveContainer.children) {
      if (!child.classList.contains('move-sequence') && !child.classList.contains('move-list')) {
        moveContainer.removeChild(child)
      }
      if (child.classList.contains('annotation-sequence')) {
        moveContainer.removeChild(child)
      }
    }
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
