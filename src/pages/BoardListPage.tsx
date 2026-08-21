import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CARD_STATUSES, CARD_STATUS_LABELS, type Board, type CardStatus } from '../domain/Board'
import { LocalStorageBoardRepository } from '../storage/LocalStorageBoardRepository'
import styles from './Pages.module.css'

const boardRepository = new LocalStorageBoardRepository()

function formatUpdatedAt(updatedAt: string): string {
  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return updatedAt

  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function countCardsByStatus(board: Board): Record<CardStatus, number> {
  const counts: Record<CardStatus, number> = { UNSORTED: 0, DISCUSSING: 0, ON_HOLD: 0, DECIDED: 0 }
  for (const card of board.cards) counts[card.status] += 1
  return counts
}

export function BoardListPage() {
  const navigate = useNavigate()
  const [boards, setBoards] = useState(() => boardRepository.findAll())
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameTitle, setRenameTitle] = useState('')
  const [menuBoardId, setMenuBoardId] = useState<string | null>(null)

  const refreshBoards = () => setBoards(boardRepository.findAll())

  const createBoard = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    const now = new Date().toISOString()
    const board: Board = { id: crypto.randomUUID(), title, createdAt: now, updatedAt: now, cards: [] }
    boardRepository.save(board)
    navigate(`/boards/${board.id}`)
  }

  const startRenaming = (board: Board) => {
    setRenamingId(board.id)
    setRenameTitle(board.title)
    setMenuBoardId(null)
  }

  const renameBoard = (event: FormEvent<HTMLFormElement>, board: Board) => {
    event.preventDefault()
    const title = renameTitle.trim()
    if (!title) return
    boardRepository.save({ ...board, title, updatedAt: new Date().toISOString() })
    refreshBoards()
    setRenamingId(null)
  }

  const deleteBoard = (board: Board) => {
    const confirmed = window.confirm(`「${board.title}」を削除しますか？\n保存されている論点カードもすべて削除されます。`)
    if (!confirmed) return
    boardRepository.delete(board.id)
    refreshBoards()
    setMenuBoardId(null)
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>ボード一覧</h1>
          <p>話し合いの現在地を確認・再開できます。</p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={() => setIsCreating(true)}>＋新しいボード</button>
      </header>

      {isCreating && (
        <form className={styles.form} onSubmit={createBoard}>
          <label htmlFor="new-board-title">ボード名</label>
          <input id="new-board-title" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} autoFocus />
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryButton}>作成</button>
            <button type="button" onClick={() => setIsCreating(false)}>キャンセル</button>
          </div>
        </form>
      )}

      {boards.length === 0 ? (
        <p className={styles.emptyState}>まだボードがありません。新しいボードを作成してください。</p>
      ) : (
        <section className={styles.boardGrid} aria-label="保存済みボード">
          {boards.map((board) => {
            const counts = countCardsByStatus(board)
            const isRenaming = renamingId === board.id
            const isMenuOpen = menuBoardId === board.id
            return (
              <article className={styles.boardCard} key={board.id}>
                <Link className={styles.boardLink} to={`/boards/${board.id}`} aria-label={`${board.title} を開く`}>
                  <h2>{board.title}</h2>
                  <dl className={styles.statusCounts}>
                    {CARD_STATUSES.map((status) => (
                      <div key={status}><dt>{CARD_STATUS_LABELS[status]}</dt><dd>{counts[status]}件</dd></div>
                    ))}
                  </dl>
                  <p className={styles.updatedAt}>最終更新: {formatUpdatedAt(board.updatedAt)}</p>
                </Link>

                <div className={styles.boardActions}>
                  <button type="button" aria-expanded={isMenuOpen} aria-label={`${board.title} の管理メニュー`} onClick={() => setMenuBoardId(isMenuOpen ? null : board.id)}>管理</button>
                  {isMenuOpen && (
                    <div className={styles.menu}>
                      <button type="button" onClick={() => startRenaming(board)}>名前変更</button>
                      <button type="button" onClick={() => deleteBoard(board)}>削除</button>
                    </div>
                  )}
                </div>

                {isRenaming && (
                  <form className={styles.form} onSubmit={(event) => renameBoard(event, board)}>
                    <label htmlFor={`rename-${board.id}`}>ボード名</label>
                    <input id={`rename-${board.id}`} value={renameTitle} onChange={(event) => setRenameTitle(event.target.value)} autoFocus />
                    <div className={styles.formActions}>
                      <button type="submit" className={styles.primaryButton}>保存</button>
                      <button type="button" onClick={() => setRenamingId(null)}>キャンセル</button>
                    </div>
                  </form>
                )}
              </article>
            )
          })}
        </section>
      )}
    </main>
  )
}
