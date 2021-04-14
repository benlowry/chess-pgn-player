/* eslint-env mocha */
const assert = require('assert')
const annotations = require('./annotations.js')
const puppeteer = require('../puppeteer.js')

describe('annotations', () => {
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

  describe('nextTurnNumber', () => {
    it('should return 1', async () => {
      const turn = {
        moveNumber: '1',
        color: 'w'
      }
      const next = annotations.nextTurnNumber(turn)
      assert.strictEqual(next, 1)
    })

    it('should return 2', async () => {
      const turn = {
        moveNumber: '1',
        color: 'b'
      }
      const next = annotations.nextTurnNumber(turn)
      assert.strictEqual(next, 2)
    })
  })

  describe('proliferateChanges', () => {
    it('should update turn sequence', async () => {
      const turn = {
        turnNumber: '1',
        color: 'w',
        sequence: ['1.', 'a1', '$1']
      }
      const newSequence = ['{annotation}', '1.', 'a1', '$1']
      annotations.proliferateChanges(turn, newSequence)
      for (const i in newSequence) {
        assert.strictEqual(turn.sequence[i], newSequence[i])
      }
    })

    it('should update parent turn sequence', async () => {
      const parent = {
        turnNumber: '1',
        color: 'w',
        sequence: ['1.', 'e4', '(1.a1 $1)']
      }
      const turn = {
        turnNumber: '1',
        color: 'w',
        sequence: ['1.', 'a1', '$1'],
        parentTurn: parent
      }
      const newSequence = ['{annotation}', '1.', 'a1', '$1']
      annotations.proliferateChanges(turn, newSequence)
      for (const i in newSequence) {
        assert.strictEqual(turn.sequence[i], newSequence[i])
      }
    })

    it('should update grandparent turn sequence', async () => {
      const grandParent = {
        turnNumber: '1',
        color: 'w',
        sequence: ['1.', 'e2', '(1.f2 (1.a1 $1))']
      }
      const parent = {
        turnNumber: '1',
        color: 'w',
        sequence: ['1.', 'f2', '(1.a1 $1)'],
        parentTurn: grandParent
      }
      const turn = {
        turnNumber: '1',
        color: 'w',
        sequence: ['1.', 'a1', '$1'],
        parentTurn: parent
      }
      const newSequence = ['{annotation}', '1.', 'a1', '$1']
      annotations.proliferateChanges(turn, newSequence)
      // check turn
      for (const i in newSequence) {
        assert.strictEqual(turn.sequence[i], newSequence[i])
      }
      // check parent
      const parentSequence = ['1.', 'f2', '({annotation} 1.a1 $1)']
      for (const i in parentSequence) {
        assert.strictEqual(parent.sequence[i], parentSequence[i])
      }
      // check grandparent
      const grandParentSequence = ['1.', 'e2', '(1.f2 ({annotation} 1.a1 $1))']
      for (const i in grandParentSequence) {
        assert.strictEqual(grandParent.sequence[i], grandParentSequence[i])
      }
    })
  })

  describe('text annotations', () => {
    it('should insert into any position', async () => {
      const testName = 'insert-annotation-text'
      const positions = ['-', ' ', '1.', ' ', 'e4', ' ']
      const expected = [
        '{annotation text} 1.e4',
        '1. {annotation text} e4',
        '1.e4 {annotation text}'
      ]
      let resultIndex = 0
      for (const i in positions) {
        if (positions[i] !== ' ') {
          continue
        }
        const page = await puppeteer.createBrowser(`[Event "Wch27"]

1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-1.png`)
        const annotationsButton = await puppeteer.getElement(page, 'Annotations')
        await annotationsButton.click()
        await page.waitForSelector('.turn-components')
        await page.waitForSelector('.turn-option-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-2.png`)
        await puppeteer.clickNthEditButton(page, '.turn-list', 0)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-3.png`)
        await puppeteer.clickNthPosition(page, '.turn-components', i)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-4.png`)
        await page.waitForSelector('.annotation-button')
        const annotationButton = await puppeteer.getElement(page, '.annotation-button')
        await annotationButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-5.png`)
        await puppeteer.clickNthPosition(page, '.annotation-components', 1)
        await page.waitForSelector('.add-text-button')
        const addTextButton = await puppeteer.getElement(page, '.add-text-button')
        await addTextButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-6.png`)
        await page.waitForSelector('.annotation-text')
        const annotationText = await puppeteer.getElement(page, '.annotation-text')
        await annotationText.type('annotation text')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-7.png`)
        const insertTextButton = await puppeteer.getElement(page, '.insert-text-button')
        await insertTextButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-8.png`)
        await page.waitForSelector('.insert-annotation-button')
        const insertAnnotationButton = await puppeteer.getElement(page, '.insert-annotation-button')
        await insertAnnotationButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-9.png`)
        const pgnButton = await puppeteer.getElement(page, 'PGN')
        await pgnButton.click()
        await page.waitForSelector('.pgn')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-10.png`)
        const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
        const moves = content.substring(content.indexOf(']\n\n') + 3)
        assert.strictEqual(true, moves.startsWith(expected[resultIndex]))
        await page.close()
        await page.browser.close()
        resultIndex++
      }
    })

    it('should update in any position', async () => {
      const testName = 'update-annotation-text'
      const positions = ['-', ' ', '{preturn}', ' ', '1.', ' ', '{premove}', ' ', 'e4', ' ', '{postmove}']
      const expected = [
        '{updated} 1. {premove} e4 {postmove}',
        '{preturn} 1. {updated} e4 {postmove}',
        '{preturn} 1. {premove} e4 {updated}'
      ]
      let resultIndex = 0
      for (const i in positions) {
        if (positions[i][0] !== '{') {
          continue
        }
        const page = await puppeteer.createBrowser(`[Event "Wch27"]

{preturn} 1. {premove} e4 {postmove} c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-1.png`)
        const annotationsButton = await puppeteer.getElement(page, 'Annotations')
        await annotationsButton.click()
        await page.waitForSelector('.turn-option-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-2.png`)
        await puppeteer.clickNthEditButton(page, '.turn-list', 0)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-3.png`)
        await page.waitForSelector('.turn-components')
        await puppeteer.clickNthPosition(page, '.turn-components', i)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-4.png`)
        await page.waitForSelector('.annotation-components')
        await puppeteer.clickNthPosition(page, '.annotation-components', 2)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-5.png`)
        await page.waitForSelector('.annotation-text')
        const annotationText = await puppeteer.getElement(page, '.annotation-text')
        await page.evaluate(() => {
          document.querySelector('.annotation-text').value = ''
        })
        await annotationText.type('updated')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-6.png`)
        const updateTextButton = await puppeteer.getElement(page, '.update-text-button')
        await updateTextButton.click()
        await page.waitForSelector('.update-annotation-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-7.png`)
        const updateAnnotationButton = await puppeteer.getElement(page, '.update-annotation-button')
        await updateAnnotationButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-8.png`)
        const pgnButton = await puppeteer.getElement(page, 'PGN')
        await pgnButton.click()
        await page.waitForSelector('.pgn')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-9.png`)
        const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
        const moves = content.substring(content.indexOf(']\n\n') + 3)
        assert.strictEqual(true, moves.startsWith(expected[resultIndex]))
        await page.close()
        await page.browser.close()
        resultIndex++
      }
    })

    it('should delete from any position', async () => {
      const testName = 'delete-annotation-text'
      const positions = ['-', ' ', '{preturn}', ' ', '1.', ' ', '{premove}', ' ', 'e4', ' ', '{postmove}', ' ']
      const expected = [
        '1. {premove} e4 {postmove}',
        '{preturn} 1.e4 {postmove}',
        '{preturn} 1. {premove} e4'
      ]
      let resultIndex = 0
      for (const i in positions) {
        if (positions[i][0] !== '{') {
          continue
        }
        const page = await puppeteer.createBrowser(`[Event "Wch27"]

{preturn} 1. {premove} e4 {postmove} c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-1.png`)
        const annotationsButton = await puppeteer.getElement(page, 'Annotations')
        await annotationsButton.click()
        await page.waitForSelector('.turn-components')
        await page.waitForSelector('.turn-option-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-2.png`)
        await puppeteer.clickNthEditButton(page, '.turn-list', 0)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-3.png`)
        await puppeteer.clickNthPosition(page, '.turn-components', i)
        await page.waitForSelector('.annotation-components')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-4.png`)
        await puppeteer.clickNthPosition(page, '.annotation-components', 2)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-5.png`)
        await page.waitForSelector('.delete-text-button')
        const deleteText = await puppeteer.getElement(page, '.delete-text-button')
        await deleteText.click()
        await puppeteer.wait(100)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-6.png`)
        const pgnButton = await puppeteer.getElement(page, 'PGN')
        await pgnButton.click()
        await page.waitForSelector('.pgn')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-7.png`)
        const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
        const moves = content.substring(content.indexOf(']\n\n') + 1).trim()
        assert.strictEqual(true, moves.startsWith(expected[resultIndex]))
        await page.close()
        await page.browser.close()
        resultIndex++
      }
    })
  })

  describe('highlighted square annotations', () => {
    it('should insert into any position using chessboard', async () => {
      const testName = 'insert-highlight-square-using-chessboard'
      const positions = ['-', ' ', '1.', ' ', 'e4', ' ']
      const coordinates = [
        'c5',
        'f6',
        'd4'
      ]
      const expected = [
        '{[%csl Rc5]} 1.e4',
        '1. {[%csl Rf6]} e4',
        '1.e4 {[%csl Rd4]}'
      ]
      let resultIndex = 0
      for (const i in positions) {
        if (positions[i] !== ' ') {
          continue
        }
        const page = await puppeteer.createBrowser(`[Event "Wch27"]

1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-1.png`)
        const annotationsButton = await puppeteer.getElement(page, 'Annotations')
        await annotationsButton.click()
        await page.waitForSelector('.turn-components')
        await page.waitForSelector('.turn-option-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-2.png`)
        await puppeteer.clickNthEditButton(page, '.turn-list', 0)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-3.png`)
        await puppeteer.clickNthPosition(page, '.turn-components', i)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-4.png`)
        await page.waitForSelector('.annotation-button')
        const annotationButton = await puppeteer.getElement(page, '.annotation-button')
        await annotationButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-5.png`)
        await puppeteer.clickNthPosition(page, '.annotation-components', 1)
        await page.waitForSelector('.add-text-button')
        const addSquareButton = await puppeteer.getElement(page, '.add-square-button')
        await addSquareButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-6.png`)
        await page.waitForSelector(`.coordinate-${coordinates[resultIndex]}`)
        await page.evaluate(async (coordinate) => {
          const cell = document.querySelector(`.coordinate-${coordinate}`)
          const table = document.querySelector('.annotate-square-chessboard')
          table.onclick({
            target: cell,
            preventDefault: () => { }
          })
        }, coordinates[resultIndex])
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-7.png`)
        const insertSquaresTextButton = await puppeteer.getElement(page, '.insert-squares-text-button')
        await insertSquaresTextButton.click()
        await page.waitForSelector('.insert-annotation-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-8.png`)
        const insertAnnotationButton = await puppeteer.getElement(page, '.insert-annotation-button')
        await insertAnnotationButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-9.png`)
        const pgnButton = await puppeteer.getElement(page, 'PGN')
        await pgnButton.click()
        await page.waitForSelector('.pgn')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-10.png`)
        const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
        const moves = content.substring(content.indexOf(']\n\n') + 3)
        assert.strictEqual(true, moves.startsWith(expected[resultIndex]))
        await page.close()
        await page.browser.close()
        resultIndex++
      }
    })

    it('should insert into any position using form', async () => {
      const testName = 'insert-highlight-square-using-form'
      const positions = ['-', ' ', '1.', ' ', 'e4', ' ']
      const coordinates = [
        'c5',
        'f6',
        'd4'
      ]
      const expected = [
        '{[%csl Rc5]} 1.e4',
        '1. {[%csl Rf6]} e4',
        '1.e4 {[%csl Rd4]}'
      ]
      let resultIndex = 0
      for (const i in positions) {
        if (positions[i] !== ' ') {
          continue
        }
        const page = await puppeteer.createBrowser(`[Event "Wch27"]

1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-1.png`)
        const annotationsButton = await puppeteer.getElement(page, 'Annotations')
        await annotationsButton.click()
        await page.waitForSelector('.turn-components')
        await page.waitForSelector('.turn-option-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-2.png`)
        await puppeteer.clickNthEditButton(page, '.turn-list', 0)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-3.png`)
        await puppeteer.clickNthPosition(page, '.turn-components', i)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-4.png`)
        await page.waitForSelector('.annotation-button')
        const annotationButton = await puppeteer.getElement(page, '.annotation-button')
        await annotationButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-5.png`)
        await puppeteer.clickNthPosition(page, '.annotation-components', 1)
        await page.waitForSelector('.add-text-button')
        const addSquareButton = await puppeteer.getElement(page, '.add-square-button')
        await addSquareButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-6.png`)
        await page.waitForSelector(`.coordinate-${coordinates[resultIndex]}`)
        const columnSelect = await puppeteer.getElement(page, '.select-column')
        await columnSelect.type(coordinates[resultIndex][0])
        const rowSelect = await puppeteer.getElement(page, '.select-row')
        await rowSelect.type(coordinates[resultIndex][1])
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-7.png`)
        const highlightButton = await puppeteer.getElement(page, '.highlight-square-button')
        await highlightButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-8.png`)
        const insertSquaresTextButton = await puppeteer.getElement(page, '.insert-squares-text-button')
        await insertSquaresTextButton.click()
        await page.waitForSelector('.insert-annotation-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-9.png`)
        const insertAnnotationButton = await puppeteer.getElement(page, '.insert-annotation-button')
        await insertAnnotationButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-10.png`)
        const pgnButton = await puppeteer.getElement(page, 'PGN')
        await pgnButton.click()
        await page.waitForSelector('.pgn')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-11.png`)
        const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
        const moves = content.substring(content.indexOf(']\n\n') + 3)
        assert.strictEqual(true, moves.startsWith(expected[resultIndex]))
        await page.close()
        await page.browser.close()
        resultIndex++
      }
    })

    it('should update in any position', async () => {
      const testName = 'update-highlight-square-text'
      const positions = ['-', ' ', '{[%csl Ra1]}', ' ', '1.', ' ', '{[%csl Bc5,Bd5,Be5]}', ' ', 'e4', ' ', '{[%csl Ga1,Gb2,Gc3,Gd4]}']
      const expected = [
        '{[%csl Yf5]} 1. {[%csl Bc5,Bd5,Be5]} e4 {[%csl Ga1,Gb2,Gc3,Gd4]}',
        '{[%csl Ra1]} 1. {[%csl Bc5,Bd5,Yf5]} e4 {[%csl Ga1,Gb2,Gc3,Gd4]}',
        // note: the order changes here on the third section
        '{[%csl Ra1]} 1. {[%csl Bc5,Bd5,Be5]} e4 {[%csl Gc3,Gb2,Ga1,Yf5]}'
      ]
      let resultIndex = 0
      for (const i in positions) {
        if (positions[i][0] !== '{') {
          continue
        }
        const page = await puppeteer.createBrowser(`[Event "Wch27"]

{[%csl Ra1]} 1. {[%csl Bc5,Bd5,Be5]} e4 {[%csl Ga1,Gb2,Gc3,Gd4]} c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-1.png`)
        const annotationsButton = await puppeteer.getElement(page, 'Annotations')
        await annotationsButton.click()
        await page.waitForSelector('.turn-option-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-2.png`)
        await puppeteer.clickNthEditButton(page, '.turn-list', 0)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-3.png`)
        await page.waitForSelector('.turn-components')
        await puppeteer.clickNthPosition(page, '.turn-components', i)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-4.png`)
        await page.waitForSelector('.annotation-components')
        await puppeteer.clickNthPosition(page, '.annotation-components', 2)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-5.png`)
        await page.evaluate(() => {
          const pendingList = document.querySelector('.pending-list')
          const buttons = pendingList.querySelectorAll('.annotation-form-button')
          buttons[buttons.length - 1].onclick({
            target: buttons[buttons.length - 1]
          })
        })
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-6.png`)
        const yellowButton = await puppeteer.getElement(page, '.yellow-square-button')
        await yellowButton.click()
        await page.evaluate(async (coordinate) => {
          const cell = document.querySelector(`.coordinate-${coordinate}`)
          const table = document.querySelector('.annotate-square-chessboard')
          table.onclick({
            target: cell,
            preventDefault: () => { }
          })
        }, 'f5')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-7.png`)
        const updateSquareTextButton = await puppeteer.getElement(page, '.update-squares-text-button')
        await updateSquareTextButton.click()
        await page.waitForSelector('.update-annotation-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-8.png`)
        const updateAnnotationButton = await puppeteer.getElement(page, '.update-annotation-button')
        await updateAnnotationButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-9.png`)
        const pgnButton = await puppeteer.getElement(page, 'PGN')
        await pgnButton.click()
        await page.waitForSelector('.pgn')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-10.png`)
        const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
        const moves = content.substring(content.indexOf(']\n\n') + 3)
        assert.strictEqual(true, moves.startsWith(expected[resultIndex]))
        await page.close()
        await page.browser.close()
        resultIndex++
      }
    })

    it('should delete from any position', async () => {
      const testName = 'delete-highlight-square-text'
      const positions = ['-', ' ', '{[%csl Ra1]}', ' ', '1.', ' ', '{[%csl Bc5,Bd5,Be5]}', ' ', 'e4', ' ', '{[%csl Ga1,Gb2,Gc3,Gd4]}']
      const expected = [
        '1. {[%csl Bc5,Bd5,Be5]} e4 {[%csl Ga1,Gb2,Gc3,Gd4]}',
        '{[%csl Ra1]} 1. {[%csl Bc5,Bd5]} e4 {[%csl Ga1,Gb2,Gc3,Gd4]}',
        // note: the order changes here on the third section
        '{[%csl Ra1]} 1. {[%csl Bc5,Bd5,Be5]} e4 {[%csl Gc3,Gb2,Ga1]}'
      ]
      let resultIndex = 0
      for (const i in positions) {
        if (positions[i][0] !== '{') {
          continue
        }
        const page = await puppeteer.createBrowser(`[Event "Wch27"]

{[%csl Ra1]} 1. {[%csl Bc5,Bd5,Be5]} e4 {[%csl Ga1,Gb2,Gc3,Gd4]} c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-1.png`)
        const annotationsButton = await puppeteer.getElement(page, 'Annotations')
        await annotationsButton.click()
        await page.waitForSelector('.turn-option-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-2.png`)
        await puppeteer.clickNthEditButton(page, '.turn-list', 0)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-3.png`)
        await page.waitForSelector('.turn-components')
        await puppeteer.clickNthPosition(page, '.turn-components', i)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-4.png`)
        await page.waitForSelector('.annotation-components')
        await puppeteer.clickNthPosition(page, '.annotation-components', 2)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-5.png`)
        await page.evaluate(() => {
          const pendingList = document.querySelector('.pending-list')
          const buttons = pendingList.querySelectorAll('.annotation-form-button')
          buttons[buttons.length - 1].onclick({
            target: buttons[buttons.length - 1]
          })
        })
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-6.png`)
        const updateSquareTextButton = await puppeteer.getElement(page, '.update-squares-text-button')
        await updateSquareTextButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-7.png`)
        const updateAnnotationButton = await puppeteer.getElement(page, '.update-annotation-button')
        if (updateAnnotationButton) {
          await updateAnnotationButton.click()
          await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-8.png`)
          const pgnButton = await puppeteer.getElement(page, 'PGN')
          await pgnButton.click()
          await page.waitForSelector('.pgn')
          await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-9.png`)
        } else {
          const pgnButton = await puppeteer.getElement(page, 'PGN')
          await pgnButton.click()
          await page.waitForSelector('.pgn')
          await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-8.png`)
        }
        const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
        const moves = content.substring(content.indexOf(']\n\n') + 3)
        assert.strictEqual(true, moves.startsWith(expected[resultIndex]))
        await page.close()
        await page.browser.close()
        resultIndex++
      }
    })
  })

  describe('highlighted arrow annotations', () => {
    it('should insert into any position using chessboard', async () => {
      const testName = 'insert-highlight-arrow-using-chessboard'
      const positions = ['-', ' ', '1.', ' ', 'e4', ' ']
      const coordinates = [
        { from: 'c5', to: 'h7' },
        { from: 'f6', to: 'a3' },
        { from: 'd4', to: 'f8' }
      ]
      const expected = [
        '{[%cal Rc5h7]} 1.e4',
        '1. {[%cal Rf6a3]} e4',
        '1.e4 {[%cal Rd4f8]}'
      ]
      let resultIndex = 0
      for (const i in positions) {
        if (positions[i] !== ' ') {
          continue
        }
        const page = await puppeteer.createBrowser(`[Event "Wch27"]

1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-1.png`)
        const annotationsButton = await puppeteer.getElement(page, 'Annotations')
        await annotationsButton.click()
        await page.waitForSelector('.turn-components')
        await page.waitForSelector('.turn-option-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-2.png`)
        await puppeteer.clickNthEditButton(page, '.turn-list', 0)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-3.png`)
        await puppeteer.clickNthPosition(page, '.turn-components', i)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-4.png`)
        await page.waitForSelector('.annotation-button')
        const annotationButton = await puppeteer.getElement(page, '.annotation-button')
        await annotationButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-5.png`)
        await puppeteer.clickNthPosition(page, '.annotation-components', 1)
        await page.waitForSelector('.add-text-button')
        const addArrowButton = await puppeteer.getElement(page, '.add-arrow-button')
        await addArrowButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-6.png`)
        await page.waitForSelector(`.coordinate-${coordinates[resultIndex].from}`)
        await page.evaluate(async (from, to) => {
          document.onmousedown({
            target: document.querySelector(`.coordinate-${from}`),
            preventDefault: () => { }
          })
          document.onmouseup({
            target: document.querySelector(`.coordinate-${to}`),
            preventDefault: () => { }
          })
        }, coordinates[resultIndex].from, coordinates[resultIndex].to)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-7.png`)
        const insertArrowsTextButton = await puppeteer.getElement(page, '.insert-arrows-text-button')
        await insertArrowsTextButton.click()
        await page.waitForSelector('.insert-annotation-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-8.png`)
        const insertAnnotationButton = await puppeteer.getElement(page, '.insert-annotation-button')
        await insertAnnotationButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-9.png`)
        const pgnButton = await puppeteer.getElement(page, 'PGN')
        await pgnButton.click()
        await page.waitForSelector('.pgn')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-10.png`)
        const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
        const moves = content.substring(content.indexOf(']\n\n') + 3)
        assert.strictEqual(true, moves.startsWith(expected[resultIndex]))
        await page.close()
        await page.browser.close()
        resultIndex++
      }
    })

    it('should insert into any position using form', async () => {
      const testName = 'insert-highlight-arrows-using-form'
      const positions = ['-', ' ', '1.', ' ', 'e4', ' ']
      const coordinates = [
        { from: 'c5', to: 'h7' },
        { from: 'f6', to: 'a3' },
        { from: 'd4', to: 'f8' }
      ]
      const expected = [
        '{[%cal Rc5h7]} 1.e4',
        '1. {[%cal Rf6a3]} e4',
        '1.e4 {[%cal Rd4f8]}'
      ]
      let resultIndex = 0
      for (const i in positions) {
        if (positions[i] !== ' ') {
          continue
        }
        const page = await puppeteer.createBrowser(`[Event "Wch27"]

1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-1.png`)
        const annotationsButton = await puppeteer.getElement(page, 'Annotations')
        await annotationsButton.click()
        await page.waitForSelector('.turn-components')
        await page.waitForSelector('.turn-option-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-2.png`)
        await puppeteer.clickNthEditButton(page, '.turn-list', 0)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-3.png`)
        await puppeteer.clickNthPosition(page, '.turn-components', i)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-4.png`)
        await page.waitForSelector('.annotation-button')
        const annotationButton = await puppeteer.getElement(page, '.annotation-button')
        await annotationButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-5.png`)
        await puppeteer.clickNthPosition(page, '.annotation-components', 1)
        await page.waitForSelector('.add-text-button')
        const addArrowButton = await puppeteer.getElement(page, '.add-arrow-button')
        await addArrowButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-6.png`)
        await page.waitForSelector(`.coordinate-${coordinates[resultIndex].from}`)
        const columnSelect1 = await puppeteer.getElement(page, '.select-column-start')
        await columnSelect1.type(coordinates[resultIndex].from[0])
        const rowSelect1 = await puppeteer.getElement(page, '.select-row-start')
        await rowSelect1.type(coordinates[resultIndex].from[1])
        const columnSelect2 = await puppeteer.getElement(page, '.select-column-end')
        await columnSelect2.type(coordinates[resultIndex].to[0])
        const rowSelect2 = await puppeteer.getElement(page, '.select-row-end')
        await rowSelect2.type(coordinates[resultIndex].to[1])
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-7.png`)
        const highlightButton = await puppeteer.getElement(page, '.highlight-arrow-button')
        await highlightButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-8.png`)
        const insertArrowsTextButton = await puppeteer.getElement(page, '.insert-arrows-text-button')
        await insertArrowsTextButton.click()
        await page.waitForSelector('.insert-annotation-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-9.png`)
        const insertAnnotationButton = await puppeteer.getElement(page, '.insert-annotation-button')
        await insertAnnotationButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-10.png`)
        const pgnButton = await puppeteer.getElement(page, 'PGN')
        await pgnButton.click()
        await page.waitForSelector('.pgn')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-11.png`)
        const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
        const moves = content.substring(content.indexOf(']\n\n') + 3)
        assert.strictEqual(true, moves.startsWith(expected[resultIndex]))
        await page.close()
        await page.browser.close()
        resultIndex++
      }
    })

    it('should update in any position', async () => {
      const testName = 'update-highlight-arrow-text'
      const positions = ['-', ' ', '{[%cal Ra1f7]}', ' ', '1.', ' ', '{[%cal Bc5d8,Ga1a8]}', ' ', 'e4', ' ', '{[%cal Ga3b5,Rf8g2,Ba1a8]}']
      const expected = [
        '{[%cal Yf5f8]} 1. {[%cal Bc5d8,Ga1a8]} e4 {[%cal Ga3b5,Rf8g2,Ba1a8]}',
        '{[%cal Ra1f7]} 1. {[%cal Bc5d8,Yf5f8]} e4 {[%cal Ga3b5,Rf8g2,Ba1a8]}',
        // note: the order changes here on the third section
        '{[%cal Ra1f7]} 1. {[%cal Bc5d8,Ga1a8]} e4 {[%cal Rf8g2,Ga3b5,Yf5f8]}'
      ]
      let resultIndex = 0
      for (const i in positions) {
        if (positions[i][0] !== '{') {
          continue
        }
        const page = await puppeteer.createBrowser(`[Event "Wch27"]

{[%cal Ra1f7]} 1. {[%cal Bc5d8,Ga1a8]} e4 {[%cal Ga3b5,Rf8g2,Ba1a8]} c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-1.png`)
        const annotationsButton = await puppeteer.getElement(page, 'Annotations')
        await annotationsButton.click()
        await page.waitForSelector('.turn-option-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-2.png`)
        await puppeteer.clickNthEditButton(page, '.turn-list', 0)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-3.png`)
        await page.waitForSelector('.turn-components')
        await puppeteer.clickNthPosition(page, '.turn-components', i)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-4.png`)
        await page.waitForSelector('.annotation-components')
        await puppeteer.clickNthPosition(page, '.annotation-components', 2)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-5.png`)
        await page.evaluate(() => {
          const pendingList = document.querySelector('.pending-list')
          const buttons = pendingList.querySelectorAll('.annotation-form-button')
          buttons[buttons.length - 1].onclick({
            target: buttons[buttons.length - 1]
          })
        })
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-6.png`)
        const yellowButton = await puppeteer.getElement(page, '.yellow-arrow-button')
        await yellowButton.click()
        await page.evaluate(async () => {
          document.onmousedown({
            target: document.querySelector('.coordinate-f5'),
            preventDefault: () => { }
          })
          document.onmouseup({
            target: document.querySelector('.coordinate-f8'),
            preventDefault: () => { }
          })
        })
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-7.png`)
        const updateArrowsTextButton = await puppeteer.getElement(page, '.update-arrows-text-button')
        await updateArrowsTextButton.click()
        await page.waitForSelector('.update-annotation-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-8.png`)
        const updateAnnotationButton = await puppeteer.getElement(page, '.update-annotation-button')
        await updateAnnotationButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-9.png`)
        const pgnButton = await puppeteer.getElement(page, 'PGN')
        await pgnButton.click()
        await page.waitForSelector('.pgn')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-10.png`)
        const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
        const moves = content.substring(content.indexOf(']\n\n') + 3)
        assert.strictEqual(true, moves.startsWith(expected[resultIndex]))
        await page.close()
        await page.browser.close()
        resultIndex++
      }
    })

    it('should delete from any position', async () => {
      const testName = 'delete-highlight-arrow-text'
      const positions = ['-', ' ', '{[%cal Ra1a8]}', ' ', '1.', ' ', '{[%cal Bc5g5,Yd5d1,Re5f7]}', ' ', 'e4', ' ', '{[%cal Ra1a3,Bb2d2,Yc3f7,Gd4d8]}']
      const expected = [
        '1. {[%cal Bc5g5,Yd5d1,Re5f7]} e4 {[%cal Ra1a3,Bb2d2,Yc3f7,Gd4d8]}',
        '{[%cal Ra1a8]} 1. {[%cal Bc5g5,Yd5d1]} e4 {[%cal Ra1a3,Bb2d2,Yc3f7,Gd4d8]}',
        // note: the order changes here on the third section
        '{[%cal Ra1a8]} 1. {[%cal Bc5g5,Yd5d1,Re5f7]} e4 {[%cal Ra1a3,Bb2d2,Yc3f7]}'
      ]
      let resultIndex = 0
      for (const i in positions) {
        if (positions[i][0] !== '{') {
          continue
        }
        const page = await puppeteer.createBrowser(`[Event "Wch27"]

{[%cal Ra1a8]} 1. {[%cal Bc5g5,Yd5d1,Re5f7]} e4 {[%cal Ra1a3,Bb2d2,Yc3f7,Gd4d8]} c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-1.png`)
        const annotationsButton = await puppeteer.getElement(page, 'Annotations')
        await annotationsButton.click()
        await page.waitForSelector('.turn-option-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-2.png`)
        await puppeteer.clickNthEditButton(page, '.turn-list', 0)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-3.png`)
        await page.waitForSelector('.turn-components')
        await puppeteer.clickNthPosition(page, '.turn-components', i)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-4.png`)
        await page.waitForSelector('.annotation-components')
        await puppeteer.clickNthPosition(page, '.annotation-components', 2)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-5.png`)
        await page.evaluate(() => {
          const pendingList = document.querySelector('.pending-list')
          const buttons = pendingList.querySelectorAll('.annotation-form-button')
          buttons[buttons.length - 1].onclick({
            target: buttons[buttons.length - 1]
          })
        })
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-6.png`)
        const updateArrowsTextButton = await puppeteer.getElement(page, '.update-arrows-text-button')
        await updateArrowsTextButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-7.png`)
        const updateAnnotationButton = await puppeteer.getElement(page, '.update-annotation-button')
        if (updateAnnotationButton) {
          await updateAnnotationButton.click()
          await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-8.png`)
          const pgnButton = await puppeteer.getElement(page, 'PGN')
          await pgnButton.click()
          await page.waitForSelector('.pgn')
          await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-9.png`)
        } else {
          const pgnButton = await puppeteer.getElement(page, 'PGN')
          await pgnButton.click()
          await page.waitForSelector('.pgn')
          await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-8.png`)
        }
        const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
        const moves = content.substring(content.indexOf(']\n\n') + 3)
        assert.strictEqual(true, moves.startsWith(expected[resultIndex]))
        await page.close()
        await page.browser.close()
        resultIndex++
      }
    })
  })

  describe('nags', () => {
    it('should insert into any position', async () => {
      const testName = 'insert-nag'
      const positions = ['-', ' ', '1.', ' ', 'e4', ' ']
      const expected = [
        '$14 1.e4',
        '1.$15 e4',
        '1.e4 $16'
      ]
      let resultIndex = 0
      for (const i in positions) {
        if (positions[i] !== ' ') {
          continue
        }
        const page = await puppeteer.createBrowser(`[Event "Wch27"]

1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-1.png`)
        const annotationsButton = await puppeteer.getElement(page, 'Annotations')
        await annotationsButton.click()
        await page.waitForSelector('.turn-components')
        await page.waitForSelector('.turn-option-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-2.png`)
        await puppeteer.clickNthEditButton(page, '.turn-list', 0)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-3.png`)
        await puppeteer.clickNthPosition(page, '.turn-components', i)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-4.png`)
        await page.waitForSelector('.nag-button')
        const nagButton = await puppeteer.getElement(page, '.nag-button')
        nagButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-5.png`)
        await page.waitForSelector('.nag-select')
        const nagSelect = await puppeteer.getElement(page, '.nag-select')
        await nagSelect.select('$' + (14 + resultIndex))
        await page.waitForSelector('.add-nag-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-6.png`)
        const insertNag = await puppeteer.getElement(page, '.add-nag-button')
        insertNag.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-7.png`)
        const pgnButton = await puppeteer.getElement(page, 'PGN')
        await pgnButton.click()
        await page.waitForSelector('.pgn')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-8.png`)
        const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
        const moves = content.substring(content.indexOf(']\n\n') + 3)
        assert.strictEqual(true, moves.startsWith(expected[resultIndex]))
        await page.close()
        await page.browser.close()
        resultIndex++
      }
    })

    it('should update in any position', async () => {
      const testName = 'update-nag'
      const positions = ['-', ' ', '$0', ' ', '1.', ' ', '$1', ' ', 'e4', ' ', '$2', ' ']
      const expected = [
        '$27 1.$1 e4',
        '$0 1.$28 e4',
        '$0 1.$1 e4 $29'
      ]
      let resultIndex = 0
      for (const i in positions) {
        if (positions[i][0] !== '$') {
          continue
        }
        const page = await puppeteer.createBrowser(`[Event "Wch27"]

$0 1.$1 e4 $2 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-1.png`)
        const annotationsButton = await puppeteer.getElement(page, 'Annotations')
        await annotationsButton.click()
        await page.waitForSelector('.turn-components')
        await page.waitForSelector('.turn-option-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-2.png`)
        await puppeteer.clickNthEditButton(page, '.turn-list', 0)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-3.png`)
        await puppeteer.clickNthPosition(page, '.turn-components', i)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-4.png`)
        await page.waitForSelector('.nag-select')
        const nagSelect = await puppeteer.getElement(page, '.nag-select')
        await nagSelect.select('$' + (27 + resultIndex))
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-5.png`)
        await page.waitForSelector('.update-nag-button')
        const updateNag = await puppeteer.getElement(page, '.update-nag-button')
        await updateNag.click()
        await puppeteer.wait(100)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-6.png`)
        const pgnButton = await puppeteer.getElement(page, 'PGN')
        await pgnButton.click()
        await page.waitForSelector('.pgn')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-7.png`)
        const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
        const moves = content.substring(content.indexOf(']\n\n') + 1).trim()
        assert.strictEqual(true, moves.startsWith(expected[resultIndex]))
        await page.close()
        await page.browser.close()
        resultIndex++
      }
    })

    it('should delete from any position', async () => {
      const testName = 'delete-nag'
      const positions = ['-', ' ', '$0', ' ', '1.', ' ', '$1', ' ', 'e4', ' ', '$2', ' ']
      const expected = [
        '1.$1 e4',
        '$0 1.e4',
        '$0 1.$1 e4'
      ]
      let resultIndex = 0
      for (const i in positions) {
        if (positions[i][0] !== '$') {
          continue
        }
        const page = await puppeteer.createBrowser(`[Event "Wch27"]

$0 1.$1 e4 $2 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-1.png`)
        const annotationsButton = await puppeteer.getElement(page, 'Annotations')
        await annotationsButton.click()
        await page.waitForSelector('.turn-components')
        await page.waitForSelector('.turn-option-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-2.png`)
        await puppeteer.clickNthEditButton(page, '.turn-list', 0)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-3.png`)
        await puppeteer.clickNthPosition(page, '.turn-components', i)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-4.png`)
        await page.waitForSelector('.delete-nag-button')
        const deleteNag = await puppeteer.getElement(page, '.delete-nag-button')
        await deleteNag.click()
        await puppeteer.wait(100)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-5.png`)
        const pgnButton = await puppeteer.getElement(page, 'PGN')
        await pgnButton.click()
        await page.waitForSelector('.pgn')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-6.png`)
        const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
        const moves = content.substring(content.indexOf(']\n\n') + 1).trim()
        assert.strictEqual(true, moves.startsWith(expected[resultIndex]))
        await page.close()
        await page.browser.close()
        resultIndex++
      }
    })
  })

  describe('alternative-moves', () => {
    it('should insert into any position', async () => {
      const testName = 'insert-alternative-moves'
      const positions = ['-', ' ', '1.', ' ', 'e4', ' ']
      const expected = [
        '(1.Pdd4) 1.e4',
        '1.(1.Pdd4) e4',
        '1.e4 (1.Pdd4)'
      ]
      let resultIndex = 0
      for (const i in positions) {
        if (positions[i] !== ' ') {
          continue
        }
        const page = await puppeteer.createBrowser(`[Event "Wch27"]

1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-1.png`)
        const annotationsButton = await puppeteer.getElement(page, 'Annotations')
        await annotationsButton.click()
        await page.waitForSelector('.turn-components')
        await page.waitForSelector('.turn-option-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-2.png`)
        await puppeteer.clickNthEditButton(page, '.turn-list', 0)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-3.png`)
        await puppeteer.clickNthPosition(page, '.turn-components', i)
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-4.png`)
        await page.waitForSelector('.alternative-moves-button')
        const alternativeMovesButton = await puppeteer.getElement(page, '.alternative-moves-button')
        await alternativeMovesButton.click()
        await page.waitForSelector('.alternative-moves-chessboard')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-5.png`)
        await page.evaluate((from, to) => {
          const hitArea = document.querySelector('.alternative-moves-hitarea')
          hitArea.onmousedown({
            target: hitArea.querySelector(`.coordinate-${from}`)
          })
          hitArea.onmouseup({
            target: hitArea.querySelector(`.coordinate-${to}`)
          })
        }, 'd2', 'd4')
        await page.waitForSelector('.insert-alternative-moves-button')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-6.png`)
        const insertButton = await puppeteer.getElement(page, '.insert-alternative-moves-button')
        await insertButton.click()
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-7.png`)
        const pgnButton = await puppeteer.getElement(page, 'PGN')
        await pgnButton.click()
        await page.waitForSelector('.pgn')
        await puppeteer.saveScreenshot(page, `${testName}-${resultIndex + 1}-8.png`)
        const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
        const moves = content.substring(content.indexOf(']\n\n') + 3)
        assert.strictEqual(true, moves.startsWith(expected[resultIndex]))
        await page.close()
        await page.browser.close()
        resultIndex++
      }
    })

    it('should add to alternative move', async () => {
      const testName = 'insert-alternative-moves-within-alternative-moves'
      const page = await puppeteer.createBrowser(`[Event "Wch27"]

1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.Nd2 Nf6 9.b3 Bb4 10.Bb2 $1 a5 ( { The point is } 10...Bxd2 11.Qxd2 dxe4 12.Qg5 { [#] } ) 11.c3 Be7 12.c4 O-O 13.Qc2 h6 14.a3 Ba6 15.Rfe1 Qb6 16.exd5 cxd5 17.cxd5 Bxd3 18.Qxd3 Rfd8 19.Nc4 Qa6 20.Qf3 Rxd5 21.Rad1 Rf5 22.Qg3 Rg5 23.Qc7 Re8 24.Bxf6 gxf6 25.Rd7 Rc8 26.Qb7 Qxb7 27.Rxb7 Kf8 28.a4 Bb4 29.Re3 Rd8 30.g3 Rd1+ 31.Kg2 Rc5 32.Rf3 f5 $2 ( { Correct is } 32...Kg7 ) 33.g4 $1 { White grabs the chance. } 33...Rd4 34.gxf5 exf5 35.Rb8+ Ke7 36.Re3+ Kf6 37.Rb6+ Kg7 38.Rg3+ Kf8 39.Rb8+ Ke7 40.Re3+ Kf6 41.Rb6+ Kg7 42.Rg3+ Kf8 43.Rxh6 f4 44.Rgh3 $1 { White wants to conquer the overprotected \\P a5.   [#] } {[%csl Ga5]} 44...Kg7 ( { Boleslavsky regards } 44...Rg5+ 45.Kf3 Ke7 { as drawn, but } 46.R3h5 Rxh5 47.Rxh5 Rd3+ 48.Kg4 $1 Rxb3 49.Rb5 $1 { wins for White.   [#] } {[%cal Rh5b5]} ) 45.R6h5 $1 f3+ 46.Kg3 Rxh5 47.Rxh5 Rd3 48.Nxa5 Kg6 49.Rb5 Bxa5 50.Rxa5 Rxb3 51.Ra8 Ra3 52.a5 Kf5 53.a6 Kg6 54.a7 Kg7 55.h4 Kh7 56.h5 Kg7 57.h6+ Kh7 58.Kf4 { Black will lose both f-pawns. Spassky took the lead again. [#] } {[%csl Rf3,Rf7]} 1-0`)
      await puppeteer.saveScreenshot(page, `${testName}-1.png`)
      const annotationsButton = await puppeteer.getElement(page, 'Annotations')
      await annotationsButton.click()
      await page.waitForSelector('.turn-components')
      await page.waitForSelector('.turn-option-button')
      await puppeteer.saveScreenshot(page, `${testName}-2.png`)
      await puppeteer.clickNthEditButton(page, '.turn-list', 0)
      await puppeteer.saveScreenshot(page, `${testName}-3.png`)
      await puppeteer.clickNthPosition(page, '.turn-components', 3)
      await puppeteer.saveScreenshot(page, `${testName}-4.png`)
      await page.waitForSelector('.alternative-moves-button')
      const alternativeMovesButton = await puppeteer.getElement(page, '.alternative-moves-button')
      await alternativeMovesButton.click()
      await page.waitForSelector('.alternative-moves-chessboard')
      await puppeteer.saveScreenshot(page, `${testName}-5.png`)
      await page.evaluate((from, to) => {
        const hitArea = document.querySelector('.alternative-moves-hitarea')
        hitArea.onmousedown({
          target: hitArea.querySelector(`.coordinate-${from}`)
        })
        hitArea.onmouseup({
          target: hitArea.querySelector(`.coordinate-${to}`)
        })
      }, 'd2', 'd4')
      await page.waitForSelector('.insert-alternative-moves-button')
      await puppeteer.saveScreenshot(page, `${testName}-6.png`)
      const insertButton = await puppeteer.getElement(page, '.insert-alternative-moves-button')
      await insertButton.click()
      await puppeteer.saveScreenshot(page, `${testName}-7.png`)
      await puppeteer.clickNthEditButton(page, '.turn-list', 0, 0)
      await puppeteer.saveScreenshot(page, `${testName}-8.png`)
      await puppeteer.clickNthPosition(page, '.turn-components', 5, 0)
      await puppeteer.saveScreenshot(page, `${testName}-9.png`)
      await page.waitForSelector('.alternative-moves-button')
      const alternativeMovesButton2 = await puppeteer.getElement(page, '.alternative-moves-button')
      await alternativeMovesButton2.click()
      await page.waitForSelector('.alternative-moves-chessboard')
      await puppeteer.saveScreenshot(page, `${testName}-10.png`)
      await page.evaluate((from, to) => {
        const hitArea = document.querySelector('.alternative-moves-hitarea')
        hitArea.onmousedown({
          target: hitArea.querySelector(`.coordinate-${from}`)
        })
        hitArea.onmouseup({
          target: hitArea.querySelector(`.coordinate-${to}`)
        })
      }, 'd2', 'd4')
      await puppeteer.saveScreenshot(page, `${testName}-11.png`)
      const insertAlternativeMoves = await puppeteer.getElement(page, '.insert-alternative-moves-button')
      await insertAlternativeMoves.click()
      await puppeteer.saveScreenshot(page, `${testName}-12.png`)
      const pgnButton = await puppeteer.getElement(page, 'PGN')
      await pgnButton.click()
      await page.waitForSelector('.pgn')
      await puppeteer.saveScreenshot(page, `${testName}-13.png`)
      const content = await puppeteer.evaluate(page, () => document.querySelector('.pgn').innerHTML.trim())
      const moves = content.substring(content.indexOf(']\n\n') + 3)
      assert.strictEqual(true, moves.startsWith('1.(1.Pdd4 (1.Pdd4)) e4'))
      await page.close()
      await page.browser.close()
    })
  })
})
