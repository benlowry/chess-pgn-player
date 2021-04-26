/* eslint-env mocha */
const fs = require('fs')
const path = require('path')
const util = require('util')
const wait = util.promisify((amount, callback) => {
  if (amount && !callback) {
    callback = amount
    amount = null
  }
  return setTimeout(callback, amount || 1)
})

after(async () => {
  try {
    await saveTilesheet(process.env.SCREENSHOT_PATH)
  } catch (error) {
    console.log('an error occurred generating tilesheet', process.env.SCREENSHOT_PATH, error)
    // throw error
  }
})

module.exports = {
  close,
  createBrowser,
  clickNthEditButton,
  clickNthPosition,
  evaluate,
  getElement,
  getTags,
  getText,
  saveScreenshot,
  saveTilesheet,
  wait
}

async function close (page) {
  await page.close()
  await page.browser.close()
}

const allDevices = require('puppeteer/lib/cjs/puppeteer/common/DeviceDescriptors.js')
const devices = [{
    name: 'Desktop',
    userAgent: 'Desktop browser',
    viewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      isLandscape: false
    }
  },
  allDevices.devicesMap['iPad Pro'],
  allDevices.devicesMap['iPad Mini'],
  allDevices.devicesMap['Pixel 2 XL'],
  allDevices.devicesMap['iPhone SE']
]
let device

async function createBrowser (preloadPGN) {
  let browser
  while (true) {
    try {
      browser = await launchBrowser()
    } catch (error) {
      console.log('coudl not launch browser', error)
    }
    if (browser) {
      break
    }
  }
  const page = await browser.newPage()
  page.browser = browser
  await page.setDefaultTimeout(3600000)
  await page.setDefaultNavigationTimeout(3600000)
  if (process.env.SCREENSHOT_DEVICE) {
    for (const deviceInfo of devices) {
      if (deviceInfo.name.toLowerCase() === process.env.SCREENSHOT_DEVICE.toLowerCase()) {
        device = deviceInfo
        break
      }
    }
  } else {
    device = devices[0]
  }
  if (!process.env.FIREFOX && process.env.SCREENSHOT_SCHEME) {
    await page.emulateMediaFeatures([{
      name: 'prefers-color-scheme',
      value: process.env.SCREENSHOT_SCHEME
    }])
  }
  await page.emulate(device)
  if (process.env.SCREENSHOT_THEME) {
    await page.goto(`http://localhost:8080/player.html?theme=${process.env.SCREENSHOT_THEME || 'default'}`, { waitLoad: true, waitNetworkIdle: true })
  } else {
    await page.goto('http://localhost:8080/player.html', { waitLoad: true, waitNetworkIdle: true })
  }
  await page.waitForSelector('.timeline1')
  if (preloadPGN) {
    const pgnButton = await getElement(page, 'PGN')
    await pgnButton.click()
    await page.waitForSelector('.file-paste')
    const pastePGNButton = await getElement(page, 'Paste PGN')
    await pastePGNButton.click()
    await page.waitForSelector('.paste-pgn')
    await page.evaluate((preloadPGN) => {
      const textarea = document.querySelector('.paste-pgn')
      textarea.value = preloadPGN
      const load = document.querySelector('.file-load-pasted-pgn')
      load.onclick()
    }, preloadPGN)
    const playbackButton = await getElement(page, 'Playback')
    await playbackButton.click()
  }
  return page
}

async function saveScreenshot (page, filename) {
  let filePath
  if (process.env.SCREENSHOT_PATH) {
    filePath = path.join(process.env.SCREENSHOT_PATH, filename)
  } else {
    filePath = path.join(__dirname, '..', filename)
  }
  await page.screenshot({
    path: filePath,
    type: 'png'
  })
}

/**
 * Creates a tilesheet for each test's image sequences
 * @param {*} folderPath 
 */
