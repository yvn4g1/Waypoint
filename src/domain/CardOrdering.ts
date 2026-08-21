import type { Card, CardStatus } from './Board'

export function cardsForStatus(cards: Card[], status: CardStatus): Card[] {
  return cards.filter((card) => card.status === status).sort((left, right) => left.order - right.order)
}

function assignOrders(cards: Card[]): Card[] {
  return cards.map((card, order) => ({ ...card, order }))
}

export function moveCard(cards: Card[], cardId: string, targetStatus: CardStatus, targetIndex: number): Card[] {
  const movingCard = cards.find((card) => card.id === cardId)
  if (!movingCard) return cards

  const sourceCards = cardsForStatus(cards, movingCard.status)
  const sourceIndex = sourceCards.findIndex((card) => card.id === cardId)
  const destinationCards = movingCard.status === targetStatus
    ? sourceCards.filter((card) => card.id !== cardId)
    : cardsForStatus(cards, targetStatus)
  const insertionIndex = Math.max(0, Math.min(targetIndex, destinationCards.length))
  if (movingCard.status === targetStatus && insertionIndex === sourceIndex) return cards

  destinationCards.splice(insertionIndex, 0, { ...movingCard, status: targetStatus })
  const affectedCards = movingCard.status === targetStatus
    ? assignOrders(destinationCards)
    : [
        ...assignOrders(sourceCards.filter((card) => card.id !== cardId)),
        ...assignOrders(destinationCards),
      ]
  const replacements = new Map(affectedCards.map((card) => [card.id, card]))
  return cards.map((card) => replacements.get(card.id) ?? card)
}
