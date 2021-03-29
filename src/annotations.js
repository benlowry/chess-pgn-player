((exports) => {
  exports.setupAnnotations = setupAnnotations
  exports.refreshAnnotations = refreshAnnotations
  exports.expandAnnotationSequence = expandAnnotationSequence
  
  let moveList

  function setupAnnotations () {
    moveList = document.querySelector('.move-list')
  }

  function refreshAnnotations() {
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

  function findClosingBracket(index, array) {
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
    if (annotationSequence == '{}') {
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
    if (nextParanthesis  > -1) {
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
      const resetArrowChessBoardButton = moveContainer.querySelector('.reset-squares-button')
      resetArrowChessBoardButton.onclick = (event) => {
        if (event) {
          event.preventDefault()
        }
        arrowChessBoard.innerHTML = ''
        setupMiniChessBoard(arrowChessBoard, moveContainer.move)
        arrowChessBoard.colorButtons = arrowColors
        arrowChessBoard.onclick = startOrStopHighlightArrow
        arrowChessBoard.onmousedown = startHighlightArrow
        arrowChessBoard.onomuseup = endHighlightArrow
      }
      resetArrowChessBoardButton.onclick()
      // annotation squares
      const squareColors = moveContainer.querySelectorAll('.square-color')
      for (const colorButton of squareColors) {
        colorButton.onclick = selectColor
      }
      const insertSquareButton = moveContainer.querySelector('.insert-square-button')
      insertSquareButton.onclick = insertSquareText
      const squareChessBoard = moveContainer.querySelector('.annotate-square-chessboard')
      const resetSquareChessBoardButton = moveContainer.querySelector('.reset-squares-button')
      resetSquareChessBoardButton.onclick = (event) => {
        if (event) {
          event.preventDefault()
        }
        squareChessBoard.innerHTML = ''
        setupMiniChessBoard(squareChessBoard, moveContainer.move)
        squareChessBoard.colorButtons = squareColors
        squareChessBoard.onclick = clickHighlightSquareCell
      }
      resetSquareChessBoardButton.onclick()
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
  let drawingArrow = false
  function startHighlightArrow (event) {
    event.preventDefault()
    drawingArrow = true
  }

  function startOrStopHighlightArrow (event) {
    if (drawingArrow) {
      return endHighlightArrow(event)
    }
    return startHighlightArrow(event)
  }

  function endHighlightArrow (event) {
    event.preventDefault()
    drawingArrow = false
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
    const colors = ['red-square', 'green-square', 'blue-square', 'yellow-square' ]
    let i = -1
    for (const colorButton of table.colorButtons) {
      i++
      if (!colorButton.firstChild) {
        throw new Error('how is this possible...')
      }
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
    console.log('insert text', annotationText, 'insert position', position)
    console.log('sequence', moveContainer.annotationSequence)
    console.log('expanded sequence before insertion', expandSequence(moveContainer.annotationSequence))
    console.log('expanded sequence after insertion', expandedSequence)
    moveContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    console.log('contracted sequence', moveContainer.annotationSequence)
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
    resetSquareChessBoardButton.onclick()
    return cancelAndCloseAnnotationForm(event)
  }

  function insertArrowText(event) {
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
    resetArrowChessBoardButton.onclick()
    return cancelAndCloseAnnotationForm(event)
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
        cell.className = 'chessboard-square ' + (white ? 'white-square' : 'black-square')
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
    console.log('cancelAndCloseAnnotationForm', event.target.className, event.target)
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
    if (resetArrowChessBoardButton && resetArrowChessBoardButton.onclick) {
      resetArrowChessBoardButton.onclick()
    }
    const resetSquareChessBoardButton = moveContainer.querySelector('.reset-squares-button')
    if (resetSquareChessBoardButton && resetSquareChessBoardButton.onclick) {
      resetSquareChessBoardButton.onclick()
    }
    console.log('now the only thing showing should be buttons', arrowInput)
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