async function saveTilesheet (folderPath) {
  let width = 256
  let height = Math.floor((device.viewport.height  / device.viewport.width) * 256)
  const listItems = {}
  const files = fs.readdirSync(folderPath)
  // identify each group of images and prepare them for displaying in-browser
  let columns = 0
  for (const file of files) {
    if (!file.endsWith('.png')) {
      continue
    }
    if (file.startsWith('tilesheet')) {
      continue
    }
    let fileNameParts = file.split('-')
    const number = parseInt(fileNameParts.pop().split('.')[0])
    if (number > columns) {
      columns = number
    }
    let sequence
    if (file.endsWith(`1-${number}.png`)) {
      sequence = 1
    } else if (file.endsWith(`2-${number}.png`)) {
      sequence = 2
    } else if (file.endsWith(`3-${number}.png`)) {
      sequence = 3
    } else if (file.endsWith(`4-${number}.png`)) {
      sequence = 4
    } else {
      sequence = 0
    }
    if (sequence > 0) {
      fileNameParts = fileNameParts.slice(0, fileNameParts.length - 1).join('-')
    } else {
      fileNameParts = fileNameParts.join('-')
    }
    listItems[fileNameParts] = listItems[fileNameParts] || {}
    listItems[fileNameParts][sequence] = listItems[fileNameParts][sequence] || []
    const filePath = path.join(folderPath, file)
    const base64 = fs.readFileSync(filePath).toString('base64')
    listItems[fileNameParts][sequence].push(`<li style="display: block; float: left; list-style-type: none; padding: 0; margin: 0; width: ${width}px; height: ${height}px; background: url(data:image/png;base64,${base64}) no-repeat; background-size: cover" /></li>`)
  }
  // create a tilesheet for each group
  let totalHeight = 0
  let maximumWidth = 0
  for (const fileNameParts in listItems) {
    console.log('fileNameParts', fileNameParts)
    let browser
    while (true) {
      try {
        browser = await launchBrowser()
      } catch (error) {
        console.log('could not launch browser', error)
      }
      if (browser) {
        break
      }
    }
    const page = await browser.newPage()
    page.browser = browser
    page.on('console', (msg) => {
      if (msg && msg.text) {
        console.error('puppeteer page error', msg.text())
      } else {
        console.error('puppeteer page error', msg)
      }
    })
    const sequences = []
    for (const sequence in listItems[fileNameParts]) {
      sequences.push(listItems[fileNameParts][sequence])
    }
    await page.evaluate((sequences, height) => {
      document.body.style.padding = 0
      document.body.style.margin = 0
      for (const sequence of sequences) {
        document.body.innerHTML += `<div style="width: 100%; height: ${height}px; overflow: hidden"><ul style="list-style-type: none; padding: 0; margin: 0; width: 100%; height: ${height}px">${sequence.join('')}</ul></div>`
      }
    }, sequences, height)
    const pageWidth = width * columns
    const pageHeight = sequences.length * height
    await page.setViewport({ width: pageWidth, height: pageHeight })
    const tilesheetFile = path.join(folderPath, `tilesheet-${fileNameParts.join ? fileNameParts.join('-') : fileNameParts}.png`)
    await page.screenshot({ 
      path: tilesheetFile, 
      type: 'png' 
    })
    try {
      await close(page)
    } catch (error) {
      console.log('could not close page properly')
    }
    totalHeight += pageHeight
    if (pageWidth > maximumWidth) {
      maximumWidth = pageWidth
    }
  }
  // create tilesheet of tilesheets
  const tilesheets = []
  for (const fileNameParts in listItems) {
    const tilesheetFile = path.join(folderPath, `tilesheet-${fileNameParts}.png`)
    const base64 = fs.readFileSync(tilesheetFile).toString('base64')
    const sequences = Object.keys(listItems[fileNameParts])
    tilesheets.push(`<li style="display: block; list-style-type: none; padding: 0; margin: 0; width: 100%; height: ${height * sequences.length}px; background: url(data:image/png;base64,${base64}) no-repeat; background-size: cover" /></li>`)
  }
  let browser
  while (true) {
    try {
      browser = await launchBrowser()
    } catch (error) {
      console.log('could not launch browser', error)
    }
    if (browser) {
      break
    }
  }
  const page = await browser.newPage()
  page.browser = browser
  page.on('console', (msg) => {
    if (msg && msg.text) {
      console.error('puppeteer page error', msg.text())
    } else {
      console.error('puppeteer page error', msg)
    }
  })
  await page.evaluate((listItems, totalHeight) => {
    document.body.style.padding = 0
    document.body.style.margin = 0
    document.body.innerHTML = `<ul style="list-style-type: none; padding: 0; margin: 0; width: 100%; height: ${totalHeight}px">${listItems}</ul>`
  }, tilesheets.join(''), totalHeight)
  await page.setViewport({ width: maximumWidth, height: totalHeight })
  const tilesheetFile = path.join(folderPath, 'tilesheet.png')
  await page.screenshot({ path: tilesheetFile, type: 'png' })
  try {
    await close(page)
  } catch (error) {
    console.log('could not close page properly')
  }
}

