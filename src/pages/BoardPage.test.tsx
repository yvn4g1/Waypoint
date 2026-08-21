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
    expect(unsorted.getAllByRole('heading', { level: 3 }).map((element) => element.textContent)).toEqual(['未整理先', '未整理後'])
    expect(unsorted.getByText('先頭メモ')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '検討中の列' })).getByText('検討メモ')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '保留の列' })).getByText('保留メモ')).toBeInTheDocument()
    const decided = within(screen.getByRole('region', { name: '決定の列' }))
    expect(decided.getByText('決定内容')).toBeInTheDocument()
    expect(decided.queryByText('使わないメモ')).not.toBeInTheDocument()
    expect(decided.getByText('決定のメモ')).toBeInTheDocument()
    expect(within(screen.getByLabelText('状態別件数')).getAllByText('2件')).toHaveLength(2)
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
})
