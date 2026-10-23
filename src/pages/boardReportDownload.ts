import type { Board } from '../domain/Board'
import { boardReportFilename, serializeBoardHtml, serializeBoardMarkdown } from '../domain/BoardReport'
import { downloadTextFile } from './boardExportDownload'

export function downloadBoardMarkdown(board: Board): void {
  downloadTextFile(serializeBoardMarkdown(board, new Date().toISOString()), 'text/markdown;charset=utf-8', boardReportFilename(board.title, 'md'))
}

export function downloadBoardHtml(board: Board): void {
  downloadTextFile(serializeBoardHtml(board, new Date().toISOString()), 'text/html;charset=utf-8', boardReportFilename(board.title, 'html'))
}

export function openBoardPrintDialog(board: Board): boolean {
  const target = window.open('', '_blank')
  if (!target) return false
  target.opener = null
  target.document.write(serializeBoardHtml(board, new Date().toISOString()))
  target.document.close()
  target.focus()
  target.print()
  return true
}
