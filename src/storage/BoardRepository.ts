import type { Board } from '../domain/Board'

export interface BoardRepository {
  findAll(): Board[]
  findById(id: string): Board | undefined
  save(board: Board): void
  delete(id: string): void
}
