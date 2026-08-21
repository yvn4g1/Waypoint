import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { CARD_STATUSES, CARD_STATUS_LABELS, type Card, type CardStatus } from './domain/Board'
import { cardsForStatus } from './domain/CardOrdering'
import { LocalStorageBoardRepository } from './storage/LocalStorageBoardRepository'

vi.mock('./pages/BoardDnd', () => ({
  BoardDnd: ({ cards, onMove, onSelect }: {
    cards: Card[]
    onMove: (cardId: string, status: CardStatus, index: number) => void
    onSelect: (cardId: string) => void
  }) => (
    <div>
      {CARD_STATUSES.map((status) => {
        const statusCards = cardsForStatus(cards, status)
        return (
          <section key={status} aria-label={`${CARD_STATUS_LABELS[status]}の列`}>
            <h2>{CARD_STATUS_LABELS[status]}</h2>
            {statusCards.map((card) => {
              const preview = card.status === 'DECIDED' && card.decision.trim() ? card.decision : card.memo
              return <button key={card.id} type="button" onClick={() => onSelect(card.id)}>{card.title}{preview}</button>
            })}
          </section>
        )
      })}
      {cards.map((card) => CARD_STATUSES.map((status) => (
        <button
          key={`${card.id}-${status}`}
          type="button"
          onClick={() => onMove(card.id, status, status === 'UNSORTED' ? 0 : cardsForStatus(cards, status).length)}
        >
          {`${card.title}を${CARD_STATUS_LABELS[status]}へ移動`}
        </button>
      )))}
    </div>
  ),
}))

const repository = new LocalStorageBoardRepository(localStorage)

function renderApp() {
  return render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
}

function expectCounts(label: string, expected: Record<CardStatus, number>) {
  const counts = within(screen.getByLabelText(label))
  for (const status of CARD_STATUSES) {
    expect(counts.getByText(CARD_STATUS_LABELS[status]).parentElement)
      .toHaveTextContent(`${CARD_STATUS_LABELS[status]}${expected[status]}件`)
  }
}

function createBoard(title: string) {
  fireEvent.click(screen.getByRole('button', { name: '＋新しいボード' }))
  fireEvent.change(screen.getByLabelText('ボード名'), { target: { value: title } })
  fireEvent.click(screen.getByRole('button', { name: '作成' }))
}

function addCard(title: string) {
  fireEvent.click(screen.getByRole('button', { name: '＋論点' }))
  fireEvent.change(screen.getByLabelText('論点のタイトル'), { target: { value: title } })
  fireEvent.click(screen.getByRole('button', { name: '追加' }))
}

