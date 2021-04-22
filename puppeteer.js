/* eslint-env mocha */
const path = require('path')
const util = require('util')
const wait = util.promisify((amount, callback) => {
  if (amount && !callback) {
    callback = amount
    amount = null
  }
  return setTimeout(callback, amount || 1)
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
  wait
}

function close (page) {
  page.close()
  page.browser.close()
}

async function createBrowser (preloadPGN) {
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
  }
  if (process.env.CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.CHROMIUM_EXECUTABLE
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
  const puppeteer = require('puppeteer')
  const browser = await puppeteer.launch(launchOptions)
  const page = await browser.newPage()
  page.browser = browser
  await page.setDefaultTimeout(3600000)
  await page.setDefaultNavigationTimeout(3600000)
  let device
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
  if (process.env.SCREENSHOT_SCHEME) {
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
