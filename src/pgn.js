let viewPGN

window.setupPGN = () => {
  viewPGN = document.querySelector('.pgn')
  const saveButton = document.querySelector('.file-save-as')
  if (saveButton && saveButton) {
    saveButton.onclick = () => {
      const filename = (window.pgn.tags.White || 'unknown') + '-vs-' + (window.pgn.tags.Black || 'unknown') + '-' + (window.pgn.tags.Result || 'unknown') + '.pgn'
      const file = new window.Blob([window.pgn.toString()], { type: 'pgn' })
      if (window.navigator.msSaveOrOpenBlob) { window.navigator.msSaveOrOpenBlob(file, filename) } else {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        setTimeout(() => {
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)
        }, 0)
      }
    }
  }
  const loadPasteButton = document.querySelector('.file-load-pasted-pgn')
  if (loadPasteButton) {
    loadPasteButton.onclick = () => {
      const loadText = document.querySelector('.paste-pgn')
      if (!loadText || !loadText.value || !loadText.value.length) {
        return
      }
      window.loadPGNFile(loadText.value)
      loadText.value = ''
      pasteContainer.style.display = 'none'
      pgnContainer.style.display = 'block'
    }
  }
  const menuContainer = document.querySelector('.view-pgn-controls')
  const pasteContainer = document.querySelector('.paste-pgn-container')
  const pgnContainer = document.querySelector('.view-pgn')
  const cancelPastebutton = document.querySelector('.file-cancel-paste')
  if (cancelPastebutton) {
    cancelPastebutton.onclick = () => {
      pasteContainer.style.display = 'none'
      pgnContainer.style.display = 'block'
      menuContainer.style.display = 'block'
    }
  }
  const pasteTextButton = document.querySelector('.file-paste')
  if (pasteTextButton) {
    pasteTextButton.onclick = () => {
      pasteContainer.style.display = 'block'
      pgnContainer.style.display = 'none'
      menuContainer.style.display = 'none'
    }
  }
  const openButton = document.querySelector('.file-open')
  if (openButton && openButton) {
    openButton.onclick = () => {
      const uploadInput = document.createElement('input')
      uploadInput.type = 'file'
      uploadInput.onchange = e => {
        const file = e.target.files[0]
        const reader = new window.FileReader()
        reader.readAsText(file, 'UTF-8')
        reader.onload = (readerEvent) => {
          window.loadPGNFile(readerEvent.target.result)
        }
      }
      return uploadInput.click()
    }
  }
}

window.refreshPGN = () => {
  if (!viewPGN) {
    return
  }
  viewPGN.innerHTML = window.pgn.toString()
}