describe('Waypoint MVP主要フロー', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-21T09:00:00.000Z'))
    const ids = ['board-a', 'card-a', 'card-b', 'card-c', 'card-d', 'card-e', 'board-b', 'card-b-only']
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => ids.shift() as `${string}-${string}-${string}-${string}-${string}`)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('Board作成から編集・並び替え・4状態への配置・別Board・再生成後の再開まで保存内容を維持する', () => {
    const firstApp = renderApp()

    createBoard('Board A')
    expect(screen.getByRole('heading', { name: 'Board A' })).toBeInTheDocument()
    expectCounts('状態別件数', { UNSORTED: 0, DISCUSSING: 0, ON_HOLD: 0, DECIDED: 0 })
    expect(repository.findById('board-a')).toMatchObject({ title: 'Board A', cards: [] })

    for (const title of ['論点A', '論点B', '論点C', '論点D', '論点E']) addCard(title)
    expect(within(screen.getByRole('region', { name: '未整理の列' })).getAllByRole('button')).toHaveLength(5)
    expect(repository.findById('board-a')?.cards.map((card) => [card.title, card.status, card.order])).toEqual([
      ['論点A', 'UNSORTED', 0],
      ['論点B', 'UNSORTED', 1],
      ['論点C', 'UNSORTED', 2],
      ['論点D', 'UNSORTED', 3],
      ['論点E', 'UNSORTED', 4],
    ])

    fireEvent.click(within(screen.getByRole('region', { name: '未整理の列' })).getByRole('button', { name: '論点D' }))
    const drawer = within(screen.getByRole('complementary', { name: '論点の詳細' }))
    fireEvent.change(drawer.getByLabelText('タイトル'), { target: { value: '論点D（更新）' } })
    fireEvent.change(drawer.getByLabelText('自由メモ'), { target: { value: '一行目\n二行目' } })
    fireEvent.change(drawer.getByLabelText('決定内容'), { target: { value: 'この方針で決定' } })
    expect(within(screen.getByRole('region', { name: '未整理の列' })).getByRole('button', { name: /論点D（更新）一行目\s+二行目/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '論点Eを未整理へ移動' }))
    fireEvent.click(screen.getByRole('button', { name: '論点Bを検討中へ移動' }))
    fireEvent.click(screen.getByRole('button', { name: '論点Cを保留へ移動' }))
    fireEvent.click(screen.getByRole('button', { name: '論点D（更新）を決定へ移動' }))

    expectCounts('状態別件数', { UNSORTED: 2, DISCUSSING: 1, ON_HOLD: 1, DECIDED: 1 })
    expect(within(screen.getByRole('region', { name: '決定の列' })).getByRole('button', { name: '論点D（更新）この方針で決定' })).toBeInTheDocument()
    const savedA = repository.findById('board-a')!
    expect(cardsForStatus(savedA.cards, 'UNSORTED').map((card) => [card.title, card.order])).toEqual([
      ['論点E', 0],
      ['論点A', 1],
    ])
    expect(savedA.cards.find((card) => card.id === 'card-d')).toMatchObject({
      title: '論点D（更新）', memo: '一行目\n二行目', decision: 'この方針で決定', status: 'DECIDED', order: 0,
    })

    fireEvent.click(screen.getByRole('link', { name: '← ボード一覧' }))
    expect(screen.getByRole('link', { name: 'Board A を開く' })).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: 'Board A を開く' })).getByText(/最終更新:/)).toBeInTheDocument()
    expectCounts('Board A を開く', { UNSORTED: 2, DISCUSSING: 1, ON_HOLD: 1, DECIDED: 1 })

    createBoard('Board B')
    addCard('Bだけの論点')
    fireEvent.click(screen.getByRole('link', { name: '← ボード一覧' }))
    fireEvent.click(screen.getByRole('link', { name: 'Board A を開く' }))
    expect(screen.getByText('論点A')).toBeInTheDocument()
    expect(screen.queryByText('Bだけの論点')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: '← ボード一覧' }))
    fireEvent.click(screen.getByRole('link', { name: 'Board B を開く' }))
    expect(screen.getByText('Bだけの論点')).toBeInTheDocument()
    expect(screen.queryByText('論点A')).not.toBeInTheDocument()

    firstApp.unmount()
    renderApp()
    fireEvent.click(screen.getByRole('link', { name: 'Board A を開く' }))
    expectCounts('状態別件数', { UNSORTED: 2, DISCUSSING: 1, ON_HOLD: 1, DECIDED: 1 })
    expect(within(screen.getByRole('region', { name: '未整理の列' })).getAllByRole('button').map((button) => button.textContent)).toEqual(['論点E', '論点A'])
    fireEvent.click(within(screen.getByRole('region', { name: '決定の列' })).getByRole('button', { name: '論点D（更新）この方針で決定' }))
    expect(screen.getByLabelText('タイトル')).toHaveValue('論点D（更新）')
    expect(screen.getByLabelText('自由メモ')).toHaveValue('一行目\n二行目')
    expect(screen.getByLabelText('決定内容')).toHaveValue('この方針で決定')
    expect(screen.getByLabelText('状態')).toHaveValue('DECIDED')
    expect(repository.findAll().map((board) => board.title)).toEqual(['Board A', 'Board B'])
  })
})
