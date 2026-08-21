import { CARD_STATUSES, type Board, type WaypointData } from '../domain/Board'
import type { BoardRepository } from './BoardRepository'

export const WAYPOINT_STORAGE_KEY = 'waypoint:mvp-data'

/**
 * LocalStorage の内容が壊れている・旧版/未知の形式である場合は、
 * 既存値を上書きせず空のデータとして扱う。これによりアプリの起動を優先する。
 */
function readWaypointData(storage: Storage): WaypointData {
  const raw = storage.getItem(WAYPOINT_STORAGE_KEY)
  if (!raw) return { version: 1, boards: [] }

  try {
    const parsed: unknown = JSON.parse(raw)
    return isWaypointData(parsed) ? parsed : { version: 1, boards: [] }
  } catch {
    return { version: 1, boards: [] }
  }
}

function isWaypointData(value: unknown): value is WaypointData {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.boards)) return false
  return value.boards.every(isBoard)
}

function isBoard(value: unknown): value is Board {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && Array.isArray(value.cards)
    && value.cards.every(isCard)
}

function isCard(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.memo === 'string'
    && typeof value.decision === 'string'
    && typeof value.status === 'string'
    && CARD_STATUSES.includes(value.status as (typeof CARD_STATUSES)[number])
    && typeof value.order === 'number'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export class LocalStorageBoardRepository implements BoardRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  findAll(): Board[] {
    return readWaypointData(this.storage).boards
  }

  findById(id: string): Board | undefined {
    return this.findAll().find((board) => board.id === id)
  }

  save(board: Board): void {
    const data = readWaypointData(this.storage)
    const index = data.boards.findIndex((existing) => existing.id === board.id)
    const boards = index === -1
      ? [...data.boards, board]
      : data.boards.map((existing) => (existing.id === board.id ? board : existing))
    this.write({ version: 1, boards })
  }

  delete(id: string): void {
    const data = readWaypointData(this.storage)
    this.write({ version: 1, boards: data.boards.filter((board) => board.id !== id) })
  }

  private write(data: WaypointData): void {
    this.storage.setItem(WAYPOINT_STORAGE_KEY, JSON.stringify(data))
  }
}
