import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Card, CardStatus } from '../domain/Board'
import { CARD_STATUSES, CARD_STATUS_LABELS } from '../domain/Board'
import { AutoResizeTextarea } from './AutoResizeTextarea'
import styles from './Pages.module.css'
import { allocateTextareaHeights } from './textareaHeight'

const MIN_TEXTAREA_HEIGHT = 76

type CardDetailDrawerProps = {
  card: Card
  onClose: () => void
  onChange: (field: 'title' | 'memo' | 'decision', value: string) => void
  onStatusChange: (status: CardStatus) => void
  onDelete: () => void
}

export function CardDetailDrawer({ card, onClose, onChange, onStatusChange, onDelete }: CardDetailDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null)
  const memoRef = useRef<HTMLTextAreaElement>(null)
  const decisionRef = useRef<HTMLTextAreaElement>(null)
  const [heights, setHeights] = useState([MIN_TEXTAREA_HEIGHT, MIN_TEXTAREA_HEIGHT])
  const manualHeights = useRef<number[] | null>(null)

  const recalculate = () => {
    const drawer = drawerRef.current
    const fields = [memoRef.current, decisionRef.current]
    if (!drawer || fields.some((field) => !field)) return
    const textareas = fields as HTMLTextAreaElement[]
    const currentTotal = textareas.reduce((total, textarea) => total + textarea.offsetHeight, 0)
    const fixedHeight = drawer.scrollHeight - currentTotal
    const availableHeight = Math.max(drawer.clientHeight - fixedHeight, MIN_TEXTAREA_HEIGHT * 2)
    const naturalHeights = textareas.map((textarea) => {
      const previousHeight = textarea.style.height
      textarea.style.height = 'auto'
      const naturalHeight = Math.max(textarea.scrollHeight, MIN_TEXTAREA_HEIGHT)
      textarea.style.height = previousHeight
      return naturalHeight
    })
    const automatic = allocateTextareaHeights({ availableHeight, naturalHeights, minimumHeight: MIN_TEXTAREA_HEIGHT })
    setHeights(manualHeights.current ?? automatic)
  }

  useLayoutEffect(() => {
    manualHeights.current = null
    recalculate()
  }, [card.id])

  useLayoutEffect(() => {
    recalculate()
  }, [card.memo, card.decision])

  useEffect(() => {
    const drawer = drawerRef.current
    window.addEventListener('resize', recalculate)
    if (!drawer || !('ResizeObserver' in window)) return () => window.removeEventListener('resize', recalculate)
    const observer = new ResizeObserver(recalculate)
    observer.observe(drawer)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', recalculate)
    }
  }, [])

  const setManualHeight = (index: number, height: number) => {
    const other = index === 0 ? 1 : 0
    const next = [...heights]
    next[index] = Math.max(height, MIN_TEXTAREA_HEIGHT)
    next[other] = Math.max(next[other], MIN_TEXTAREA_HEIGHT)
    manualHeights.current = next
    setHeights(next)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing) onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <aside ref={drawerRef} className={styles.drawer} aria-label="論点の詳細">
      <div className={styles.drawerHeader}>
        <h2>論点の詳細</h2>
        <button type="button" aria-label="詳細を閉じる" onClick={onClose}>閉じる</button>
      </div>
      <label htmlFor="card-title">タイトル</label>
      <input id="card-title" value={card.title} onChange={(event) => onChange('title', event.target.value)} />
      <label htmlFor="card-memo">自由メモ</label>
      <AutoResizeTextarea ref={memoRef} id="card-memo" height={heights[0]} onManualResize={(height) => setManualHeight(0, height)} value={card.memo} onChange={(event) => onChange('memo', event.target.value)} />
      <label htmlFor="card-decision">決定内容</label>
      <AutoResizeTextarea ref={decisionRef} id="card-decision" height={heights[1]} onManualResize={(height) => setManualHeight(1, height)} value={card.decision} onChange={(event) => onChange('decision', event.target.value)} />
      <label htmlFor="card-status">状態</label>
      <select id="card-status" value={card.status} onChange={(event) => onStatusChange(event.target.value as CardStatus)}>
        {CARD_STATUSES.map((status) => <option key={status} value={status}>{CARD_STATUS_LABELS[status]}</option>)}
      </select>
      <button type="button" className={styles.deleteButton} onClick={onDelete}>論点を削除</button>
    </aside>
  )
}
