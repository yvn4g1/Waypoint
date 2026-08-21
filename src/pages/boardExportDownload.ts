import type { Board } from '../domain/Board'
import { boardExportFilename, serializeBoardExport } from '../domain/BoardExport'

export function downloadBoardExport(board: Board): void {
  const blob = new Blob([serializeBoardExport(board)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = boardExportFilename(board.title)
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
