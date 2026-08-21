export const CARD_STATUSES = ['UNSORTED', 'DISCUSSING', 'ON_HOLD', 'DECIDED'] as const

export type CardStatus = (typeof CARD_STATUSES)[number]

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  UNSORTED: '未整理',
  DISCUSSING: '検討中',
  ON_HOLD: '保留',
  DECIDED: '決定',
}

export type Card = {
  id: string
  title: string
  memo: string
  decision: string
  status: CardStatus
  order: number
}

export type Board = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  cards: Card[]
}

export type WaypointData = {
  version: 1
  boards: Board[]
}
