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

async function createBrowser(preloadPGN) {
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
  if (process.env.CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.CHROMIUM_EXECUTABLE
  }
  const puppeteer = require('puppeteer')
  const browser = await puppeteer.launch(launchOptions)
  const page = await browser.newPage()
  page.browser = browser
  await page.setDefaultTimeout(3600000)
  await page.setDefaultNavigationTimeout(3600000)
  await page.goto('http://localhost:8080/player.html', { waitLoad: true, waitNetworkIdle: true })
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

async function saveScreenshot(page, filename) {
  await page.screenshot({
    path: path.join(__dirname, '..', filename),
    type: 'png'
  })
}

async function clickNthEditButton (page, identifier, nth) {
  return page.evaluate((identifier, nth) => {
    const buttons = document.querySelector(identifier).querySelectorAll('.move-option-button')
    buttons[nth].onclick({
      target: buttons[nth]
    })
  }, identifier, nth)
}

async function clickNthPosition (page, identifier, nth) {
  return page.evaluate((identifier, nth) => {
    const list = document.querySelector(identifier)
    list.children[nth].onmousedown({
      target: list.children[nth]
    })
  }, identifier, nth)
}

async function getElement(page, identifier) {
  let element
  if (identifier.startsWith('#')) {
    element = await page.$(identifier)
    if (element) {
      return element
    }
    return null
  }
  if (identifier.startsWith('.')) {
    element = await page.$(identifier)
    if (element) {
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
          return element
        }
      }
    }
  }
}

async function evaluate(page, method, element) {
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

async function getText(page, element) {
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

async function getTags(page, tag) {
  while (true) {
    try {
      const links = await page.$$(tag)
      return links
    } catch (error) {
    }
    await wait(100)
  }
}