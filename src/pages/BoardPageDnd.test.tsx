import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card, CardStatus } from '../domain/Board'
import { App } from '../App'
import { LocalStorageBoardRepository } from '../storage/LocalStorageBoardRepository'

vi.mock('./BoardDnd', () => ({
  BoardDnd: ({ cards, onMove }: { cards: Card[]; onMove: (cardId: string, status: CardStatus, index: number) => void }) => (
    <div>
      <button type="button" onClick={() => onMove('B', 'DISCUSSING', 1)}>DnD移動を完了</button>
      {cards.map((card) => <span key={card.id}>{`${card.id}:${card.status}:${card.order}`}</span>)}
    </div>
  ),
}))

const repository = new LocalStorageBoardRepository(localStorage)

describe('BoardPage DnD connection', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-21T09:00:00.000Z'))
    repository.save({
      id: 'board-1', title: 'DnDテスト', createdAt: '2026-08-21T00:00:00.000Z', updatedAt: '2026-08-21T00:00:00.000Z',
      cards: [
        { id: 'A', title: 'A', memo: '', decision: '', status: 'UNSORTED', order: 0 },
        { id: 'B', title: 'B', memo: '', decision: '', status: 'UNSORTED', order: 1 },
        { id: 'C', title: 'C', memo: '', decision: '', status: 'DISCUSSING', order: 0 },
        { id: 'D', title: 'D', memo: '', decision: '', status: 'DISCUSSING', order: 1 },
      ],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('DnD結果をRepositoryへ保存し、件数と再生成後の表示へ反映する', () => {
    const rendered = render(<MemoryRouter initialEntries={['/boards/board-1']}><App /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'DnD移動を完了' }))

    const updated = repository.findById('board-1')!
    expect(updated.cards.find((card) => card.id === 'B')).toMatchObject({ status: 'DISCUSSING', order: 1 })
    expect(updated.cards.find((card) => card.id === 'D')).toMatchObject({ status: 'DISCUSSING', order: 2 })
    expect(updated.updatedAt).toBe('2026-08-21T09:00:00.000Z')
    const summary = within(screen.getByLabelText('状態別件数'))
    expect(summary.getByText('未整理').parentElement).toHaveTextContent('未整理1件')
    expect(summary.getByText('検討中').parentElement).toHaveTextContent('検討中3件')

    rendered.unmount()
    render(<MemoryRouter initialEntries={['/boards/board-1']}><App /></MemoryRouter>)
    expect(screen.getByText('B:DISCUSSING:1')).toBeInTheDocument()
    expect(screen.getByText('D:DISCUSSING:2')).toBeInTheDocument()
  })
})
