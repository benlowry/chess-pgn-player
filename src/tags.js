let tagsTable

window.setupTags = () => {
  tagsTable = document.querySelector('.tags-table')
  if (!tagsTable) {
    return
  }
  while (tagsTable.rows.length > 1) {
    tagsTable.deleteRow(1)
  }
  const tags = Object.keys(window.pgn.tags)
  for (const tag of tags) {
    createTagRow(tag)
  }
  const addButton = document.querySelector('.add-tag-button')
  addButton.onclick = () => {
    const nameInput = document.querySelector('.new-tag-name')
    const name = nameInput.value
    if (!name || !name.length) {
      return
    }
    const valueInput = document.querySelector('.new-tag-value')
    const value = valueInput.value
    if (!value || !value.length) {
      return
    }
    // tag already exists
    if (window.pgn.tags[name]) {
      return
    }
    // add tag
    nameInput.value = ''
    valueInput.value = ''
    window.pgn.tags[name] = value
    createTagRow(name, true)
    return regeneratePGNHeader()
  }
  const tagsContainer = document.querySelector('.tags-container')
  if (document.body.offsetHeight > document.body.offsetWidth) {
    tagsContainer.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight) + 'px'
  } else {
    tagsContainer.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight) + 'px'
  }
  tagsContainer.style.overflow = 'scroll'
}

function regeneratePGNHeader () {
  window.pgn.tags = {}
  for (const row of tagsTable.rows) {
    if (row.className !== 'tag-row') {
      continue
    }
    const name = row.cells[0].firstChild.value
    const value = row.cells[1].firstChild.value
    window.pgn.tags[name] = value
  }
  return window.dispatchEvent(new window.CustomEvent('refresh'))
}

function createTagRow (tag, last) {
  const row = tagsTable.insertRow(1)
  row.className = 'tag-row'
  const nameCell = row.insertCell(0)
  nameCell.className = 'tag-name'
  const nameInput = document.createElement('input')
  nameInput.type = 'text'
  nameInput.value = tag
  nameInput.className = 'tag-input'
  nameInput.onchange = nameInput.onkeyup = regeneratePGNHeader
  nameCell.appendChild(nameInput)
  const valueCell = row.insertCell(1)
  valueCell.className = 'tag-value'
  const valueInput = document.createElement('input')
  valueInput.type = 'text'
  valueInput.className = 'tag-input'
  valueInput.value = window.pgn.tags[tag]
  valueInput.onchange = nameInput.onkeyup = regeneratePGNHeader
  valueCell.appendChild(valueInput)
  const buttonCell = row.insertCell(2)
  const deleteButton = document.createElement('button')
  deleteButton.className = 'tag-button delete-tag-button'
  deleteButton.title = 'Delete this tag'
  deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>'
  deleteButton.onclick = (event) => {
    const deleteRow = event.target.parentNode.parentNode
    deleteRow.parentNode.removeChild(deleteRow)
    return regeneratePGNHeader()
  }
  buttonCell.appendChild(deleteButton)
}
