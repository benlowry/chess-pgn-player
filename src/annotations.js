((exports) => {
  exports.setupAnnotations = setupAnnotations
  exports.refreshAnnotations = refreshAnnotations
  exports.expandAnnotationSequence = expandAnnotationSequence

  let moveList, lastRenderedPGN

  function setupAnnotations () {
    moveList = document.querySelector('.move-list')
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

  function expandSequence (sequence) {
    const expanded = [' ']
    for (const item of sequence) {
      if (!item.startsWith('{')) {
        expanded.push(item, ' ')
        continue
      }
      const annotationParts = expandAnnotationSequence(item)
      for (const part of annotationParts) {
        expanded.push(part, ' ')
      }
    }
    console.log('expanded', sequence, expanded)
    // const splice = []
    // for (const i in expanded) {
    //   const int = parseInt(i, 10)
    //   if (int < expanded.length - 1) {
    //     const next = int + 1
    //     if (expanded[i] === ' ' && expanded[next] === ' ') {
    //       splice.unshift(i)
    //     }
    //   }
    // }
    // for (const i of splice) {
    //   expanded = expanded.splice(i, 1)
    // }
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
    let copy = annotationSequence.substring(1, annotationSequence.length - 1)
    console.log('copy', copy)
    while (copy.length) {
      const firstCharacter = copy.charAt(0)
      if (firstCharacter === '$') {
        const nag = copy.substring(0, copy.indexOf(' '))
        lineParts.push(nag)
        copy = copy.substring(nag.length)
        continue
      }
      if (firstCharacter === '[') {
        const highlight = copy.substring(0, copy.indexOf(']') + 1)
        lineParts.push(highlight)
        copy = copy.substring(highlight.length)
        continue
      }
      if (firstCharacter === '(') {
        const closingIndex = findClosingBracket(0, copy)
        const nestedMoves = copy.substring(0, closingIndex + 1)
        lineParts.push(nestedMoves)
        copy = copy.substring(nestedMoves.length)
        continue
      }
      if (firstCharacter === '{') {
        const closingIndex = findClosingBracket(0, copy)
        const nestedAnnotation = copy.substring(0, closingIndex + 1)
        lineParts.push(nestedAnnotation)
        copy = copy.substring(nestedAnnotation.length)
        continue
      }
      const nextSegment = copy.substring(0, firstInterruption(copy))
      copy = copy.substring(nextSegment.length)
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
    console.log('valid', valid)
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
    console.log('rendering sequence', sequence, expandedSequence)
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
      if (item.length > 30) {
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
      const annotationTabsTemplate = document.querySelector('#annotation-tabs')
      const annotationTabs = document.importNode(annotationTabsTemplate.content, true)
      moveContainer.insertBefore(annotationTabs, positionList.nextSibling)
      // tabs for different types of insertion
      const tabButtons = moveContainer.querySelectorAll('.annotation-tab-button')
      for (const button of tabButtons) {
        button.onclick = showAnnotationTab
      }
      showAnnotationTab({ target: tabButtons[0] })
      // inserting annotation
      const insertAnnotationButton = moveContainer.querySelector('.add-annotation-button')
      insertAnnotationButton.onclick = commitAnnotation
      // tabs for different annotation segments
      const addTextButton = moveContainer.querySelector('.add-text-button')
      addTextButton.onclick = showAnnotationTypeForm
      const addSquareButton = moveContainer.querySelector('.add-square-button')
      addSquareButton.onclick = showAnnotationTypeForm
      const addArrowButton = moveContainer.querySelector('.add-arrow-button')
      addArrowButton.onclick = showAnnotationTypeForm
      // set up nag form, nags are inserted directly into the move PGN
      const commitNagButton = moveContainer.querySelector('.add-nag-button')
      commitNagButton.onclick = commitNag
      const nagSelect = moveContainer.querySelector('.nag-select')
      const nagIndex = document.querySelector('#nag-index')
      const nagCopy = document.importNode(nagIndex.content, true)
      for (const option of nagCopy.children) {
        nagSelect.appendChild(option)
      }
      // set up annotation form, annotations are created from text,
      // arrow and square highlights and then inserted into the move PGN
      const moveSequence = moveContainer.querySelector('.annotation-sequence')
      moveContainer.annotationSequence = ['{}']
      renderSequence(moveContainer.annotationSequence, moveSequence, true)
      moveSequence.children[1].classList.add('selected-position')
      moveSequence.children[1].firstChild.firstChild.classList.remove('fa-circle')
      moveSequence.children[1].firstChild.firstChild.classList.add('fa-dot-circle')
      // annotation arrows
      const arrowColors = moveContainer.querySelectorAll('.arrow-color')
      for (const colorButton of arrowColors) {
        colorButton.onclick = selectColor
      }
      const insertArrowButton = moveContainer.querySelector('.insert-text-button')
      insertArrowButton.onclick = insertArrowText
      const arrowChessBoard = moveContainer.querySelector('.annotate-arrow-chessboard')
      arrowChessBoard.parentNode.onmousedown = startOrStopHighlightArrow
      arrowChessBoard.parentNode.onmouseup = startOrStopHighlightArrow
      arrowChessBoard.colorButtons = arrowColors
      arrowChessBoard.mouseEnabled = false
      const resetArrowChessBoardButton = moveContainer.querySelector('.reset-arrows-button')
      resetArrowChessBoardButton.onclick = (event) => {
        if (event && event.preventDefault) {
          event.preventDefault()
        }
        const moveContainer = findMoveContainer(event.target)
        const arrowChessBoard = moveContainer.querySelector('.annotate-arrow-chessboard')
        const arrows = moveContainer.querySelectorAll('svg')
        if (arrows && arrows.length) {
          for (const arrow of arrows) {
            arrow.parentNode.removeChild(arrow)
          }
        }
        if (!arrowChessBoard.rows.length) {
          setupMiniChessBoard(arrowChessBoard, moveContainer.move)
        }
      }
      resetArrowChessBoardButton.onclick({ target: resetArrowChessBoardButton })
      // annotation squares
      const squareColors = moveContainer.querySelectorAll('.square-color')
      for (const colorButton of squareColors) {
        colorButton.onclick = selectColor
      }
      const insertSquareButton = moveContainer.querySelector('.insert-square-button')
      insertSquareButton.onclick = insertSquareText
      const squareChessBoard = moveContainer.querySelector('.annotate-square-chessboard')
      squareChessBoard.colorButtons = squareColors
      squareChessBoard.onclick = clickHighlightSquareCell
      const resetSquareChessBoardButton = moveContainer.querySelector('.reset-squares-button')
      resetSquareChessBoardButton.onclick = (event) => {
        if (event && event.preventDefault) {
          event.preventDefault()
        }
        const moveContainer = findMoveContainer(event.target)
        const squareChessBoard = moveContainer.querySelector('.annotate-square-chessboard')
        squareChessBoard.innerHTML = ''
        setupMiniChessBoard(squareChessBoard, moveContainer.move)
      }
      resetSquareChessBoardButton.onclick({ target: resetSquareChessBoardButton })
      // annotation text
      const insertTextButton = moveContainer.querySelector('.insert-text-button')
      insertTextButton.onclick = insertAnnotationText
      // cancel buttons
      const cancelButtons = Array.from(moveContainer.querySelectorAll('.cancel-button'))
      for (const button of cancelButtons) {
        if (button.classList.contains('cancel-annotation-button')) {
          button.onclick = cancelAndCloseAnnotationForm
        } else {
          button.onclick = cancelAndCloseForm
        }
      }
    }
  }

  function showAnnotationTypeForm (event) {
    event.preventDefault()
    console.log('show annotationt ype form', event.target.className)
    const moveContainer = findMoveContainer(event.target)
    const typeButtons = moveContainer.querySelector('.annotation-button-container')
    typeButtons.style.display = 'none'
    const textInput = moveContainer.querySelector('.text-input')
    textInput.style.display = 'none'
    const arrowInput = moveContainer.querySelector('.arrow-input')
    arrowInput.style.display = 'none'
    const squareInput = moveContainer.querySelector('.square-input')
    squareInput.style.diplay = 'none'
    if (event.target.classList.contains('add-text-button')) {
      textInput.style.display = 'block'
    } else if (event.target.classList.contains('add-square-button')) {
      squareInput.style.display = 'block'
    } else {
      arrowInput.style.display = 'block'
    }
  }
  let startingArrow = false

  function startOrStopHighlightArrow (event) {
    let container = event.target
    while (!container.classList.contains('mini-chessboard-container')) {
      container = container.parentNode
    }
    const offset = getOffset(container)
    const xPosition = event.clientX - offset.left
    const yPosition = event.clientY - offset.top
    const cellWidth = container.offsetWidth / 8
    const cellX = Math.floor(xPosition / cellWidth)
    const cellY = Math.floor(yPosition / cellWidth)
    const row = '87654321'.charAt(cellY)
    const column = 'abcdefgh'.charAt(cellX)
    if (startingArrow) {
      const target = container.querySelector(`.coordinate-${column}${row}`)
      target.coordinate = `${column}${row}`
      console.log('adjusted event target', 'coordinate', `${column}${row}`, 'event target', event.target, 'new target', target)
      endHighlightArrow({ target })
      startingArrow = false
    } else {
      startingArrow = `${column}${row}`
    }
  }

  function getOffset (element) {
    let top = 0
    let left = 0
    while (element && !isNaN(element.offsetLeft) && !isNaN(element.offsetTop)) {
      left += element.offsetLeft - element.scrollLeft
      top += element.offsetTop - element.scrollTop
      element = element.offsetParent
    }
    return { top, left }
  }

  function endHighlightArrow (event) {
    console.log('end highlight arrow', startingArrow, event.target)
    if (!startingArrow) {
      return
    }
    let table = event.target
    while (table.tagName !== 'TABLE') {
      table = table.parentNode
    }
    if (event.target.tagName !== 'TD' && event.target.parentNode.tagName !== 'TD') {
      return
    }
    const moveContainer = findMoveContainer(event.target)
    const chessboard = moveContainer.querySelector('.annotate-arrow-chessboard')
    const colors = ['red', 'green', 'blue', 'yellow']
    let i = -1
    let color
    const colorButtons = moveContainer.querySelectorAll('.arrow-color')
    console.log('color buttons', colorButtons)
    for (const colorButton of colorButtons) {
      i++
      if (!colorButton.firstChild.classList.contains('fa-dot-circle')) {
        continue
      }
      color = colors[i]
      break
    }
    const arrow = drawArrow(startingArrow, event.target.coordinate, chessboard)
    arrow.classList.add('chessboard-arrow')
    arrow.classList.add(`${color}-arrow`)
    arrow.style.width = chessboard.offsetWidth
    arrow.style.height = chessboard.offsetHeight
    arrow.parentNode.innerHTML += ''
  }

  function clickHighlightSquareCell (event) {
    event.preventDefault()
    let table = event.target
    while (table.tagName !== 'TABLE') {
      table = table.parentNode
    }
    if (event.target.tagName !== 'TD' && event.target.parentNode.tagName !== 'TD') {
      return
    }
    const cell = event.target.tagName === 'TD' ? event.target : event.target.parentNode
    const colors = ['red-square', 'green-square', 'blue-square', 'yellow-square']
    let i = -1
    const colorButtons = table.parentNode.firstChild.children
    for (const colorButton of colorButtons) {
      i++
      if (!colorButton.firstChild.classList.contains('fa-dot-circle')) {
        continue
      }
      for (const color of colors) {
        if (color === colors[i]) {
          continue
        }
        cell.classList.remove(color)
      }
      if (cell.classList.contains(colors[i])) {
        cell.classList.remove(colors[i])
      } else {
        cell.classList.add(colors[i])
      }
    }
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

  function showAnnotationTab (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    console.log('now show annotation form')
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

  function commitAnnotation (event) {
    event.preventDefault()
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
    return cancelAndCloseForm(event)
  }

  function insertAnnotationText (event) {
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
    moveSequence.children[moveSequence.children.length - 2].classList.add('selected-position')
    moveSequence.children[moveSequence.children.length - 2].firstChild.firstChild.classList.remove('fa-circle')
    moveSequence.children[moveSequence.children.length - 2].firstChild.firstChild.classList.add('fa-dot-circle')
    return cancelAndCloseAnnotationForm(event)
  }

  function insertSquareText (event) {
    event.preventDefault()
    const moveContainer = findMoveContainer(event.target)
    const annotationText = '[%csl Ra1,b1,b3]'
    const moveSequence = moveContainer.querySelector('.annotation-sequence')
    const selectedPosition = moveSequence.querySelector('.selected-position')
    const position = findElementChildIndex(selectedPosition)
    const expandedSequence = expandSequence(moveContainer.annotationSequence)
    expandedSequence.splice((position || 0) + 1, 0, ' ', annotationText)
    console.log('insert square', annotationText, 'insert position', position)
    console.log('sequence', moveContainer.annotationSequence)
    console.log('expanded sequence before insertion', expandSequence(moveContainer.annotationSequence))
    console.log('expanded sequence after insertion', expandedSequence)
    moveContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    console.log('contracted sequence', moveContainer.annotationSequence)
    renderSequence(moveContainer.annotationSequence, moveSequence, true)
    moveSequence.children[moveSequence.children.length - 2].classList.add('selected-position')
    moveSequence.children[moveSequence.children.length - 2].firstChild.firstChild.classList.remove('fa-circle')
    moveSequence.children[moveSequence.children.length - 2].firstChild.firstChild.classList.add('fa-dot-circle')
    const resetSquareChessBoardButton = moveContainer.querySelector('.reset-squares-button')
    resetSquareChessBoardButton.onclick({ target: resetSquareChessBoardButton })
    return cancelAndCloseAnnotationForm(event)
  }

  function insertArrowText (event) {
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
    moveSequence.children[moveSequence.children.length - 2].classList.add('selected-position')
    moveSequence.children[moveSequence.children.length - 2].firstChild.firstChild.classList.remove('fa-circle')
    moveSequence.children[moveSequence.children.length - 2].firstChild.firstChild.classList.add('fa-dot-circle')
    const resetArrowChessBoardButton = moveContainer.querySelector('.reset-arrows-button')
    resetArrowChessBoardButton.onclick({ target: resetArrowChessBoardButton })
    return cancelAndCloseAnnotationForm(event)
  }

  function drawArrow (firstCoordinate, lastCoordinate, chessboard) {
    const previousValues = {}
    const moveSteps = [firstCoordinate, lastCoordinate]
    let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    chessboard.parentNode.appendChild(svg)
    svg = chessboard.parentNode.lastChild
    const sixteenthCellSize = chessboard.offsetWidth / 8 / 8 / 2
    const eighthCellSize = sixteenthCellSize * 2
    const quarterCellSize = eighthCellSize * 2
    const halfCellSize = quarterCellSize * 2
    svg.style.strokeWidth = (sixteenthCellSize * 1.5) + 'px'
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    svg.appendChild(defs)
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
    console.log('move steps', moveSteps)
    for (const i in moveSteps) {
      const stepCoordinate = moveSteps[i]
      const cell = chessboard.querySelector(`.coordinate-${stepCoordinate}`)
      if (!cell) {
        console.log('could not find cell for coordinate', stepCoordinate, 'in chessboard', chessboard)
      }
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

  function setupMiniChessBoard (table, move) {
    const rows = '87654321'.split('')
    const columns = 'abcdefgh'.split('')
    let white = false
    for (const r of rows) {
      const row = table.insertRow(table.rows.length)
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
      }
    }
  }

  function cancelAndCloseAnnotationForm (event) {
    event.preventDefault()
    const moveContainer = findMoveContainer(event.target)
    const typeButtons = moveContainer.querySelector('.annotation-button-container')
    typeButtons.style.display = 'block'
    const textInput = moveContainer.querySelector('.text-input')
    textInput.style.display = 'none'
    const arrowInput = moveContainer.querySelector('.arrow-input')
    arrowInput.style.display = 'none'
    const squareInput = moveContainer.querySelector('.square-input')
    squareInput.style.display = 'none'
    const resetArrowChessBoardButton = moveContainer.querySelector('.reset-arrows-button')
    resetArrowChessBoardButton.onclick({ target: resetArrowChessBoardButton })
    const resetSquareChessBoardButton = moveContainer.querySelector('.reset-squares-button')
    resetSquareChessBoardButton.onclick({ target: resetSquareChessBoardButton })
  }

  function cancelAndCloseForm (event) {
    event.preventDefault()
    const moveContainer = findMoveContainer(event.target)
    moveContainer.classList.remove('show-positioning')
    const minusCircle = moveContainer.querySelector('.fa-minus-circle')
    if (minusCircle) {
      minusCircle.classList.remove('fa-minus-circle')
      minusCircle.classList.add('fa-edit')
    }
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
})(typeof exports === 'undefined' ? this.annotations = {} : exports)
