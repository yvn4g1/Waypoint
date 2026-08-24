import { describe, expect, it } from 'vitest'
import { allocateTextareaHeights } from './textareaHeight'

describe('allocateTextareaHeights', () => {
  it('keeps a short field compact and gives remaining space to the long field', () => {
    expect(allocateTextareaHeights({ availableHeight: 680, naturalHeights: [600, 80], minimumHeight: 76 })).toEqual([600, 80])
  })

  it('shares a constrained budget after preserving both minimum heights', () => {
    expect(allocateTextareaHeights({ availableHeight: 400, naturalHeights: [600, 600], minimumHeight: 76 })).toEqual([200, 200])
  })
})
