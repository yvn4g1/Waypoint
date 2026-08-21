import { useParams } from 'react-router-dom'
import styles from './Pages.module.css'

export function BoardPage() {
  const { boardId } = useParams()
  return <main className={styles.page}>ボード: {boardId}</main>
}
