let playInterval, timelineContainer, timelines, allTimelines, maximumFrames, cellWidth
let moveToCellOnHover = false

window.setupPlayback = () => {
  timelineContainer = document.querySelector('.timeline-container')
  timelineContainer.onmousedown = document.ontouchstart = () => {
    moveToCellOnHover = true
  }
  document.onmouseup = document.ontouchend = () => {
    moveToCellOnHover = false
  }
  timelines = []
  allTimelines = []
  maximumFrames = findLongestFrames(window.pgn.turns, 0)
  timelineContainer.innerHTML = ''
  renderNestedTimeline(window.pgn.turns, null, null)
  // playback frame-move buttons
  const playNestedMoves = document.querySelector('.play-nested-moves')
  const backToStartButton = document.querySelector('.playback-start')
  if (backToStartButton) {
    backToStartButton.onclick = () => {
      if (window.turn === -1) {
        return
      }
      if (playInterval) {
        clearPlayInterval()
      }
      window.turnToStart()
      return window.dispatchEvent(new window.CustomEvent('refresh'))
    }
  }
  const forwardToEndButton = document.querySelector('.playback-end')
  if (forwardToEndButton) {
    forwardToEndButton.onclick = () => {
      if (playInterval) {
        clearPlayInterval()
      }
      if (window.turn === window.turns.length - 1) {
        return
      }
      window.turnToEnd()
      return window.dispatchEvent(new window.CustomEvent('refresh'))
    }
  }
  const backwardButton = document.querySelector('.playback-rewind')
  if (backwardButton) {
    backwardButton.onclick = () => {
      if (playInterval) {
        clearPlayInterval()
      }
      const moved = window.turnToPreviousMove(playNestedMoves.checked)
      if (moved) {
        return window.dispatchEvent(new window.CustomEvent('refresh'))
      }
    }
  }
  const forwardButton = document.querySelector('.playback-forward')
  if (forwardButton) {
    forwardButton.onclick = () => {
      if (playInterval) {
        clearPlayInterval()
      }
      const moved = window.turnToNextMove(playNestedMoves.checked)
      if (moved) {
        return window.dispatchEvent(new window.CustomEvent('refresh'))
      }
    }
  }
  // play back buttons
  const playButton = document.querySelector('.playback-play')
  if (playButton) {
    playButton.onclick = () => {
      if (playInterval) {
        return clearPlayInterval()
      }
      let delayed
      if (window.turn === window.turns.length - 1) {
        const moved = window.turnToPreviousMove(playNestedMoves.checked)
        if (!moved) {
          return
        }
        window.dispatchEvent(new window.CustomEvent('refresh'))
        delayed = true
      }
      // start the timer
      playInterval = setInterval(() => {
        const moved = window.turnToNextMove(playNestedMoves.checked)
        if (!moved) {
          return
        }
        return window.dispatchEvent(new window.CustomEvent('refresh'))
      }, 2400)
      playButton.classList.add('button-down')
      playButton.firstChild.className = 'fas fa-stop'
      // manually move immediately
      const moved = window.turnToNextMove(playNestedMoves.checked)
      if (!moved) {
        return
      }
      if (delayed) {
        return setTimeout(() => {
          return window.dispatchEvent(new window.CustomEvent('refresh'))
        }, 600)
      }
      return window.dispatchEvent(new window.CustomEvent('refresh'))
    }
  }
}

function clearPlayInterval () {
  if (playInterval) {
    clearInterval(playInterval)
    playInterval = null
  }
  const playButton = document.querySelector('.playback-play')
  if (playButton) {
    playButton.classList.remove('button-down')
    playButton.firstChild.className = 'fas fa-play'
  }
}

function hoverCell (event) {
  if (!moveToCellOnHover) {
    return
  }
  let frame = event.target
  if (frame.moveNumber === undefined) {
    frame = frame.parentNode
  }
  if (frame.moveNumber === undefined) {
    return
  }
  window.turns = frame.moves
  window.turn = frame.moveNumber
  return window.dispatchEvent(new window.CustomEvent('refresh'))
}
function clickCell (event) {
  let frame = event.target
  if (frame.moveNumber === undefined) {
    frame = frame.parentNode
  }
  if (frame.moveNumber === undefined) {
    return
  }
  window.turns = frame.moves
  window.turn = frame.moveNumber
  return window.dispatchEvent(new window.CustomEvent('refresh'))
}

// timelines
function createTimeline (moves) {
  const timeline = document.createElement('div')
  timeline.className = `timeline timeline${timelineContainer.children.length + 1}`
  const timelineBar = document.createElement('div')
  timelineBar.className = 'timeline-bar'
  timeline.appendChild(timelineBar)
  const cellPercent = ((1 / moves.length) * 100) + '%'
  for (const i in moves) {
    const frame = document.createElement('span')
    frame.className = 'frame'
    frame.moves = moves
    frame.moveNumber = parseInt(i, 10)
    frame.move = moves[i]
    frame.onmousedown = clickCell
    frame.onmouseover = hoverCell
    frame.style.width = cellPercent
    frame.className = 'frame'
    if (i % 2 !== 0) {
      frame.className += ' alternating-frame'
    }
    frame.title = moves[i].pgn
    if (moves[i].annotations && moves[i].annotations.length) {
      frame.innerHTML = '!'
    }
    timelineBar.appendChild(frame)
  }
  return timelineBar
}

