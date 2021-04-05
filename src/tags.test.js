/* eslint-env mocha */
const assert = require('assert')
const puppeteer = require('../puppeteer.js')

describe('tags', () => {
  describe('view', () => {
    it('should view tags', async () => {
      const testName = 'view-tags'
      const page = await puppeteer.createBrowser()
      await puppeteer.saveScreenshot(page, `${testName}-1.png`)
      const tagsButton = await puppeteer.getElement(page, 'Tags')
      await tagsButton.click()
      await puppeteer.saveScreenshot(page, `${testName}-2.png`)
      const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
      assert.strictEqual(true, content.startsWith('[Event "F/S Return Match"]'))
      await puppeteer.close(page)
    })

    it('should add tag', async () => {
      const testName = 'add-tag'
      const page = await puppeteer.createBrowser()
      await puppeteer.saveScreenshot(page, `${testName}-1.png`)
      const tagsButton = await puppeteer.getElement(page, 'Tags')
      await tagsButton.click()
      await puppeteer.saveScreenshot(page, `${testName}-2.png`)
      await page.evaluate(() => {
        document.querySelector('.new-tag-name').value = 'Test'
        document.querySelector('.new-tag-value').value = 'Test value'
      })
      await puppeteer.saveScreenshot(page, `${testName}-3.png`)
      const addTagButton = await puppeteer.getElement(page, '.add-tag-button')
      await addTagButton.click()
      await puppeteer.saveScreenshot(page, `${testName}-4.png`)
      const pgnButton = await puppeteer.getElement(page, 'PGN')
      await pgnButton.click()
      await puppeteer.saveScreenshot(page, `${testName}-5.png`)
      const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
      assert.strictEqual(true, content.indexOf('[Test "Test value"]') > -1)
      await puppeteer.close(page)
    })
  })

  describe('update', () => {
    it('should update tag', async () => {
      const testName = 'update-tag'
      const page = await puppeteer.createBrowser()
      await puppeteer.saveScreenshot(page, `${testName}-1.png`)
      const tagsButton = await puppeteer.getElement(page, 'Tags')
      await tagsButton.click()
      await puppeteer.saveScreenshot(page, `${testName}-2.png`)
      await page.evaluate(() => {
        const table = document.querySelector('.tags-table')
        table.rows[1].cells[0].firstChild.value = 'Test'
        table.rows[1].cells[1].firstChild.value = 'Test value'
        regeneratePGNHeader()
      })
      await puppeteer.saveScreenshot(page, `${testName}-3.png`)
      const pgnButton = await puppeteer.getElement(page, 'PGN')
      await pgnButton.click()
      await puppeteer.saveScreenshot(page, `${testName}-4.png`)
      const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
      assert.strictEqual(true, content.indexOf('[Test "Test value"]') > -1)
      await puppeteer.close(page)
    })
  })

  describe('delete', () => {
    it('should delete tag', async () => {
      const testName = 'delete-tag'
      const page = await puppeteer.createBrowser()
      await puppeteer.saveScreenshot(page, `${testName}-1.png`)
      const tagsButton = await puppeteer.getElement(page, 'Tags')
      await tagsButton.click()
      await puppeteer.saveScreenshot(page, `${testName}-2.png`)
      await page.evaluate(() => {
        const table = document.querySelector('.tags-table')
        table.rows[1].cells[2].firstChild.click()
      })
      await puppeteer.saveScreenshot(page, `${testName}-3.png`)
      const addTagButton = await puppeteer.getElement(page, '.add-tag-button')
      await addTagButton.click()
      await puppeteer.saveScreenshot(page, `${testName}-4.png`)
      const pgnButton = await puppeteer.getElement(page, 'PGN')
      await pgnButton.click()
      await puppeteer.saveScreenshot(page, `${testName}-5.png`)
      const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
      assert.strictEqual(true, content.indexOf('[Result "1/2-1/2"]') === -1)
      await puppeteer.close(page)
    })
  })
})
