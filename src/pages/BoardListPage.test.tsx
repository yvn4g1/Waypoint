import { act, fireEvent, render, screen } from '@testing-library/react'
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
    expect(screen.getByRole('heading', { name: '新しい話し合い' })).toBeInTheDocument()
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
    expect(screen.getByRole('heading', { name: '週次ミーティング' })).toBeInTheDocument()
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
    expect(screen.getByRole('heading', { name: 'ボード一覧' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '週次ミーティング を開く' })).toBeInTheDocument()
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

  it('管理メニューからJSONをエクスポートしてもボード画面へ遷移しない', () => {
    repository.save(board())
    const createObjectURL = vi.fn(() => 'blob:waypoint')
    const revokeObjectURL = vi.fn()
    Object.defineProperties(URL, {
      createObjectURL: { value: createObjectURL, configurable: true },
      revokeObjectURL: { value: revokeObjectURL, configurable: true },
    })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    renderList()

    fireEvent.click(screen.getByRole('button', { name: '週次ミーティング の管理メニュー' }))
    fireEvent.click(screen.getByRole('button', { name: 'JSONエクスポート' }))

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:waypoint')
    expect(screen.getByRole('heading', { name: 'ボード一覧' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '週次ミーティング を開く' })).toBeInTheDocument()
  })

  it('JSONをインポートして既存Boardを維持したまま一覧を更新する', async () => {
    repository.save(board())
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('00000000-0000-4000-8000-000000000001').mockReturnValueOnce('00000000-0000-4000-8000-000000000002')
    renderList()
    const file = new File(['{}'], 'board.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue(JSON.stringify({
        version: 1,
        board: board({ id: 'source-board', title: 'インポートした会議', cards: [{ id: 'source-card', title: '論点', memo: 'メモ', decision: '', status: 'ON_HOLD', order: 2 }] }),
      })),
    })

    fireEvent.click(screen.getByRole('button', { name: 'インポート' }))
    await act(async () => {
      fireEvent.change(screen.getByLabelText('JSONファイルをインポート'), { target: { files: [file] } })
    })

    expect(repository.findAll()).toHaveLength(2)
    expect(repository.findById('board-1')).toEqual(board())
    expect(repository.findById('00000000-0000-4000-8000-000000000001')).toEqual(board({
      id: '00000000-0000-4000-8000-000000000001', title: 'インポートした会議', updatedAt: '2026-08-21T09:00:00.000Z', cards: [{ id: '00000000-0000-4000-8000-000000000002', title: '論点', memo: 'メモ', decision: '', status: 'ON_HOLD', order: 2 }],
    }))
    expect(screen.getByRole('heading', { name: 'インポートした会議' })).toBeInTheDocument()
  })

  it('不正なJSONは保存せずエラーを表示する', async () => {
    repository.save(board())
    renderList()
    const file = new File(['{}'], 'broken.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: vi.fn().mockResolvedValue('{') })

    await act(async () => {
      fireEvent.change(screen.getByLabelText('JSONファイルをインポート'), { target: { files: [file] } })
    })

    expect(screen.getByRole('alert')).toHaveTextContent('JSONとして読み込めません。')
    expect(repository.findAll()).toEqual([board()])
  })
})