function findLongestFrames (moves, offset) {
  let maximumFrames = 0
  offset = offset || 0
  if (offset + moves.length > maximumFrames) {
    maximumFrames = offset + moves.length
  }
  for (const move of moves) {
    const moveOffset = offset + moves.indexOf(move)
    if (move.siblings) {
      for (const sibling of move.siblings) {
        const nestedMaximum = findLongestFrames(sibling, moveOffset)
        if (nestedMaximum > maximumFrames) {
          maximumFrames = nestedMaximum
        }
      }
    }
  }
  return maximumFrames
}

function renderNestedTimeline (moves, parentTimeline, startPosition) {
  const timeline = createTimeline(moves, parentTimeline)
  timeline.style.top = 0
  timeline.parentTimeline = parentTimeline
  timeline.moves = moves
  timelineContainer.appendChild(timeline.parentNode)
  timeline.lineage = []
  if (parentTimeline) {
    timeline.lineage = timeline.lineage.concat(parentTimeline.lineage)
    timeline.lineage.push(parentTimeline)
  }
  for (const move of moves) {
    if (!move.siblings || !move.siblings.length) {
      continue
    }
    for (const sibling of move.siblings) {
      renderNestedTimeline(sibling, timeline, moves.indexOf(move), maximumFrames)
    }
  }
  const line = document.createElement('div')
  line.className = 'connecting-line'
  timeline.parentNode.appendChild(line)
  const timelineData = {
    timeline,
    line,
    x: parentTimeline ? parentTimeline.children[startPosition].offsetLeft : 0,
    width: moves.length,
    moveWidth: timeline.moveWidth,
    moves,
    parentTimeline,
    startPosition: startPosition || 0,
    lineage: timeline.lineage
  }
  timelineData.lineage = []
  if (parentTimeline) {
    timelineData.lineage = timelineData.lineage.concat(parentTimeline.lineage)
    timelineData.lineage.push(parentTimeline)
    timelines.unshift(timelineData)
  }
  allTimelines.push(timelineData)
}

function findNextTimeline (moves) {
  for (const timeline of timelines) {
    if (timeline.moves === moves) {
      // go to the next sibling
      const parentMoves = timeline.parentTimeline.moves
      const parentMove = timeline.startPosition || 0
      const index = parentMoves[parentMove].siblings.indexOf(moves)
      if (index < parentMoves[parentMove].siblings.length - 1) {
        return {
          moves: parentMoves[parentMove].siblings[index + 1],
          move: 0
        }
      }
      // go to the parent timeline
      return {
        moves: timeline.parentTimeline.moves,
        move: (timeline.startPosition || 0) + 1
      }
    }
  }
}

function findPreviousTimeline (moves) {
  for (const timeline of timelines) {
    if (timeline.moves === moves) {
      // go to the next sibling
      const parentMoves = timeline.parentTimeline.moves
      const parentMove = timeline.startPosition || 0
      const index = parentMoves[parentMove].siblings.indexOf(moves)
      if (index > 0) {
        return {
          moves: parentMoves[parentMove].siblings[index - 1],
          move: parentMoves[parentMove].siblings[index - 1].length - 1
        }
      }
      // go to the parent timeline
      return {
        moves: timeline.parentTimeline.moves,
        move: timeline.startPosition
      }
    }
  }
}

