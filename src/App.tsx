import { Route, Routes } from 'react-router-dom'
import { BoardListPage } from './pages/BoardListPage'
import { BoardPage } from './pages/BoardPage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<BoardListPage />} />
      <Route path="/boards/:boardId" element={<BoardPage />} />
    </Routes>
  )
}
