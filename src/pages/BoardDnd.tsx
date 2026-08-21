import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState, type ReactNode } from 'react'
import { CARD_STATUSES, CARD_STATUS_LABELS, type Card, type CardStatus } from '../domain/Board'
import { cardsForStatus } from '../domain/CardOrdering'
import styles from './Pages.module.css'

const columnCardDndId = (cardId: string) => `column-card:${cardId}`
const currentCardDndId = (cardId: string) => `current-card:${cardId}`
const columnDndId = (status: CardStatus) => `column:${status}`
const currentSlotDndId = 'current-slot'

export type BoardDragSource = 'column' | 'current'

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
  isCurrent: boolean
  onSelect: (cardId: string) => void
}

function SortableCard({ card, isCurrent, onSelect }: SortableCardProps) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: columnCardDndId(card.id),
    data: { type: 'card', cardId: card.id, status: card.status, source: 'column' satisfies BoardDragSource },
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
      <span className={styles.cardHeading}><span className={styles.cardTitle}>{card.title}</span>{isCurrent && <span className={styles.currentBadge}>現在</span>}</span>
      <span className={styles.cardPreview}>{cardPreview(card)}</span>
    </button>
  )
}

type BoardColumnProps = {
  cards: Card[]
  currentCardId?: string | null
  status: CardStatus
  onSelect: (cardId: string) => void
}

function BoardColumn({ cards, currentCardId, status, onSelect }: BoardColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: columnDndId(status), data: { type: 'column', status } })
  return (
    <section ref={setNodeRef} className={`${styles.boardColumn} ${isOver ? styles.columnOver : ''}`} data-status={status} aria-label={`${CARD_STATUS_LABELS[status]}の列`}>
      <h2>{CARD_STATUS_LABELS[status]}</h2>
      <SortableContext items={cards.map((card) => columnCardDndId(card.id))} strategy={verticalListSortingStrategy}>
        {cards.map((card) => <SortableCard key={card.id} card={card} isCurrent={card.id === currentCardId} onSelect={onSelect} />)}
      </SortableContext>
    </section>
  )
}

type CurrentTopicProps = {
  card?: Card
  onClear: () => void
  onSelect: (cardId: string) => void
}

function CurrentTopic({ card, onClear, onSelect }: CurrentTopicProps) {
  const { isOver, setNodeRef: setDroppableRef } = useDroppable({ id: currentSlotDndId, data: { type: 'current-slot' } })
  const { attributes, isDragging, listeners, setNodeRef: setDraggableRef, transform } = useDraggable({
    id: currentCardDndId(card?.id ?? 'none'),
    data: card ? { type: 'current-card', cardId: card.id, source: 'current' satisfies BoardDragSource } : undefined,
    disabled: !card,
  })

  return (
    <section ref={setDroppableRef} className={`${styles.currentTopic} ${isOver ? styles.currentTopicOver : ''}`} aria-label="現在の論点">
      <span className={styles.currentTopicLabel}>現在の論点</span>
      {card ? <div className={styles.currentTopicContent}>
        <button
          ref={setDraggableRef}
          type="button"
          className={`${styles.currentTopicTitle} ${isDragging ? styles.dragging : ''}`}
          style={{ transform: CSS.Transform.toString(transform) }}
          onClick={() => onSelect(card.id)}
          {...attributes}
          {...listeners}
        >
          {card.title}
        </button>
        <button type="button" className={styles.currentTopicClear} onClick={onClear}>解除</button>
      </div> : <span className={styles.currentTopicEmpty}>ここに論点をドラッグ</span>}
    </section>
  )
}

type BoardDndProps = {
  cards: Card[]
  currentCardId?: string | null
  onClearCurrent: () => void
  onMove: (cardId: string, targetStatus: CardStatus, targetIndex: number, source: BoardDragSource) => void
  onSelect: (cardId: string) => void
  onSetCurrent: (cardId: string) => void
  onDragStart?: (cardId: string) => void
  renderHeader: (currentTopic: ReactNode) => ReactNode
}

export function BoardDnd({ cards, currentCardId, onClearCurrent, onMove, onSelect, onSetCurrent, onDragStart, renderHeader }: BoardDndProps) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const activeCard = cards.find((card) => card.id === activeCardId)
  const currentCard = cards.find((card) => card.id === currentCardId)

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = event.active.data.current?.cardId as string | undefined
    setActiveCardId(cardId ?? null)
    if (cardId) onDragStart?.(cardId)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCardId(null)
    const cardId = event.active.data.current?.cardId as string | undefined
    const source = event.active.data.current?.source as BoardDragSource | undefined
    if (!cardId || !event.over) return
    const movingCard = cards.find((card) => card.id === cardId)
    if (!movingCard || !source) return

    const overData = event.over.data.current
    if (overData?.type === 'current-slot') {
      if (source === 'column') onSetCurrent(cardId)
      return
    }
    const targetStatus = overData?.status as CardStatus | undefined
    if (!targetStatus) return
    const targetCards = cardsForStatus(cards, targetStatus)
    let targetIndex = targetCards.length

    if (overData?.type === 'card') {
      const overCardId = overData.cardId as string
      const overIndex = targetCards.findIndex((card) => card.id === overCardId)
      if (overIndex < 0) return
      if (overCardId === cardId && source === 'column') return
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

    onMove(cardId, targetStatus, Math.max(0, Math.min(targetIndex, targetCards.length)), source)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={preferCardCollision} onDragStart={handleDragStart} onDragCancel={() => setActiveCardId(null)} onDragEnd={handleDragEnd}>
      {renderHeader(<CurrentTopic card={currentCard} onClear={onClearCurrent} onSelect={onSelect} />)}
      <div className={styles.boardColumns}>
        {CARD_STATUSES.map((status) => <BoardColumn key={status} status={status} cards={cardsForStatus(cards, status)} currentCardId={currentCard?.id} onSelect={onSelect} />)}
      </div>
      <DragOverlay>{activeCard && <div className={`${styles.card} ${styles.dragOverlay}`}><span className={styles.cardTitle}>{activeCard.title}</span></div>}</DragOverlay>
    </DndContext>
  )
}
