import { describe, expect, it } from 'vitest'
import { allocateTextareaHeights, calculateTextareaAvailableHeight } from './textareaHeight'

describe('allocateTextareaHeights', () => {
  it('keeps a short field compact and gives remaining space to the long field', () => {
    expect(allocateTextareaHeights({ availableHeight: 680, naturalHeights: [600, 80], minimumHeight: 76 })).toEqual([600, 80])
  })

  it('shares a constrained budget after preserving both minimum heights', () => {
    expect(allocateTextareaHeights({ availableHeight: 400, naturalHeights: [600, 600], minimumHeight: 76 })).toEqual([200, 200])
  })
})

describe('calculateTextareaAvailableHeight', () => {
  const minimumTotalHeight = 152

  it('uses unused space in a large drawer rather than treating it as fixed content', () => {
    expect(calculateTextareaAvailableHeight({
      drawerHeight: 900, paddingTop: 20, paddingBottom: 20,
      fixedElementHeights: [40, 24, 38, 24, 24, 24, 38, 38], rowGap: 9, childCount: 10, minimumTotalHeight,
    })).toBe(529)
  })

  it('keeps both textareas at their combined minimum in a small drawer', () => {
    expect(calculateTextareaAvailableHeight({
      drawerHeight: 300, paddingTop: 20, paddingBottom: 20,
      fixedElementHeights: [40, 24, 38, 24, 24, 24, 38, 38], rowGap: 9, childCount: 10, minimumTotalHeight,
    })).toBe(minimumTotalHeight)
  })

  it('lets a long field use the correctly measured budget while a short field stays compact', () => {
    const availableHeight = calculateTextareaAvailableHeight({
      drawerHeight: 900, paddingTop: 20, paddingBottom: 20,
      fixedElementHeights: [40, 24, 38, 24, 24, 24, 38, 38], rowGap: 9, childCount: 10, minimumTotalHeight,
    })
    expect(allocateTextareaHeights({ availableHeight, naturalHeights: [600, 76], minimumHeight: 76 })).toEqual([453, 76])
  })

  it('shares the correctly measured budget when both fields are long', () => {
    const availableHeight = calculateTextareaAvailableHeight({
      drawerHeight: 900, paddingTop: 20, paddingBottom: 20,
      fixedElementHeights: [40, 24, 38, 24, 24, 24, 38, 38], rowGap: 9, childCount: 10, minimumTotalHeight,
    })
    expect(allocateTextareaHeights({ availableHeight, naturalHeights: [600, 600], minimumHeight: 76 })).toEqual([264.5, 264.5])
  })
})
