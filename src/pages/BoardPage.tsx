import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CARD_STATUSES, CARD_STATUS_LABELS, countCardsByStatus, type Board, type Card, type CardStatus } from '../domain/Board'
import { cardsForStatus, moveCard } from '../domain/CardOrdering'
import { LocalStorageBoardRepository } from '../storage/LocalStorageBoardRepository'
import { downloadBoardExport } from './boardExportDownload'
import { BoardDnd } from './BoardDnd'
import { CardDetailDrawer } from './CardDetailDrawer'
import styles from './Pages.module.css'

const boardRepository = new LocalStorageBoardRepository()

function normalizeOrders(cards: Card[]): Card[] {
  return [...cards].sort((left, right) => left.order - right.order).map((card, order) => ({ ...card, order }))
}

export function BoardPage() {
  const { boardId } = useParams()
  const navigate = useNavigate()
  const [board, setBoard] = useState(() => boardId ? boardRepository.findById(boardId) : undefined)
  const [isAdding, setIsAdding] = useState(false)
  const [cardTitle, setCardTitle] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameTitle, setRenameTitle] = useState('')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  if (!board) {
    return <main className={styles.page}><h1>ボードが見つかりません</h1><Link to="/">ボード一覧へ戻る</Link></main>
  }

  const counts = countCardsByStatus(board)
  const selectedCard = board.cards.find((card) => card.id === selectedCardId)

  const saveBoard = (updatedBoard: Board) => {
    boardRepository.save(updatedBoard)
    setBoard(updatedBoard)
  }

  const addCard = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = cardTitle.trim()
    if (!title) return
    const unsortedCards = cardsForStatus(board.cards, 'UNSORTED')
    const order = unsortedCards.length === 0 ? 0 : Math.max(...unsortedCards.map((card) => card.order)) + 1
    const updatedBoard: Board = {
      ...board,
      updatedAt: new Date().toISOString(),
      cards: [...board.cards, { id: crypto.randomUUID(), title, memo: '', decision: '', status: 'UNSORTED', order }],
    }
    saveBoard(updatedBoard)
    setCardTitle('')
    setIsAdding(false)
  }

  const renameBoard = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = renameTitle.trim()
    if (!title) return
    const updatedBoard = { ...board, title, updatedAt: new Date().toISOString() }
    saveBoard(updatedBoard)
    setIsRenaming(false)
  }

  const deleteBoard = () => {
    if (!window.confirm(`「${board.title}」を削除しますか？\n保存されている論点カードもすべて削除されます。`)) return
    boardRepository.delete(board.id)
    navigate('/')
  }

  const updateCard = (field: 'title' | 'memo' | 'decision', value: string) => {
    if (!selectedCard) return
    saveBoard({
      ...board,
      updatedAt: new Date().toISOString(),
      cards: board.cards.map((card) => card.id === selectedCard.id ? { ...card, [field]: value } : card),
    })
  }

  const changeCardStatus = (status: CardStatus) => {
    if (!selectedCard || selectedCard.status === status) return
    const movedCards = moveCard(board.cards, selectedCard.id, status, cardsForStatus(board.cards, status).length)
    saveBoard({ ...board, updatedAt: new Date().toISOString(), cards: movedCards })
  }

  const moveCardByDnd = (cardId: string, status: CardStatus, targetIndex: number) => {
    const movedCards = moveCard(board.cards, cardId, status, targetIndex)
    if (movedCards === board.cards) return
    saveBoard({ ...board, updatedAt: new Date().toISOString(), cards: movedCards })
  }

  const deleteCard = () => {
    if (!selectedCard || !window.confirm(`「${selectedCard.title}」を削除しますか？`)) return
    const remainingInColumn = normalizeOrders(cardsForStatus(board.cards, selectedCard.status).filter((card) => card.id !== selectedCard.id))
    const replacements = new Map(remainingInColumn.map((card) => [card.id, card]))
    saveBoard({
      ...board,
      updatedAt: new Date().toISOString(),
      cards: board.cards.filter((card) => card.id !== selectedCard.id).map((card) => replacements.get(card.id) ?? card),
    })
    setSelectedCardId(null)
  }

  return (
    <main className={`${styles.page} ${styles.boardPage}`}>
      <header className={styles.boardHeader}>
        <Link to="/">← ボード一覧</Link>
        <div className={styles.boardTitle}><h1>{board.title}</h1></div>
        <dl className={styles.summaryCounts} aria-label="状態別件数">
          {CARD_STATUSES.map((status) => <div key={status}><dt>{CARD_STATUS_LABELS[status]}</dt><dd>{counts[status]}件</dd></div>)}
        </dl>
        <button type="button" className={styles.primaryButton} onClick={() => setIsAdding(true)}>＋論点</button>
        <div className={styles.headerActions}>
          <button type="button" aria-label="ボード管理メニュー" aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen(!isMenuOpen)}>管理</button>
          {isMenuOpen && <div className={styles.menu}>
            <button type="button" onClick={() => { setRenameTitle(board.title); setIsRenaming(true); setIsMenuOpen(false) }}>名前変更</button>
            <button type="button" onClick={() => { downloadBoardExport(board); setIsMenuOpen(false) }}>JSONエクスポート</button>
            <button type="button" onClick={deleteBoard}>削除</button>
          </div>}
        </div>
      </header>

      {isAdding && <form className={styles.form} onSubmit={addCard}>
        <label htmlFor="new-card-title">論点のタイトル</label>
        <input id="new-card-title" value={cardTitle} onChange={(event) => setCardTitle(event.target.value)} autoFocus />
        <div className={styles.formActions}>
          <button type="submit" className={styles.primaryButton}>追加</button>
          <button type="button" onClick={() => setIsAdding(false)}>キャンセル</button>
        </div>
      </form>}

      {isRenaming && <form className={styles.form} onSubmit={renameBoard}>
        <label htmlFor="board-title">ボード名</label>
        <input id="board-title" value={renameTitle} onChange={(event) => setRenameTitle(event.target.value)} autoFocus />
        <div className={styles.formActions}>
          <button type="submit" className={styles.primaryButton}>保存</button>
          <button type="button" onClick={() => setIsRenaming(false)}>キャンセル</button>
        </div>
      </form>}

      <BoardDnd cards={board.cards} onMove={moveCardByDnd} onSelect={(cardId) => setSelectedCardId((current) => current === cardId ? null : cardId)} />
      {selectedCard && <CardDetailDrawer card={selectedCard} onClose={() => setSelectedCardId(null)} onChange={updateCard} onStatusChange={changeCardStatus} onDelete={deleteCard} />}
    </main>
  )
}
