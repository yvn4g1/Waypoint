import type { Board } from '../domain/Board'
import { boardExportFilename, serializeBoardExport } from '../domain/BoardExport'

export function downloadTextFile(text: string, mime: string, filename: string): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.append(anchor)
    try { anchor.click() } finally { anchor.remove() }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function downloadBoardExport(board: Board): void {
  downloadTextFile(serializeBoardExport(board), 'application/json;charset=utf-8', boardExportFilename(board.title))
}