window.turnToNextMove = (playNestedMoves) => {
  if (playNestedMoves && window.turn > -1) {
    const move = window.turns[window.turn]
    // play a nested timeline
    if (move.siblings && move.siblings.length) {
      let index = 0
      if (window.playingSiblings === move.siblings) {
        index = window.playingSiblingsIndex
      }
      window.playingSiblings = move.siblings
      window.playingSiblingsIndex = index
      window.turn = 0
      window.turns = move.siblings[index]
      return true
    }
    // finished playing a nested timeline
    if (window.turn === window.turns.length - 1) {
      const parentMove = findNextTimeline(window.turns)
      if (parentMove) {
        window.turns = parentMove.moves
        window.turn = parentMove.move
        return true
      }
    }
  }
  if (window.turn === window.turns.length - 1) {
    return false
  }
  window.turn++
  return true
}
window.turnToPreviousMove = (playNestedMoves) => {
  if (playNestedMoves && window.turn === 0) {
    const parentMove = findPreviousTimeline(window.turns)
    if (parentMove) {
      window.turns = parentMove.moves
      window.turn = parentMove.move
      return true
    }
  }
  if (window.turn === 0) {
    return false
  }
  window.turn--
  return true
}
window.turnToStart = () => {
  window.turn = -1
  window.turns = window.pgn.turns
  window.pieces = JSON.parse(window.defaultPieces)
}
window.turnToEnd = () => {
  window.turn = window.turns.length - 1
}
window.refreshPlayback = (event) => {
  if (!cellWidth || (event && event.type === 'resize')) {
    cellWidth = document.querySelector('.right').offsetWidth / (maximumFrames + 1)
  }
  // highlight current frame and bar
  const activeFrame = document.querySelector('.current-move-frame')
  if (activeFrame) {
    activeFrame.classList.remove('current-move-frame')
  }
  const activeBar = document.querySelector('.active-bar')
  if (activeBar) {
    activeBar.classList.remove('active-bar')
  }
  let activeTimeline
  for (const timeline of allTimelines) {
    if (timeline.moves !== window.turns) {
      continue
    }
    activeTimeline = timeline
    timeline.timeline.classList.add('active-bar')
    if (window.turn > -1) {
      timeline.timeline.children[window.turn].classList.add('current-move-frame')
    }
  }
  // hide inactive timelines and resize visible ones
  for (const timeline of allTimelines) {
    timeline.timeline.style.width = (cellWidth * timeline.moves.length) + 'px'
    if (timeline.parentTimeline) {
      timeline.timeline.style.left = timeline.line.style.left = (cellWidth * timeline.startPosition) + 'px'
    }
    if (timeline === activeTimeline) {
      timeline.timeline.parentNode.style.opacity = '1'
    } else {
      timeline.timeline.parentNode.style.opacity = '0.6'
    }
  }
  // position the visible timelines
  const oneRem = convertRemToPixels(1)
  const twoRem = oneRem * 2
  const onePointFiveRem = oneRem * 1.75
  let position = 1
  let previous
  // compress timelines into the same y-level where spacing allows
  for (const timeline of timelines) {
    if (timeline.timeline.parentNode.style.display === 'none') {
      continue
    }
    if (previous && previous.parentTimeline === timeline.parentTimeline) {
      const timelineX = timeline.timeline.offsetLeft
      const timelineWidth = timeline.timeline.offsetWidth
      const previousX = previous.timeline.offsetLeft
      const previousWidth = previous.timeline.offsetWidth
      if (timelineX + timelineWidth < previousX || timelineX > previousX + previousWidth) {
        timeline.timeline.style.top = previous.timeline.style.top
        const topValue = parseInt(timeline.timeline.style.top.replace('px', ''), 10)
        const parentTopValue = parseInt(timeline.parentTimeline.style.top.replace('px', ''), 10)
        timeline.line.style.top = (parentTopValue + timeline.parentTimeline.offsetHeight) + 'px'
        timeline.line.style.height = (topValue - parentTopValue - timeline.timeline.offsetHeight + 2) + 'px'
        previous = timeline
        continue
      }
    }
    timeline.timeline.style.top = (position * onePointFiveRem) + 'px'
    if (timeline.parentTimeline) {
      const topValue = parseInt(timeline.timeline.style.top.replace('px', ''), 10)
      const parentTopValue = parseInt(timeline.parentTimeline.style.top.replace('px', ''), 10)
      timeline.line.style.top = (parentTopValue + timeline.parentTimeline.offsetHeight) + 'px'
      timeline.line.style.height = (topValue - parentTopValue - timeline.timeline.offsetHeight + 2) + 'px'
    }
    position++
    previous = timeline
  }
  if (document.body.offsetHeight > document.body.offsetWidth) {
    timelineContainer.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight - document.querySelector('.playback-container').offsetHeight - document.querySelector('.move-description').offsetHeight - document.querySelector('.left').offsetHeight) + 'px'
  } else {
    timelineContainer.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight - document.querySelector('.playback-container').offsetHeight - document.querySelector('.move-description').offsetHeight - document.querySelector('.left').offsetHeight) + 'px'
  }
  timelineContainer.style.overflow = 'scroll'
  // adjust nested timeline size up to 4x if space allows
  const maximumWidth = timelineContainer.offsetWidth
  for (const adjustingTimeline of timelines) {
    if (adjustingTimeline.timeline.children[0].offsetWidth > 30) {
      continue
    }
    const baseWidth = adjustingTimeline.timeline.offsetWidth
    const adjustingX = parseInt(adjustingTimeline.timeline.style.left.replace('px', ''), 10)
    let adjustingWidth
    let increase = 0
    let unblocked = true
    while (unblocked) {
      increase++
      adjustingWidth = increase * baseWidth
      const frameSize = adjustingWidth / adjustingTimeline.moves.length
      if (frameSize > twoRem) {
        unblocked = false
        increase--
        break
      }
      for (const timeline of timelines) {
        if (timeline === adjustingTimeline || adjustingTimeline.timeline.style.top !== timeline.timeline.style.top || timeline.timeline.offsetLeft < adjustingX) {
          continue
        }
        if (adjustingX + adjustingWidth >= timeline.timeline.offsetLeft) {
          unblocked = false
          increase--
          break
        }
      }
      if (adjustingX + adjustingWidth >= maximumWidth) {
        unblocked = false
        increase--
        break
      }
      if (increase > 4) {
        break
      }
    }
    if (increase) {
      adjustingTimeline.timeline.style.width = (baseWidth * increase) + 'px'
    }
  }
}

function convertRemToPixels (rem) {
  return rem * parseFloat(window.getComputedStyle(document.documentElement).fontSize)
}
