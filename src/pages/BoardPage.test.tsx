import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import type { Board } from '../domain/Board'
import { LocalStorageBoardRepository } from '../storage/LocalStorageBoardRepository'

const repository = new LocalStorageBoardRepository(localStorage)

const board = (overrides: Partial<Board> = {}): Board => ({
  id: 'board-1', title: 'プロジェクト会議', createdAt: '2026-08-21T00:00:00.000Z', updatedAt: '2026-08-21T00:00:00.000Z', cards: [], ...overrides,
})

function renderBoard(id = 'board-1') {
  return render(<MemoryRouter initialEntries={[`/boards/${id}`]}><App /></MemoryRouter>)
}

describe('BoardPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-21T09:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('4列へ status ごとにカードを order 昇順で表示し、プレビュー規則と件数を適用する', () => {
    repository.save(board({ cards: [
      { id: 'u-later', title: '未整理後', memo: '未整理メモ', decision: '', status: 'UNSORTED', order: 7 },
      { id: 'u-first', title: '未整理先', memo: '先頭メモ', decision: '', status: 'UNSORTED', order: 2 },
      { id: 'd', title: '検討カード', memo: '検討メモ', decision: '', status: 'DISCUSSING', order: 1 },
      { id: 'h', title: '保留カード', memo: '保留メモ', decision: '', status: 'ON_HOLD', order: 1 },
      { id: 'decided', title: '決定カード', memo: '使わないメモ', decision: '決定内容', status: 'DECIDED', order: 1 },
      { id: 'fallback', title: '決定メモカード', memo: '決定のメモ', decision: '   ', status: 'DECIDED', order: 2 },
    ] }))
    renderBoard()

    const unsorted = within(screen.getByRole('region', { name: '未整理の列' }))
    expect(unsorted.getAllByRole('button').map((element) => element.textContent)).toEqual(['未整理先先頭メモ', '未整理後未整理メモ'])
    expect(unsorted.getByText('先頭メモ')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '検討中の列' })).getByText('検討メモ')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '保留の列' })).getByText('保留メモ')).toBeInTheDocument()
    const decided = within(screen.getByRole('region', { name: '決定の列' }))
    expect(decided.getByText('決定内容')).toBeInTheDocument()
    expect(decided.queryByText('使わないメモ')).not.toBeInTheDocument()
    expect(decided.getByText('決定のメモ')).toBeInTheDocument()
    const summary = within(screen.getByLabelText('状態別件数'))
    expect(summary.getByText('未整理').parentElement).toHaveTextContent('未整理2件')
    expect(summary.getByText('検討中').parentElement).toHaveTextContent('検討中1件')
    expect(summary.getByText('保留').parentElement).toHaveTextContent('保留1件')
    expect(summary.getByText('決定').parentElement).toHaveTextContent('決定2件')
  })

  it('論点を未整理列の末尾に追加して Repository へ保存する', () => {
    const saved = board({ cards: [
      { id: 'unsorted-2', title: '既存2', memo: '', decision: '', status: 'UNSORTED', order: 2 },
      { id: 'unsorted-7', title: '既存7', memo: '', decision: '', status: 'UNSORTED', order: 7 },
      { id: 'other', title: '既存他列', memo: '', decision: '', status: 'DECIDED', order: 99 },
    ] })
    repository.save(saved)
    renderBoard()
    fireEvent.click(screen.getByRole('button', { name: '＋論点' }))
    fireEvent.change(screen.getByLabelText('論点のタイトル'), { target: { value: '新しい論点' } })
    fireEvent.click(screen.getByRole('button', { name: '追加' }))

    const updated = repository.findById('board-1')!
    expect(updated.cards).toHaveLength(4)
    expect(updated.cards.at(-1)).toMatchObject({ title: '新しい論点', memo: '', decision: '', status: 'UNSORTED', order: 8 })
    expect(updated.updatedAt).toBe('2026-08-21T09:00:00.000Z')
    expect(updated.cards.slice(0, 3)).toEqual(saved.cards)
    expect(within(screen.getByRole('region', { name: '未整理の列' })).getByText('新しい論点')).toBeInTheDocument()
  })

  it('空白だけの論点を追加しない', () => {
    repository.save(board())
    renderBoard()
    fireEvent.click(screen.getByRole('button', { name: '＋論点' }))
    fireEvent.change(screen.getByLabelText('論点のタイトル'), { target: { value: '  ' } })
    fireEvent.click(screen.getByRole('button', { name: '追加' }))
    expect(repository.findById('board-1')?.cards).toEqual([])
  })

  it('再生成後も追加した論点を LocalStorage から復元する', () => {
    repository.save(board())
    const first = renderBoard()
    fireEvent.click(screen.getByRole('button', { name: '＋論点' }))
    fireEvent.change(screen.getByLabelText('論点のタイトル'), { target: { value: '復元する論点' } })
    fireEvent.click(screen.getByRole('button', { name: '追加' }))
    first.unmount()
    renderBoard()
    expect(screen.getByText('復元する論点')).toBeInTheDocument()
  })

  it('存在しない Board は見つからない表示と一覧への導線を出す', () => {
    renderBoard('missing')
    expect(screen.getByRole('heading', { name: 'ボードが見つかりません' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ボード一覧へ戻る' })).toHaveAttribute('href', '/')
  })

  it('管理メニューから名前変更し、Repository と表示を更新する', () => {
    repository.save(board())
    renderBoard()
    fireEvent.click(screen.getByRole('button', { name: 'ボード管理メニュー' }))
    fireEvent.click(screen.getByRole('button', { name: '名前変更' }))
    fireEvent.change(screen.getByLabelText('ボード名'), { target: { value: '変更後の会議' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByRole('heading', { name: '変更後の会議' })).toBeInTheDocument()
    expect(repository.findById('board-1')).toMatchObject({ title: '変更後の会議', updatedAt: '2026-08-21T09:00:00.000Z' })
  })

  it('削除をキャンセルすると残し、確認すると一覧へ遷移して削除する', () => {
    repository.save(board())
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    renderBoard()
    fireEvent.click(screen.getByRole('button', { name: 'ボード管理メニュー' }))
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    expect(repository.findById('board-1')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    expect(repository.findById('board-1')).toBeUndefined()
    expect(screen.getByRole('heading', { name: 'ボード一覧' })).toBeInTheDocument()
  })

  it('選択したカードの詳細をドロワーに表示し、編集を保存してカード表面へ反映する', () => {
    repository.save(board({ cards: [
      { id: 'target', title: '対象カード', memo: '元のメモ', decision: '元の決定', status: 'DECIDED', order: 0 },
      { id: 'other', title: '別のカード', memo: '別メモ', decision: '', status: 'UNSORTED', order: 0 },
    ] }))
    const rendered = renderBoard()
    fireEvent.click(screen.getByRole('button', { name: '対象カード元の決定' }))

    const drawer = within(screen.getByRole('complementary', { name: '論点の詳細' }))
    expect(drawer.getByLabelText('タイトル')).toHaveValue('対象カード')
    expect(drawer.getByLabelText('自由メモ')).toHaveValue('元のメモ')
    expect(drawer.getByLabelText('決定内容')).toHaveValue('元の決定')
    expect(drawer.getByLabelText('状態')).toHaveValue('DECIDED')
    expect(drawer.queryByDisplayValue('別メモ')).not.toBeInTheDocument()

    fireEvent.change(drawer.getByLabelText('タイトル'), { target: { value: '変更後タイトル' } })
    fireEvent.change(drawer.getByLabelText('自由メモ'), { target: { value: '更新メモ\n改行も保持' } })
    fireEvent.change(drawer.getByLabelText('決定内容'), { target: { value: '更新した決定' } })

    expect(screen.getByRole('button', { name: '変更後タイトル更新した決定' })).toBeInTheDocument()
    const updated = repository.findById('board-1')!
    expect(updated.cards.find((card) => card.id === 'target')).toMatchObject({ title: '変更後タイトル', memo: '更新メモ\n改行も保持', decision: '更新した決定', status: 'DECIDED', order: 0 })
    expect(updated.updatedAt).toBe('2026-08-21T09:00:00.000Z')
    expect(updated.cards.find((card) => card.id === 'other')).toEqual({ id: 'other', title: '別のカード', memo: '別メモ', decision: '', status: 'UNSORTED', order: 0 })

    fireEvent.click(drawer.getByRole('button', { name: '詳細を閉じる' }))
    fireEvent.click(screen.getByRole('button', { name: '別のカード別メモ' }))
    fireEvent.change(screen.getByLabelText('自由メモ'), { target: { value: '別の更新メモ' } })
    expect(screen.getByRole('button', { name: '別のカード別の更新メモ' })).toBeInTheDocument()

    rendered.unmount()
    renderBoard()
    expect(screen.getByRole('button', { name: '変更後タイトル更新した決定' })).toBeInTheDocument()
  })

  it('状態変更で元列と移動先列のorderを正規化し、末尾へ移動する', () => {
    repository.save(board({ cards: [
      { id: 'a', title: 'A', memo: '', decision: '', status: 'UNSORTED', order: 2 },
      { id: 'b', title: 'B', memo: '', decision: '', status: 'UNSORTED', order: 7 },
      { id: 'c', title: 'C', memo: '', decision: '', status: 'UNSORTED', order: 20 },
      { id: 'd', title: 'D', memo: '', decision: '', status: 'DISCUSSING', order: 3 },
      { id: 'e', title: 'E', memo: '', decision: '', status: 'DISCUSSING', order: 10 },
    ] }))
    renderBoard()
    fireEvent.click(within(screen.getByRole('region', { name: '未整理の列' })).getByRole('button', { name: 'B' }))
    fireEvent.change(screen.getByLabelText('状態'), { target: { value: 'DISCUSSING' } })

    const updated = repository.findById('board-1')!
    expect(updated.cards.filter((card) => card.status === 'UNSORTED').sort((a, b) => a.order - b.order).map((card) => [card.id, card.order])).toEqual([['a', 0], ['c', 1]])
    expect(updated.cards.filter((card) => card.status === 'DISCUSSING').sort((a, b) => a.order - b.order).map((card) => [card.id, card.order])).toEqual([['d', 0], ['e', 1], ['b', 2]])
    expect(updated.updatedAt).toBe('2026-08-21T09:00:00.000Z')
    expect(within(screen.getByRole('region', { name: '未整理の列' })).queryByRole('button', { name: 'B' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '検討中の列' })).getByRole('button', { name: 'B' })).toBeInTheDocument()
    expect(within(screen.getByLabelText('状態別件数')).getByText('未整理').parentElement).toHaveTextContent('未整理2件')
    expect(within(screen.getByLabelText('状態別件数')).getByText('検討中').parentElement).toHaveTextContent('検討中3件')
  })

  it('決定内容が空でも決定状態へ変更できる', () => {
    repository.save(board({ cards: [{ id: 'card-1', title: '決定する論点', memo: '', decision: '', status: 'UNSORTED', order: 0 }] }))
    renderBoard()
    fireEvent.click(screen.getByRole('button', { name: '決定する論点' }))
    fireEvent.change(screen.getByLabelText('状態'), { target: { value: 'DECIDED' } })
    expect(repository.findById('board-1')?.cards[0]).toMatchObject({ status: 'DECIDED', decision: '', order: 0 })
    expect(within(screen.getByRole('region', { name: '決定の列' })).getByRole('button', { name: '決定する論点' })).toBeInTheDocument()
  })

  it('削除のキャンセルではドロワーを維持し、確定では対象列だけorderを詰める', () => {
    const heldCard = { id: 'held', title: '保留カード', memo: '', decision: '', status: 'ON_HOLD' as const, order: 9 }
    repository.save(board({ cards: [
      { id: 'delete', title: '削除対象', memo: '', decision: '', status: 'UNSORTED', order: 2 },
      { id: 'remain', title: '残るカード', memo: '', decision: '', status: 'UNSORTED', order: 7 },
      heldCard,
    ] }))
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const rendered = renderBoard()
    fireEvent.click(screen.getByRole('button', { name: '削除対象' }))
    fireEvent.click(screen.getByRole('button', { name: '論点を削除' }))
    expect(repository.findById('board-1')?.cards.find((card) => card.id === 'delete')).toBeDefined()
    expect(screen.getByRole('complementary', { name: '論点の詳細' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '論点を削除' }))
    const updated = repository.findById('board-1')!
    expect(updated.cards.find((card) => card.id === 'delete')).toBeUndefined()
    expect(updated.cards.find((card) => card.id === 'remain')).toMatchObject({ order: 0, status: 'UNSORTED' })
    expect(updated.cards.find((card) => card.id === 'held')).toEqual(heldCard)
    expect(updated.updatedAt).toBe('2026-08-21T09:00:00.000Z')
    expect(screen.queryByRole('complementary', { name: '論点の詳細' })).not.toBeInTheDocument()
    rendered.unmount()
    renderBoard()
    expect(screen.queryByRole('button', { name: '削除対象' })).not.toBeInTheDocument()
  })
})
