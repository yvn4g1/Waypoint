export type TextareaHeightAllocation = {
  availableHeight: number
  naturalHeights: readonly number[]
  minimumHeight: number
}

/**
 * Gives each field its needed height before sharing any remaining space.
 * This keeps a short field compact and lets a long neighbouring field use
 * the rest of the drawer.
 */
export function allocateTextareaHeights({ availableHeight, naturalHeights, minimumHeight }: TextareaHeightAllocation) {
  const heights = naturalHeights.map(() => minimumHeight)
  let remaining = Math.max(availableHeight - minimumHeight * heights.length, 0)

  const needs = naturalHeights.map((height) => Math.max(height - minimumHeight, 0))
  while (remaining > 0) {
    const active = needs.map((need, index) => ({ need, index })).filter(({ need, index }) => need > heights[index] - minimumHeight)
    if (active.length === 0) break
    const nextLevel = Math.min(...active.map(({ need }) => need))
    const currentLevel = Math.min(...active.map(({ index }) => heights[index] - minimumHeight))
    const increment = Math.min(nextLevel - currentLevel, remaining / active.length)
    for (const { index } of active) heights[index] += increment
    remaining -= increment * active.length
  }

  return heights
}
