import type { Board } from './Board'
import { isBoard, isRecord } from './BoardValidation'

export type WaypointExport = {
  version: 1
  board: Board
}

export type BoardImportError = 'invalid-json' | 'unsupported-version' | 'invalid-format'

export type BoardImportParseResult =
  | { ok: true; value: WaypointExport }
  | { ok: false; error: BoardImportError }

export function serializeBoardExport(board: Board): string {
  return JSON.stringify({ version: 1, board } satisfies WaypointExport, null, 2)
}

export function parseBoardExport(text: string): BoardImportParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalid-json' }
  }

  if (!isRecord(parsed)) return { ok: false, error: 'invalid-format' }
  if (parsed.version !== 1) return { ok: false, error: 'unsupported-version' }
  if (!isBoard(parsed.board)) return { ok: false, error: 'invalid-format' }
  return { ok: true, value: { version: 1, board: parsed.board } }
}

export function createImportedBoard(exported: WaypointExport, now: string, createId: () => string): Board {
  const id = createId()
  const cardIds = new Map<string, string>()
  const cards = exported.board.cards.map((card) => {
    const id = createId()
    cardIds.set(card.id, id)
    return { ...card, id }
  })
  const currentCardId = typeof exported.board.currentCardId === 'string'
    ? cardIds.get(exported.board.currentCardId)
    : exported.board.currentCardId

  return {
    ...exported.board,
    id,
    updatedAt: now,
    cards,
    currentCardId,
  }
}

export function boardExportFilename(title: string): string {
  const safeTitle = title
    .replace(/[\\/:*?"<>|\u0000-\u001F\u007F]/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ')
  return `waypoint-${safeTitle || 'board'}.json`
}
