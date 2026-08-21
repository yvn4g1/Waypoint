import { beforeEach, describe, expect, it } from 'vitest'
import type { Board } from '../domain/Board'
import { LocalStorageBoardRepository, WAYPOINT_STORAGE_KEY } from './LocalStorageBoardRepository'

const board = (id: string, title = '会議'): Board => ({
  id,
  title,
  createdAt: '2026-08-21T00:00:00.000Z',
  updatedAt: '2026-08-21T00:00:00.000Z',
  cards: [],
})

describe('LocalStorageBoardRepository', () => {
  let repository: LocalStorageBoardRepository

  beforeEach(() => {
    localStorage.clear()
    repository = new LocalStorageBoardRepository(localStorage)
  })

  it('保存データが存在しない状態から空の一覧を取得できる', () => {
    expect(repository.findAll()).toEqual([])
  })

  it('Board を保存して一覧と ID 指定で取得できる', () => {
    const saved = board('board-1')
    repository.save(saved)

    expect(repository.findAll()).toEqual([saved])
    expect(repository.findById('board-1')).toEqual(saved)
    expect(repository.findById('unknown')).toBeUndefined()
  })

  it('既存 Board を更新できる', () => {
    repository.save(board('board-1'))
    const updated = { ...board('board-1', '更新後'), updatedAt: '2026-08-21T01:00:00.000Z' }
    repository.save(updated)

    expect(repository.findAll()).toEqual([updated])
  })

  it('Board を削除できる', () => {
    repository.save(board('board-1'))
    repository.save(board('board-2'))
    repository.delete('board-1')

    expect(repository.findAll()).toEqual([board('board-2')])
  })

  it('複数 Board を保存できる', () => {
    repository.save(board('board-1'))
    repository.save(board('board-2'))

    expect(repository.findAll()).toEqual([board('board-1'), board('board-2')])
  })

  it('Card を含む Board の status、order、配列の並びを復元できる', () => {
    const saved = {
      ...board('board-1'),
      cards: [
        { id: 'card-2', title: '二番目', memo: '', decision: '', status: 'DECIDED' as const, order: 20 },
        { id: 'card-1', title: '最初', memo: 'メモ', decision: '', status: 'ON_HOLD' as const, order: 10 },
      ],
    }
    repository.save(saved)

    expect(repository.findById('board-1')).toEqual(saved)
  })

  it('currentCardIdのない旧BoardとcurrentCardIdを持つBoardをversion 1のまま復元する', () => {
    const legacy = board('legacy')
    localStorage.setItem(WAYPOINT_STORAGE_KEY, JSON.stringify({ version: 1, boards: [legacy] }))
    expect(repository.findById('legacy')).toEqual(legacy)

    const focused = { ...board('focused'), currentCardId: 'card-1', cards: [{ id: 'card-1', title: '現在', memo: '', decision: '', status: 'UNSORTED' as const, order: 0 }] }
    repository.save(focused)
    expect(repository.findById('focused')).toEqual(focused)
  })

  it('壊れた LocalStorage データを空データとして安全に扱う', () => {
    localStorage.setItem(WAYPOINT_STORAGE_KEY, '{broken')

    expect(repository.findAll()).toEqual([])
  })

  it('想定外の形式と未対応 version を空データとして安全に扱う', () => {
    localStorage.setItem(WAYPOINT_STORAGE_KEY, JSON.stringify({ version: 2, boards: [] }))

    expect(repository.findAll()).toEqual([])
  })
})