async function launchBrowser () {
  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--incognito',
      '--disable-dev-shm-usage',
      '--disable-features=site-per-process'
    ],
    slowMo: 10
  }
  if (process.env.FIREFOX) {
    launchOptions.product = 'firefox'
    if (process.env.SCREENSHOT_SCHEME === 'light') {
      launchOptions.args.push('--disable-blink-features=MediaQueryPrefersColorScheme')
    } else {
      launchOptions.args.push('--force-dark-mode')
    }
  }
  if (process.env.CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.CHROMIUM_EXECUTABLE
  }
  const puppeteer = require('puppeteer')
  return puppeteer.launch(launchOptions)
}

async function clickNthEditButton (page, identifier, nth, child, grandChild, greatGrandChild) {
  return page.evaluate((identifier, nth, child, grandChild, greatGrandChild) => {
    let list = document.querySelector(identifier)
    if (child !== undefined && child > -1) {
      list = list.children[child].querySelector('.turn-list')
      if (grandChild !== undefined && grandChild > -1) {
        list = list.children[grandChild].querySelector('.turn-list')
        if (greatGrandChild !== undefined && greatGrandChild > -1) {
          list = list.children[greatGrandChild].querySelector('.turn-list')
        }
      }
    }
    const buttons = list.querySelectorAll('.turn-option-button')
    buttons[nth].onclick({
      target: buttons[nth]
    })
  }, identifier, nth, child, grandChild, greatGrandChild)
}

async function clickNthPosition (page, identifier, nth, child, grandChild, greatGrandChild) {
  return page.evaluate((identifier, nth, child, grandChild, greatGrandChild) => {
    let list = document.querySelector('.turn-list')
    if (child !== undefined && child > -1) {
      list = list.children[child].querySelector('.turn-list')
      if (grandChild !== undefined && grandChild > -1) {
        list = list.children[grandChild].querySelector('.turn-list')
        if (greatGrandChild !== undefined && greatGrandChild > -1) {
          list = list.children[greatGrandChild].querySelector('.turn-list')
        }
      }
    }
    list = list.querySelector(identifier)
    const item = list.children[nth]
    item.onmousedown({
      target: item
    })
  }, identifier, nth, child, grandChild, greatGrandChild)
}

async function getElement (page, identifier) {
  let element
  if (identifier.startsWith('#')) {
    element = await page.$(identifier)
    if (element) {
      await element.focus()
      return element
    }
    return null
  }
  if (identifier.startsWith('.')) {
    element = await page.$(identifier)
    if (element) {
      await element.focus()
      return element
    }
    return null
  }
  let elements
  if (identifier.startsWith('/')) {
    elements = await getTags(page, 'a')
    const menuLinks = []
    if (elements && elements.length) {
      for (element of elements) {
        const href = await evaluate(page, el => el.href, element)
        if (href) {
          if (href === identifier ||
            href.startsWith(`${identifier}?`) ||
            href.startsWith(`${identifier}&`)) {
            await element.focus()
            return element
          }
        }
      }
      for (element of menuLinks) {
        const href = await evaluate(page, el => el.href, element)
        if (href) {
          if (href === identifier ||
            href.startsWith(`${identifier}?`) ||
            href.startsWith(`${identifier}&`)) {
            await element.focus()
            return element
          }
        }
      }
    }
  }
  const tags = ['button', 'input', 'select', 'textarea', 'img']
  for (const tag of tags) {
    elements = await getTags(page, tag)
    if (!elements || !elements.length) {
      continue
    }
    for (element of elements) {
      const text = await getText(element)
      if (text) {
        if (text === identifier || text.indexOf(identifier) > -1) {
          await element.focus()
          return element
        }
      }
    }
  }
}

async function evaluate (page, method, element) {
  const active = element || page
  while (true) {
    try {
      const thing = await active.evaluate(method, element)
      return thing
    } catch (error) {
    }
    await wait(100)
  }
}

async function getText (page, element) {
  return evaluate(page, (el) => {
    if (!el) {
      return ''
    }
    if (el.innerText && el.innerHTML.indexOf('>') === -1) {
      return el.innerText
    }
    if (el.title) {
      return el.title
    }
    for (let i = 0, len = el.children.length; i < len; i++) {
      if (el.children[i].innerText) {
        return el.children[i].innerText
      }
      if (el.children[i].title) {
        return el.children[i].title
      }
    }
  }, element)
}

async function getTags (page, tag) {
  while (true) {
    try {
      const links = await page.$$(tag)
      return links
    } catch (error) {
    }
    await wait(100)
  }
}
