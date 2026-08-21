import type { Card, CardStatus } from '../domain/Board'
import { CARD_STATUSES, CARD_STATUS_LABELS } from '../domain/Board'
import { AutoResizeTextarea } from './AutoResizeTextarea'
import styles from './Pages.module.css'

type CardDetailDrawerProps = {
  card: Card
  onClose: () => void
  onChange: (field: 'title' | 'memo' | 'decision', value: string) => void
  onStatusChange: (status: CardStatus) => void
  onDelete: () => void
}

export function CardDetailDrawer({ card, onClose, onChange, onStatusChange, onDelete }: CardDetailDrawerProps) {
  return (
    <aside className={styles.drawer} aria-label="論点の詳細">
      <div className={styles.drawerHeader}>
        <h2>論点の詳細</h2>
        <button type="button" aria-label="詳細を閉じる" onClick={onClose}>閉じる</button>
      </div>
      <label htmlFor="card-title">タイトル</label>
      <input id="card-title" value={card.title} onChange={(event) => onChange('title', event.target.value)} />
      <label htmlFor="card-memo">自由メモ</label>
      <AutoResizeTextarea id="card-memo" value={card.memo} onChange={(event) => onChange('memo', event.target.value)} />
      <label htmlFor="card-decision">決定内容</label>
      <AutoResizeTextarea id="card-decision" value={card.decision} onChange={(event) => onChange('decision', event.target.value)} />
      <label htmlFor="card-status">状態</label>
      <select id="card-status" value={card.status} onChange={(event) => onStatusChange(event.target.value as CardStatus)}>
        {CARD_STATUSES.map((status) => <option key={status} value={status}>{CARD_STATUS_LABELS[status]}</option>)}
      </select>
      <button type="button" className={styles.deleteButton} onClick={onDelete}>論点を削除</button>
    </aside>
  )
}
