import { describe, expect, it } from 'vitest'
import type { Board } from './Board'
import { boardExportFilename, createImportedBoard, parseBoardExport, serializeBoardExport } from './BoardExport'

const board: Board = {
  id: 'board-original',
  title: '開発会議',
  createdAt: '2026-08-21T00:00:00.000Z',
  updatedAt: '2026-08-21T01:00:00.000Z',
  currentCardId: 'card-original',
  cards: [
    { id: 'card-original', title: '論点', memo: 'メモ\n改行', decision: '決定', status: 'DECIDED', order: 3 },
  ],
}

describe('BoardExport', () => {
  it('Board を変更せずにJSONへ変換し、同じ内容を復元できる', () => {
    const original = structuredClone(board)
    const parsed = parseBoardExport(serializeBoardExport(board))

    expect(parsed).toEqual({ ok: true, value: { version: 1, board } })
    expect(board).toEqual(original)
  })

  it('安全なファイル名を日本語のタイトルから作り、空の名前では代替名を使う', () => {
    expect(boardExportFilename('開発/会議: 2026.')).toBe('waypoint-開発 会議 2026.json')
    expect(boardExportFilename('  ..  ')).toBe('waypoint-board.json')
  })

  it('インポート時にBoardとCardへ新しいIDを付け、日時を適切に引き継ぐ', () => {
    const result = parseBoardExport(serializeBoardExport(board))
    if (!result.ok) throw new Error('valid export should parse')
    const ids = ['board-imported', 'card-imported']

    const imported = createImportedBoard(result.value, '2026-08-22T00:00:00.000Z', () => ids.shift()!)

    expect(imported).toEqual({
      ...board,
      id: 'board-imported',
      updatedAt: '2026-08-22T00:00:00.000Z',
      cards: [{ ...board.cards[0], id: 'card-imported' }],
      currentCardId: 'card-imported',
    })
    expect(board).toEqual({ ...board, cards: [{ ...board.cards[0] }] })
  })

  it('同じデータを複数回インポートしても毎回別のIDを生成する', () => {
    const parsed = parseBoardExport(serializeBoardExport(board))
    if (!parsed.ok) throw new Error('valid export should parse')
    let sequence = 0
    const createId = () => `new-${sequence++}`

    const first = createImportedBoard(parsed.value, '2026-08-22T00:00:00.000Z', createId)
    const second = createImportedBoard(parsed.value, '2026-08-22T00:00:00.000Z', createId)

    expect(first.id).not.toBe(second.id)
    expect(first.cards[0]?.id).not.toBe(second.cards[0]?.id)
    expect(first.currentCardId).toBe(first.cards[0]?.id)
    expect(second.currentCardId).toBe(second.cards[0]?.id)
  })

  it('currentCardIdのない旧version 1を読み込み、dangling currentはimport時に安全に解除する', () => {
    const { currentCardId: _currentCardId, ...legacyBoard } = board
    const legacy = parseBoardExport(JSON.stringify({ version: 1, board: legacyBoard }))
    expect(legacy).toEqual({ ok: true, value: { version: 1, board: legacyBoard } })

    const ids = ['board-imported', 'card-imported']
    const dangling = createImportedBoard({ version: 1, board: { ...board, currentCardId: 'missing' } }, '2026-08-22T00:00:00.000Z', () => ids.shift()!)
    expect(dangling.currentCardId).toBeUndefined()
  })

  it.each([
    ['壊れたJSON', '{', 'invalid-json'],
    ['配列のJSON', '[]', 'invalid-format'],
    ['未対応version', JSON.stringify({ version: 2, board }), 'unsupported-version'],
    ['boardなし', JSON.stringify({ version: 1 }), 'invalid-format'],
    ['cardsが配列でない', JSON.stringify({ version: 1, board: { ...board, cards: {} } }), 'invalid-format'],
    ['不正なstatus', JSON.stringify({ version: 1, board: { ...board, cards: [{ ...board.cards[0], status: 'UNKNOWN' }] } }), 'invalid-format'],
    ['有限でないorder', JSON.stringify({ version: 1, board: { ...board, cards: [{ ...board.cards[0], order: null }] } }), 'invalid-format'],
  ])('%s を安全に拒否する', (_name, text, error) => {
    expect(parseBoardExport(text)).toEqual({ ok: false, error })
  })
})
