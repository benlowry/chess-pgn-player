/* eslint-env mocha */
const assert = require('assert')
const annotations = require('./annotations.js')

describe('annotations.js', () => {
  describe('expandAnnotationSequence', () => {
    it('parse empty annotation', () => {
      const sample = '{}'
      const expanded = annotations.expandAnnotationSequence(sample)
      assert.strictEqual(expanded.join('-'), '{- -}')
    })

    it('parse one-piece annotation', () => {
      const sample = '{first sample}'
      const expanded = annotations.expandAnnotationSequence(sample)
      console.log(expanded)
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
})
