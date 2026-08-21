import { CARD_STATUSES, type Board, type Card } from './Board'

export function isBoard(value: unknown): value is Board {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && Array.isArray(value.cards)
    && value.cards.every(isCard)
}

export function isCard(value: unknown): value is Card {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.memo === 'string'
    && typeof value.decision === 'string'
    && typeof value.status === 'string'
    && CARD_STATUSES.includes(value.status as Card['status'])
    && typeof value.order === 'number'
    && Number.isFinite(value.order)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
