import { describe, expect, it } from 'vitest'
import type { Card, CardStatus } from './Board'
import { cardsForStatus, moveCard } from './CardOrdering'

const card = (id: string, status: CardStatus, order: number): Card => ({ id, title: id, memo: `${id}-memo`, decision: `${id}-decision`, status, order })
const ids = (cards: Card[], status: CardStatus) => cardsForStatus(cards, status).map((item) => item.id)
const orders = (cards: Card[], status: CardStatus) => cardsForStatus(cards, status).map((item) => item.order)

describe('moveCard', () => {
  it('同一列で前方と後方へ並び替えてorderを連番にする', () => {
    const cards = ['A', 'B', 'C', 'D'].map((id, order) => card(id, 'UNSORTED', order))
    const forward = moveCard(cards, 'D', 'UNSORTED', 1)
    expect(ids(forward, 'UNSORTED')).toEqual(['A', 'D', 'B', 'C'])
    expect(orders(forward, 'UNSORTED')).toEqual([0, 1, 2, 3])

    const backward = moveCard(forward, 'A', 'UNSORTED', 3)
    expect(ids(backward, 'UNSORTED')).toEqual(['D', 'B', 'C', 'A'])
    expect(orders(backward, 'UNSORTED')).toEqual([0, 1, 2, 3])
  })

  it.each([
    [0, ['B', 'C', 'D']],
    [1, ['C', 'B', 'D']],
    [2, ['C', 'D', 'B']],
  ])('別列のindex %iへ移動する', (targetIndex, expected) => {
    const cards = [card('A', 'UNSORTED', 0), card('B', 'UNSORTED', 1), card('C', 'DISCUSSING', 0), card('D', 'DISCUSSING', 1)]
    const moved = moveCard(cards, 'B', 'DISCUSSING', targetIndex as number)
    expect(ids(moved, 'DISCUSSING')).toEqual(expected)
    expect(orders(moved, 'UNSORTED')).toEqual([0])
    expect(orders(moved, 'DISCUSSING')).toEqual(expected.map((_, index) => index))
    expect(moved.find((item) => item.id === 'B')?.status).toBe('DISCUSSING')
  })

  it('空列へorder 0で移動し、無関係な列を変更しない', () => {
    const unrelated = card('X', 'DECIDED', 8)
    const cards = [card('A', 'UNSORTED', 2), unrelated]
    const moved = moveCard(cards, 'A', 'ON_HOLD', 0)
    expect(moved.find((item) => item.id === 'A')).toMatchObject({ status: 'ON_HOLD', order: 0 })
    expect(moved.find((item) => item.id === 'X')).toBe(unrelated)
  })

  it('同じ位置への移動は元の配列を返す', () => {
    const cards = [card('A', 'UNSORTED', 0), card('B', 'UNSORTED', 1)]
    expect(moveCard(cards, 'B', 'UNSORTED', 1)).toBe(cards)
  })

  it('複数回移動しても全カードを維持し、各列のorderを連番にする', () => {
    const initial = [card('A', 'UNSORTED', 0), card('B', 'UNSORTED', 1), card('C', 'DISCUSSING', 0), card('D', 'DECIDED', 0)]
    const first = moveCard(initial, 'A', 'UNSORTED', 1)
    const second = moveCard(first, 'B', 'DISCUSSING', 1)
    const result = moveCard(second, 'C', 'ON_HOLD', 0)

    expect(new Set(result.map((item) => item.id))).toEqual(new Set(['A', 'B', 'C', 'D']))
    for (const status of ['UNSORTED', 'DISCUSSING', 'ON_HOLD', 'DECIDED'] as const) {
      expect(orders(result, status)).toEqual(cardsForStatus(result, status).map((_, index) => index))
    }
  })
})
