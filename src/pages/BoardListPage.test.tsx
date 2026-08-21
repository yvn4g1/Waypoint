import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import type { Board } from '../domain/Board'
import { LocalStorageBoardRepository } from '../storage/LocalStorageBoardRepository'

const repository = new LocalStorageBoardRepository(localStorage)

const board = (overrides: Partial<Board> = {}): Board => ({
  id: 'board-1', title: '週次ミーティング', createdAt: '2026-08-21T00:00:00.000Z', updatedAt: '2026-08-21T00:00:00.000Z', cards: [], ...overrides,
})

function renderList() {
  return render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
}

describe('BoardListPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-21T09:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('保存済み Board と4状態の件数、最終更新日時を表示する', () => {
    repository.save(board({ cards: [
      { id: '1', title: '', memo: '', decision: '', status: 'UNSORTED', order: 1 },
      { id: '2', title: '', memo: '', decision: '', status: 'DISCUSSING', order: 2 },
      { id: '3', title: '', memo: '', decision: '', status: 'DISCUSSING', order: 3 },
      { id: '4', title: '', memo: '', decision: '', status: 'ON_HOLD', order: 4 },
      { id: '5', title: '', memo: '', decision: '', status: 'DECIDED', order: 5 },
    ] }))
    renderList()

    expect(screen.getByRole('heading', { name: '週次ミーティング' })).toBeInTheDocument()
    expect(screen.getByText('未整理')).toBeInTheDocument()
    expect(screen.getByText('検討中')).toBeInTheDocument()
    expect(screen.getByText('保留')).toBeInTheDocument()
    expect(screen.getByText('決定')).toBeInTheDocument()
    expect(screen.getByText('2件')).toBeInTheDocument()
    expect(screen.getAllByText('1件')).toHaveLength(3)
    expect(screen.getByText(/最終更新:/)).toBeInTheDocument()
  })

  it('Board がない場合は空状態を表示する', () => {
    renderList()
    expect(screen.getByText('まだボードがありません。新しいボードを作成してください。')).toBeInTheDocument()
  })

  it('新しい Board を保存して作成先へ遷移する', () => {
    renderList()
    fireEvent.click(screen.getByRole('button', { name: '＋新しいボード' }))
    fireEvent.change(screen.getByLabelText('ボード名'), { target: { value: '新しい話し合い' } })
    fireEvent.click(screen.getByRole('button', { name: '作成' }))

    const saved = repository.findAll()
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ title: '新しい話し合い', cards: [] })
    expect(saved[0]?.createdAt).toBe('2026-08-21T09:00:00.000Z')
    expect(screen.getByText(`ボード: ${saved[0]?.id}`)).toBeInTheDocument()
  })

  it('空白だけの名前では Board を作成しない', () => {
    renderList()
    fireEvent.click(screen.getByRole('button', { name: '＋新しいボード' }))
    fireEvent.change(screen.getByLabelText('ボード名'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '作成' }))
    expect(repository.findAll()).toEqual([])
  })

  it('ボード本体の選択で対象のボード画面へ遷移する', () => {
    repository.save(board())
    renderList()
    fireEvent.click(screen.getByRole('link', { name: '週次ミーティング を開く' }))
    expect(screen.getByText('ボード: board-1')).toBeInTheDocument()
  })

  it('名前変更は updatedAt を更新し、他の Board データを維持する', () => {
    const saved = board({ cards: [{ id: 'card-1', title: '論点', memo: 'メモ', decision: '', status: 'ON_HOLD', order: 4 }] })
    repository.save(saved)
    renderList()
    fireEvent.click(screen.getByRole('button', { name: '週次ミーティング の管理メニュー' }))
    fireEvent.click(screen.getByRole('button', { name: '名前変更' }))
    fireEvent.change(screen.getByLabelText('ボード名'), { target: { value: '変更後の会議' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(screen.getByRole('heading', { name: '変更後の会議' })).toBeInTheDocument()
    expect(repository.findById('board-1')).toEqual({ ...saved, title: '変更後の会議', updatedAt: '2026-08-21T09:00:00.000Z' })
  })

  it('管理メニュー操作ではボード画面へ遷移しない', () => {
    repository.save(board())
    renderList()
    fireEvent.click(screen.getByRole('button', { name: '週次ミーティング の管理メニュー' }))
    expect(screen.getByRole('button', { name: '名前変更' })).toBeInTheDocument()
    expect(screen.queryByText('ボード: board-1')).not.toBeInTheDocument()
  })

  it('削除をキャンセルすると Board を残し、確認すると削除する', () => {
    repository.save(board())
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    renderList()

    fireEvent.click(screen.getByRole('button', { name: '週次ミーティング の管理メニュー' }))
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    expect(repository.findById('board-1')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    expect(confirm).toHaveBeenLastCalledWith(expect.stringContaining('論点カードもすべて削除されます'))
    expect(repository.findAll()).toEqual([])
    expect(screen.getByText('まだボードがありません。新しいボードを作成してください。')).toBeInTheDocument()
  })

  it('再生成後も LocalStorage に保存した変更を復元する', () => {
    repository.save(board({ title: '保存済みの名前' }))
    const first = renderList()
    expect(screen.getByText('保存済みの名前')).toBeInTheDocument()
    first.unmount()
    renderList()
    expect(screen.getByText('保存済みの名前')).toBeInTheDocument()
  })
})
