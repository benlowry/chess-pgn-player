/* eslint-env mocha */
const assert = require('assert')
const annotations = require('./annotations.js')
const path = require('path')
const util = require('util')
const wait = util.promisify((amount, callback) => {
  if (amount && !callback) {
    callback = amount
    amount = null
  }
  return setTimeout(callback, amount || 1)
})

describe('annotations.js', () => {
  describe('expandAnnotationSequence', () => {
    it('parse empty annotation', () => {
      const sample = '{}'
      const expanded = annotations.expandAnnotationSequence(sample)
      assert.strictEqual(expanded.join('-'), '{-}')
    })

    it('parse one-piece annotation', () => {
      const sample = '{first sample}'
      const expanded = annotations.expandAnnotationSequence(sample)
      assert.strictEqual(expanded.join('='), '{=first sample=}')
    })

    it('parse two-piece annotation', () => {
      const sample1 = '{[%cal Ra1,a2]first sample}'
      const expanded1 = annotations.expandAnnotationSequence(sample1)
      assert.strictEqual(expanded1.join('-'), '{-[%cal Ra1,a2]-first sample-}')
      const sample2 = '{second sample[%cal Ra1,a2]}'
      const expanded2 = annotations.expandAnnotationSequence(sample2)
      assert.strictEqual(expanded2.join('-'), '{-second sample-[%cal Ra1,a2]-}')
    })

    it('parse three-piece annotation', () => {
      const sample1 = '{[%cal Ra1,a2][%csl Ra1,a2]first sample}'
      const expanded1 = annotations.expandAnnotationSequence(sample1)
      assert.strictEqual(expanded1.join('-'), '{-[%cal Ra1,a2]-[%csl Ra1,a2]-first sample-}')
      const sample2 = '{[%cal Ra1,a2]second sample[%csl Ra1,a2]}'
      const expanded2 = annotations.expandAnnotationSequence(sample2)
      assert.strictEqual(expanded2.join('-'), '{-[%cal Ra1,a2]-second sample-[%csl Ra1,a2]-}')
      const sample3 = '{third sample[%cal Ra1,a2][%csl Ra1,a2]}'
      const expanded3 = annotations.expandAnnotationSequence(sample3)
      assert.strictEqual(expanded3.join('-'), '{-third sample-[%cal Ra1,a2]-[%csl Ra1,a2]-}')
    })
  })

  describe('insertNag', () => {
    it('should insert into any position', async () => {
      const positions = [' ', '1.', ' ', 'e4', ' ', 'd7', ' ']
      for (const i in positions) {
        if (positions[i] !== ' ') {
          continue
        }
        const page = await createBrowser('1. e4 d7')
        const annotationsButton = await getElement(page, 'Annotations')
        await annotationsButton.click()
        await page.waitForSelector('.move-sequence')
        await clickNthEditButton(page, 'move-list', 0)
        await clickNthPosition(page, '.move-sequence', i)
        await page.waitForSelector('.nag-button')
        const nagButton = await getElement(page, '.nag-button')
        nagButton.click()
        await page.waitForSelector('.nag-select')
        const nagSelect = await getElement(page, '.nag-select')
        await nagSelect.select('$14')
        await page.waitForSelector('.add-nag-button')
        const insertNag = await getElement(page, '.add-nag-button')
        insertNag.click()
        await wait(100)
        const pgnButton = await getElement(page, 'PGN')
        await pgnButton.click()
        const content = await evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
        const newPositions = [' ', '1.', ' ', 'e4', ' ', 'd7', ' ']
        newPositions[i] = '$14'
        assert.strictEqual(0, content.indexOf(newPositions.join('')))
        await page.close()
        await page.browser.close()
      }
    })

    it('screenshots', async  () => {
      const testName = 'insert-nag-before-move'
      const page = await createBrowser('1. e4 d7')
      await saveScreenshot(page, `${testName}-1.png`)
      const annotationsButton = await getElement(page, 'Annotations')
      await annotationsButton.click()
      await page.waitForSelector('.move-sequence')
      await saveScreenshot(page, `${testName}-2.png`)
      await page.waitForSelector('.move-options-item')
      const firstEditButton = await getElement(page, '.move-options-item')
      await firstEditButton.click()
      await saveScreenshot(page, `${testName}-3.png`)
      await page.waitForSelector('.sequence-position-item')
      const firstPosition = await getElement(page, '.sequence-position-item')
      firstPosition.click()
      await page.waitForSelector('.nag-button')
      await saveScreenshot(page, `${testName}-4.png`)
      const nagButton = await getElement(page, '.nag-button')
      nagButton.click()
      await page.waitForSelector('.nag-select')
      const nagSelect = await getElement(page, '.nag-select')
      await nagSelect.select('$14')
      await saveScreenshot(page, `${testName}-5.png`)
      await page.waitForSelector('.add-nag-button')
      const insertNag = await getElement(page, '.add-nag-button')
      insertNag.click()
      await wait(100)
      await saveScreenshot(page, `${testName}-6.png`)
      const pgnButton = await getElement(page, 'PGN')
      await pgnButton.click()
      const content = await evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
      const moveText = content.substring(content.indexOf(']\n\n') + 3).trim()
      assert.strictEqual(0, moveText.indexOf('$14 {Ding Liren is world class player who is typically seen as a solid but very strong player, however in this game he shows off an incredible imagination. His opponent is a fellow countrymen who made GM at just the age of sixteen.} 1. d4'))
      await page.close()
      await page.browser.close()
    })
  })

  describe('updateNag', () => {
    it('should update before move', async () => {
      const testName = 'update-nag-before-move'
      const page = await createBrowser()
      await page.goto('http://localhost:8080/player.html', { waitLoad: true, waitNetworkIdle: true })
      await page.waitForSelector('.timeline1')
      await saveScreenshot(page, `${testName}-1.png`)
      const annotationsButton = await getElement(page, 'Annotations')
      await annotationsButton.click()
      await page.waitForSelector('.move-sequence')
      await saveScreenshot(page, `${testName}-2.png`)
      await page.waitForSelector('.move-options-item')
      const firstEditButton = await getElement(page, '.move-options-item')
      await firstEditButton.click()
      await saveScreenshot(page, `${testName}-3.png`)
      await page.waitForSelector('.sequence-position-item')
      const firstPosition = await getElement(page, '.sequence-position-item')
      firstPosition.click()
      await page.waitForSelector('.nag-button')
      await saveScreenshot(page, `${testName}-4.png`)
      const nagButton = await getElement(page, '.nag-button')
      nagButton.click()
      await page.waitForSelector('.nag-select')
      const nagSelect = await getElement(page, '.nag-select')
      await nagSelect.select('$14')
      await saveScreenshot(page, `${testName}-5.png`)
      await page.waitForSelector('.add-nag-button')
      const insertNag = await getElement(page, '.add-nag-button')
      insertNag.click()
      await wait(100)
      await saveScreenshot(page, `${testName}-6.png`)
      const pgnButton = await getElement(page, 'PGN')
      await pgnButton.click()
      const content = await evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
      const moveText = content.substring(content.indexOf(']\n\n') + 3).trim()
      assert.strictEqual(0, moveText.indexOf('$14 {Ding Liren is world class player who is typically seen as a solid but very strong player, however in this game he shows off an incredible imagination. His opponent is a fellow countrymen who made GM at just the age of sixteen.} 1. d4'))
      await page.close()
      await page.browser.close()
    })

    it('should update after annotation before move', async () => {
      const testName = 'update-nag-after-annotation-before-move'
      const page = await createBrowser()
      await page.goto('http://localhost:8080/player.html', { waitLoad: true, waitNetworkIdle: true })
      await page.waitForSelector('.timeline1')
      await saveScreenshot(page, `${testName}-1.png`)
      const annotationsButton = await getElement(page, 'Annotations')
      await annotationsButton.click()
      await page.waitForSelector('.move-sequence')
      await saveScreenshot(page, `${testName}-2.png`)
      await page.waitForSelector('.move-options-item')
      const firstEditButton = await getElement(page, '.move-options-item')
      await firstEditButton.click()
      await saveScreenshot(page, `${testName}-3.png`)
      await clickNthPosition(page, '.move-sequence', 3)
      await page.waitForSelector('.nag-button')
      await saveScreenshot(page, `${testName}-4.png`)
      const nagButton = await getElement(page, '.nag-button')
      nagButton.click()
      await page.waitForSelector('.nag-select')
      const nagSelect = await getElement(page, '.nag-select')
      await nagSelect.select('$27')
      await saveScreenshot(page, `${testName}-5.png`)
      await page.waitForSelector('.add-nag-button')
      const insertNag = await getElement(page, '.add-nag-button')
      insertNag.click()
      await wait(100)
      await saveScreenshot(page, `${testName}-6.png`)
      const pgnButton = await getElement(page, 'PGN')
      await pgnButton.click()
      const content = await evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
      const moveText = content.substring(content.indexOf(']\n\n') + 3).trim()
      assert.strictEqual(0, moveText.indexOf('{Ding Liren is world class player who is typically seen as a solid but very strong player, however in this game he shows off an incredible imagination. His opponent is a fellow countrymen who made GM at just the age of sixteen.} $27 1. d4'))
      await page.close()
      await page.browser.close()
    })

    it('should update after move number', async () => {
      const testName = 'update-nag-after-move-number'
      const page = await createBrowser()
      await page.goto('http://localhost:8080/player.html', { waitLoad: true, waitNetworkIdle: true })
      await page.waitForSelector('.timeline1')
      await saveScreenshot(page, `${testName}-1.png`)
      const annotationsButton = await getElement(page, 'Annotations')
      await annotationsButton.click()
      await page.waitForSelector('.move-sequence')
      await saveScreenshot(page, `${testName}-2.png`)
      await page.waitForSelector('.move-options-item')
      const firstEditButton = await getElement(page, '.move-options-item')
      await firstEditButton.click()
      await saveScreenshot(page, `${testName}-3.png`)
      await clickNthPosition(page, '.move-sequence', 5)
      await page.waitForSelector('.nag-button')
      await saveScreenshot(page, `${testName}-4.png`)
      const nagButton = await getElement(page, '.nag-button')
      nagButton.click()
      await page.waitForSelector('.nag-select')
      const nagSelect = await getElement(page, '.nag-select')
      await nagSelect.select('$43')
      await saveScreenshot(page, `${testName}-5.png`)
      await page.waitForSelector('.add-nag-button')
      const insertNag = await getElement(page, '.add-nag-button')
      insertNag.click()
      await wait(100)
      await saveScreenshot(page, `${testName}-6.png`)
      const pgnButton = await getElement(page, 'PGN')
      await pgnButton.click()
      const content = await evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
      const moveText = content.substring(content.indexOf(']\n\n') + 3).trim()
      assert.strictEqual(0, moveText.indexOf('{Ding Liren is world class player who is typically seen as a solid but very strong player, however in this game he shows off an incredible imagination. His opponent is a fellow countrymen who made GM at just the age of sixteen.} 1. $43 d4'))
      await page.close()
      await page.browser.close()
    })

    it('should update after move coordinate', async () => {
      const testName = 'update-nag-after-move-coordinate'
      const page = await createBrowser()
      await page.goto('http://localhost:8080/player.html', { waitLoad: true, waitNetworkIdle: true })
      await page.waitForSelector('.timeline1')
      await saveScreenshot(page, `${testName}-1.png`)
      const annotationsButton = await getElement(page, 'Annotations')
      await annotationsButton.click()
      await page.waitForSelector('.move-sequence')
      await saveScreenshot(page, `${testName}-2.png`)
      await page.waitForSelector('.move-options-item')
      const firstEditButton = await getElement(page, '.move-options-item')
      await firstEditButton.click()
      await saveScreenshot(page, `${testName}-3.png`)
      await clickNthPosition(page, '.move-sequence', 7)
      await page.waitForSelector('.nag-button')
      await saveScreenshot(page, `${testName}-4.png`)
      const nagButton = await getElement(page, '.nag-button')
      nagButton.click()
      await page.waitForSelector('.nag-select')
      const nagSelect = await getElement(page, '.nag-select')
      await nagSelect.select('$75')
      await saveScreenshot(page, `${testName}-5.png`)
      await page.waitForSelector('.add-nag-button')
      const insertNag = await getElement(page, '.add-nag-button')
      insertNag.click()
      await wait(100)
      await saveScreenshot(page, `${testName}-6.png`)
      const pgnButton = await getElement(page, 'PGN')
      await pgnButton.click()
      const content = await evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
      const moveText = content.substring(content.indexOf(']\n\n') + 3).trim()
      assert.strictEqual(0, moveText.indexOf('{Ding Liren is world class player who is typically seen as a solid but very strong player, however in this game he shows off an incredible imagination. His opponent is a fellow countrymen who made GM at just the age of sixteen.} 1. d4 $75'))
      await page.close()
      await page.browser.close()
    })
  })

  describe('deleteNag', () => {
    it('should delete from end', () => {

    })

    it('should delete from start', () => {

    })

    it('should delete from middle', () => {

    })
  })

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
    return page
  }

  async function saveScreenshot (page, filename) {
    await page.screenshot({ 
      path: path.join(__dirname, '..', '..', filename),
      type: 'png'
    })
  }

  async function clickNthEditButton (page, identifier, nth) {
    return page.evaluate((identifier, nth) => {
      const list = document.querySelector(identifier)
      list.children[nth].onclick({
        target: list.children[nth]
      })
    }, identifier, nth)
  }

  async function clickNthPosition(page, identifier, nth) {
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
})
