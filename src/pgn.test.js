/* eslint-env mocha */
const assert = require('assert')
const parser = require('pgn-parser')
const puppeteer = require('../puppeteer.js')

describe('pgn', () => {
  describe('view', () => {
    it('should view PGN file', async () => {
      const testName = 'view-pgn'
      const page = await puppeteer.createBrowser()
      await puppeteer.saveScreenshot(page, `${testName}-1.png`)
      const pgnButton = await puppeteer.getElement(page, 'PGN')
      await pgnButton.click()
      await puppeteer.saveScreenshot(page, `${testName}-2.png`)
      const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
      assert.strictEqual(true, content.startsWith('[Event "F/S Return Match"]'))
      await puppeteer.close(page)
    })
  })

  describe('cancel pasting text', () => {
    it('should cancel pasting PGN text', async () => {
      const testName = 'cancel-pasting-pgn'
      const pastePGNText = `[Event "Wch27"]
[Site "Moscow"]
[Date "1969.??.??"]
[Round "17"]
[White "Spassky, Boris"]
[Black "Petrosian, Tigran V"]
[Result "1-0"]
[ECO "B42"]
[Annotator "JvR"]
[PlyCount "115"]
[EventDate "1969.??.??"]

\1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`
      const page = await puppeteer.createBrowser()
      await puppeteer.saveScreenshot(page, `${testName}-1.png`)
      const pgnButton = await puppeteer.getElement(page, 'PGN')
      await pgnButton.click()
      await puppeteer.saveScreenshot(page, `${testName}-2.png`)
      const pasteButton = await puppeteer.getElement(page, '.file-paste')
      await pasteButton.click()
      await puppeteer.saveScreenshot(page, `${testName}-3.png`)
      await page.evaluate((pastePGNText) => {
        document.querySelector('.paste-pgn').value = pastePGNText
      }, pastePGNText)
      await puppeteer.saveScreenshot(page, `${testName}-4.png`)
      const cancelButton = await puppeteer.getElement(page, '.file-cancel-paste')
      await cancelButton.click()
      await puppeteer.saveScreenshot(page, `${testName}-5.png`)
      const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
      assert.notStrictEqual(parser.cleanSpacing(content), parser.cleanSpacing(pastePGNText))
      await puppeteer.close(page)
    })
  })

  describe('load pasted text', () => {
    it('should load pasted PGN text', async () => {
      const testName = 'load-pasted-pgn'
      const pastePGNText = `[Event "Wch27"]
[Site "Moscow"]
[Date "1969.??.??"]
[Round "17"]
[White "Spassky, Boris"]
[Black "Petrosian, Tigran V"]
[Result "1-0"]
[ECO "B42"]
[Annotator "JvR"]
[PlyCount "115"]
[EventDate "1969.??.??"]

1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`
      const page = await puppeteer.createBrowser()
      await puppeteer.saveScreenshot(page, `${testName}-1.png`)
      const pgnButton = await puppeteer.getElement(page, 'PGN')
      await pgnButton.click()
      await puppeteer.saveScreenshot(page, `${testName}-2.png`)
      const pasteButton = await puppeteer.getElement(page, '.file-paste')
      await pasteButton.click()
      await puppeteer.saveScreenshot(page, `${testName}-3.png`)
      await page.evaluate((pastePGNText) => {
        document.querySelector('.paste-pgn').value = pastePGNText
      }, pastePGNText)
      await puppeteer.saveScreenshot(page, `${testName}-4.png`)
      const loadButton = await puppeteer.getElement(page, '.file-load-pasted-pgn')
      await loadButton.click()
      await puppeteer.saveScreenshot(page, `${testName}-5.png`)
      const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
      assert.strictEqual(parser.cleanSpacing(content), parser.cleanSpacing(pastePGNText))
      await puppeteer.close(page)
    })
  })
})
