import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { CARD_STATUSES, CARD_STATUS_LABELS, type Card, type CardStatus } from '../domain/Board'
import { cardsForStatus } from '../domain/CardOrdering'
import styles from './Pages.module.css'

const cardDndId = (cardId: string) => `card:${cardId}`
const columnDndId = (status: CardStatus) => `column:${status}`

const preferCardCollision: CollisionDetection = (arguments_) => {
  const collisions = pointerWithin(arguments_)
  const cardCollisions = collisions.filter(({ id }) => arguments_.droppableContainers.find((container) => container.id === id)?.data.current?.type === 'card')
  return cardCollisions.length > 0 ? cardCollisions : collisions
}

function cardPreview(card: Card): string {
  if (card.status === 'DECIDED' && card.decision.trim()) return card.decision
  return card.memo
}

type SortableCardProps = {
  card: Card
  onSelect: (cardId: string) => void
}

function SortableCard({ card, onSelect }: SortableCardProps) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: cardDndId(card.id),
    data: { type: 'card', cardId: card.id, status: card.status },
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`${styles.card} ${isDragging ? styles.dragging : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => onSelect(card.id)}
      {...attributes}
      {...listeners}
    >
      <span className={styles.cardTitle}>{card.title}</span><span className={styles.cardPreview}>{cardPreview(card)}</span>
    </button>
  )
}

type BoardColumnProps = {
  cards: Card[]
  status: CardStatus
  onSelect: (cardId: string) => void
}

function BoardColumn({ cards, status, onSelect }: BoardColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: columnDndId(status), data: { type: 'column', status } })
  return (
    <section ref={setNodeRef} className={`${styles.boardColumn} ${isOver ? styles.columnOver : ''}`} data-status={status} aria-label={`${CARD_STATUS_LABELS[status]}の列`}>
      <h2>{CARD_STATUS_LABELS[status]}</h2>
      <SortableContext items={cards.map((card) => cardDndId(card.id))} strategy={verticalListSortingStrategy}>
        {cards.map((card) => <SortableCard key={card.id} card={card} onSelect={onSelect} />)}
      </SortableContext>
    </section>
  )
}

type BoardDndProps = {
  cards: Card[]
  onMove: (cardId: string, targetStatus: CardStatus, targetIndex: number) => void
  onSelect: (cardId: string) => void
}

export function BoardDnd({ cards, onMove, onSelect }: BoardDndProps) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const activeCard = cards.find((card) => card.id === activeCardId)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.data.current?.cardId as string | undefined ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCardId(null)
    const cardId = event.active.data.current?.cardId as string | undefined
    if (!cardId || !event.over) return
    const movingCard = cards.find((card) => card.id === cardId)
    if (!movingCard) return

    const overData = event.over.data.current
    const targetStatus = overData?.status as CardStatus | undefined
    if (!targetStatus) return
    const targetCards = cardsForStatus(cards, targetStatus)
    let targetIndex = targetCards.length

    if (overData?.type === 'card') {
      const overCardId = overData.cardId as string
      if (overCardId === cardId) return
      const overIndex = targetCards.findIndex((card) => card.id === overCardId)
      if (overIndex < 0) return
      const translated = event.active.rect.current.translated
      const isAfter = translated
        ? translated.top + translated.height / 2 > event.over.rect.top + event.over.rect.height / 2
        : false
      targetIndex = overIndex + (isAfter ? 1 : 0)
      if (movingCard.status === targetStatus) {
        const sourceIndex = targetCards.findIndex((card) => card.id === cardId)
        if (targetIndex > sourceIndex) targetIndex -= 1
      }
    } else if (movingCard.status === targetStatus) {
      targetIndex -= 1
    }

    onMove(cardId, targetStatus, Math.max(0, Math.min(targetIndex, targetCards.length)))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={preferCardCollision} onDragStart={handleDragStart} onDragCancel={() => setActiveCardId(null)} onDragEnd={handleDragEnd}>
      <div className={styles.boardColumns}>
        {CARD_STATUSES.map((status) => <BoardColumn key={status} status={status} cards={cardsForStatus(cards, status)} onSelect={onSelect} />)}
      </div>
      <DragOverlay>{activeCard && <div className={`${styles.card} ${styles.dragOverlay}`}><span className={styles.cardTitle}>{activeCard.title}</span></div>}</DragOverlay>
    </DndContext>
  )
}
