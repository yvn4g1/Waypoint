import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card, CardStatus } from '../domain/Board'
import { App } from '../App'
import { LocalStorageBoardRepository } from '../storage/LocalStorageBoardRepository'

vi.mock('./BoardDnd', () => ({
  BoardDnd: ({ cards, currentCardId, onMove, onSelect, onSetCurrent, onDragStart, renderHeader }: {
    cards: Card[]
    currentCardId?: string | null
    onMove: (cardId: string, status: CardStatus, index: number, source: 'column' | 'current') => void
    onSelect: (cardId: string) => void
    onSetCurrent: (cardId: string) => void
    onDragStart?: (cardId: string) => void
    renderHeader: (currentTopic: ReactNode) => ReactNode
  }) => (
    <div>
      {renderHeader(<div aria-label="現在の論点">{`current:${currentCardId ?? 'none'}`}</div>)}
      <button type="button" onClick={() => onSelect('A')}>カードAを開く</button>
      <button type="button" onClick={() => onSetCurrent('A')}>Aを現在に設定</button>
      <button type="button" onClick={() => onSetCurrent('B')}>Bを現在に設定</button>
      <button type="button" onClick={() => onSetCurrent('C')}>Cを現在に設定</button>
      <button type="button" onClick={() => onSetCurrent('D')}>Dを現在に設定</button>
      <button type="button" onClick={() => onDragStart?.('B')}>DnD開始</button>
      <button type="button" onClick={() => onMove('B', 'DISCUSSING', 1, 'column')}>列側DnD移動を完了</button>
      <button type="button" onClick={() => { onDragStart?.('B'); onMove('B', 'DECIDED', 0, 'current') }}>現在枠から決定へ移動</button>
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
    fireEvent.click(screen.getByRole('button', { name: 'カードAを開く' }))
    expect(screen.getByRole('complementary', { name: '論点の詳細' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'DnD開始' }))
    expect(screen.queryByRole('complementary', { name: '論点の詳細' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '列側DnD移動を完了' }))

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

  it('列のCardを現在へ設定すると検討中末尾へ移動し、入れ替え後も保存・復元する', () => {
    const rendered = render(<MemoryRouter initialEntries={['/boards/board-1']}><App /></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: 'Aを現在に設定' }))
    expect(repository.findById('board-1')).toMatchObject({ currentCardId: 'A' })
    expect(repository.findById('board-1')?.cards.find((card) => card.id === 'A')).toMatchObject({ status: 'DISCUSSING', order: 2 })
    expect(repository.findById('board-1')?.cards.find((card) => card.id === 'B')).toMatchObject({ status: 'UNSORTED', order: 0 })
    expect(screen.getByLabelText('タイトル')).toHaveValue('A')

    fireEvent.click(screen.getByRole('button', { name: 'Bを現在に設定' }))
    expect(repository.findById('board-1')).toMatchObject({ currentCardId: 'B' })
    expect(repository.findById('board-1')?.cards.filter((card) => card.status === 'DISCUSSING').sort((left, right) => left.order - right.order).map((card) => [card.id, card.order])).toEqual([['C', 0], ['D', 1], ['A', 2], ['B', 3]])
    expect(screen.getByLabelText('タイトル')).toHaveValue('B')

    rendered.unmount()
    render(<MemoryRouter initialEntries={['/boards/board-1']}><App /></MemoryRouter>)
    expect(screen.getByLabelText('現在の論点')).toHaveTextContent('current:B')
  })

  it.each([
    ['UNSORTED', 'A'],
    ['ON_HOLD', 'B'],
    ['DECIDED', 'C'],
  ] as const)('%s Cardを現在へ設定すると検討中の末尾へ移し、元列のorderを整える', (status, cardId) => {
    repository.save({
      id: 'board-1', title: 'DnDテスト', createdAt: '2026-08-21T00:00:00.000Z', updatedAt: '2026-08-21T00:00:00.000Z',
      cards: [
        { id: 'A', title: 'A', memo: '', decision: '', status: 'UNSORTED', order: 0 },
        { id: 'A2', title: 'A2', memo: '', decision: '', status: 'UNSORTED', order: 1 },
        { id: 'B', title: 'B', memo: '', decision: '', status: 'ON_HOLD', order: 0 },
        { id: 'B2', title: 'B2', memo: '', decision: '', status: 'ON_HOLD', order: 1 },
        { id: 'C', title: 'C', memo: '', decision: '', status: 'DECIDED', order: 0 },
        { id: 'C2', title: 'C2', memo: '', decision: '', status: 'DECIDED', order: 1 },
        { id: 'D', title: 'D', memo: '', decision: '', status: 'DISCUSSING', order: 0 },
      ],
    })
    render(<MemoryRouter initialEntries={['/boards/board-1']}><App /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: `${cardId}を現在に設定` }))

    const updated = repository.findById('board-1')!
    expect(updated.currentCardId).toBe(cardId)
    expect(updated.cards.find((card) => card.id === cardId)).toMatchObject({ status: 'DISCUSSING', order: 1 })
    expect(updated.cards.filter((card) => card.status === status).sort((left, right) => left.order - right.order).map((card) => card.order)).toEqual([0])
    expect(within(screen.getByLabelText('状態別件数')).getByText('検討中').parentElement).toHaveTextContent('検討中2件')
    expect(screen.getByLabelText('タイトル')).toHaveValue(cardId)
  })

  it('既に検討中のCardを現在へ設定してもstatusとorderを変えず、前のcurrentは検討中に残す', () => {
    repository.save({
      id: 'board-1', title: 'DnDテスト', createdAt: '2026-08-21T00:00:00.000Z', updatedAt: '2026-08-21T00:00:00.000Z', currentCardId: 'D',
      cards: [
        { id: 'A', title: 'A', memo: '', decision: '', status: 'UNSORTED', order: 0 },
        { id: 'D', title: 'D', memo: '', decision: '', status: 'DISCUSSING', order: 0 },
        { id: 'C', title: 'C', memo: '', decision: '', status: 'DISCUSSING', order: 1 },
      ],
    })
    render(<MemoryRouter initialEntries={['/boards/board-1']}><App /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Cを現在に設定' }))

    const updated = repository.findById('board-1')!
    expect(updated.currentCardId).toBe('C')
    expect(updated.cards.find((card) => card.id === 'D')).toMatchObject({ status: 'DISCUSSING', order: 0 })
    expect(updated.cards.find((card) => card.id === 'C')).toMatchObject({ status: 'DISCUSSING', order: 1 })
  })

  it('元列側のcurrent Cardを移動してもcurrentを維持する', () => {
    render(<MemoryRouter initialEntries={['/boards/board-1']}><App /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Bを現在に設定' }))
    fireEvent.click(screen.getByRole('button', { name: '列側DnD移動を完了' }))

    const updated = repository.findById('board-1')!
    expect(updated.currentCardId).toBe('B')
    expect(updated.cards.find((card) => card.id === 'B')).toMatchObject({ status: 'DISCUSSING', order: 1 })
  })

  it('現在枠側から列へ移動すると既存規則で移動しcurrentを解除する', () => {
    render(<MemoryRouter initialEntries={['/boards/board-1']}><App /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Bを現在に設定' }))
    fireEvent.click(screen.getByRole('button', { name: '現在枠から決定へ移動' }))

    const updated = repository.findById('board-1')!
    expect(updated.currentCardId).toBeNull()
    expect(updated.cards.find((card) => card.id === 'B')).toMatchObject({ status: 'DECIDED', order: 0 })
    expect(updated.cards.filter((card) => card.status === 'UNSORTED').map((card) => [card.id, card.order])).toEqual([['A', 0]])
    expect(screen.queryByRole('complementary', { name: '論点の詳細' })).not.toBeInTheDocument()
  })

  it('現在枠のdrag開始後にcancel相当でdropしなければcurrentを維持しDrawerだけ閉じる', () => {
    render(<MemoryRouter initialEntries={['/boards/board-1']}><App /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Bを現在に設定' }))
    expect(screen.getByRole('complementary', { name: '論点の詳細' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'DnD開始' }))

    expect(repository.findById('board-1')?.currentCardId).toBe('B')
    expect(screen.queryByRole('complementary', { name: '論点の詳細' })).not.toBeInTheDocument()
  })
})
