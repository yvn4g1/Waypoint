export type TextareaHeightAllocation = {
  availableHeight: number
  naturalHeights: readonly number[]
  minimumHeight: number
}

export type TextareaAvailableHeight = {
  drawerHeight: number
  paddingTop: number
  paddingBottom: number
  fixedElementHeights: readonly number[]
  rowGap: number
  childCount: number
  minimumTotalHeight: number
}

/** Calculates the textarea budget from the drawer's visible layout, not its scroll height. */
export function calculateTextareaAvailableHeight({
  drawerHeight,
  paddingTop,
  paddingBottom,
  fixedElementHeights,
  rowGap,
  childCount,
  minimumTotalHeight,
}: TextareaAvailableHeight) {
  const innerHeight = drawerHeight - paddingTop - paddingBottom
  const fixedHeight = fixedElementHeights.reduce((total, height) => total + height, 0)
  const gapHeight = Math.max(childCount - 1, 0) * rowGap
  return Math.max(innerHeight - fixedHeight - gapHeight, minimumTotalHeight)
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
