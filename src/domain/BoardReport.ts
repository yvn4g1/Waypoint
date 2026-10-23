import { CARD_STATUS_LABELS, countCardsByStatus, type Board, type Card, type CardStatus } from './Board'
import { boardExportFilename } from './BoardExport'
import { cardsForStatus } from './CardOrdering'

const pending: CardStatus[] = ['DISCUSSING', 'ON_HOLD', 'UNSORTED']
const visual: CardStatus[] = ['DECIDED', ...pending]
export type ReportSection = { status: CardStatus; label: string; cards: Card[] }
export type BoardReport = { title: string; updatedAt: string; exportedAt: string; currentCard?: Card; counts: Record<CardStatus, number>; sections: ReportSection[] }

export function createBoardReport(board: Board, exportedAt: string): BoardReport {
  return {
    title: board.title, updatedAt: board.updatedAt, exportedAt,
    currentCard: board.cards.find((c) => c.id === board.currentCardId),
    counts: countCardsByStatus(board),
    sections: visual.map((status) => ({ status, label: CARD_STATUS_LABELS[status], cards: cardsForStatus(board.cards, status) })),
  }
}

export function boardReportFilename(title: string, extension: 'md' | 'html'): string {
  return boardExportFilename(title).replace(/\.json$/, '.' + extension)
}

function dateText(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
function mdEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/([\x60*_{}\[\]()#+\-.!>|<>])/g, '\\$1')
}
function mdTitle(s: string): string { return mdEscape(s.replace(/\r\n?|\n/g, ' ')) }
function mdQuote(s: string): string {
  return s.replace(/\r\n?/g, '\n').split('\n').map((line) => '> ' + mdEscape(line)).join('\n')
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function serializeBoardMarkdown(board: Board, exportedAt: string): string {
  const report = createBoardReport(board, exportedAt)
  const lines = [
    '# ' + mdTitle(report.title), '',
    '> Waypointの議論状況（出力時点のスナップショット）。会議の時系列議事録ではありません。', '',
    '出力日時：' + dateText(report.exportedAt) + '  ',
    '最終更新：' + dateText(report.updatedAt), '',
    '決定 ' + report.counts.DECIDED + '件 / 検討中 ' + report.counts.DISCUSSING + '件 / 保留 ' + report.counts.ON_HOLD + '件 / 未整理 ' + report.counts.UNSORTED + '件', '',
  ]
  if (report.currentCard) lines.push('現在の論点：' + mdTitle(report.currentCard.title) + '（' + CARD_STATUS_LABELS[report.currentCard.status] + '）', '')
  for (const status of [...pending, 'DECIDED' as const]) {
    const section = report.sections.find((s) => s.status === status)!
    lines.push('## ' + section.label + '（' + section.cards.length + '件）', '')
    if (section.cards.length === 0) { lines.push('該当なし', ''); continue }
    section.cards.forEach((card, index) => {
      lines.push('### ' + (index + 1) + '. ' + mdTitle(card.title), '')
      if (card.memo.trim()) lines.push('**自由メモ**', '', mdQuote(card.memo), '')
      if (status === 'DECIDED') lines.push('**決定内容**', '', card.decision.trim() ? mdQuote(card.decision) : '未記入', '')
      else if (card.decision.trim()) lines.push('**決定欄の記載（未確定）**', '', mdQuote(card.decision), '')
    })
  }
  return lines.join('\n').trimEnd() + '\n'
}

function htmlDetail(label: string, content: string, flag = ''): string {
  return '<div class="detail ' + flag + '"><span class="detail-label">' + label + '</span><p>' + escapeHtml(content) + '</p></div>'
}
function htmlSection(section: ReportSection, currentCardId?: string): string {
  const entries = section.cards.map((c, i) => {
    const decision = c.status === 'DECIDED'
      ? htmlDetail('決定内容', c.decision.trim() ? c.decision : '未記入', c.decision.trim() ? '' : 'incomplete')
      : c.decision.trim() ? htmlDetail('決定欄の記載（未確定）', c.decision, 'tentative') : ''
    return '<article class="topic"><div class="topic-heading"><span class="number">' + String(i + 1).padStart(2, '0') +
      '</span><h3>' + escapeHtml(c.title) + '</h3>' + (c.id === currentCardId ? '<span class="current-tag">現在の論点</span>' : '') +
      '</div>' + decision + (c.memo.trim() ? htmlDetail('自由メモ', c.memo) : '') + '</article>'
  }).join('\n')
  return '<section class="section section-' + section.status.toLowerCase() + '"><div class="section-heading"><h2>' +
    section.label + '</h2><span>' + section.cards.length + '件</span></div>' +
    (entries || '<p class="empty">該当なし</p>') + '</section>'
}

const style = [
  ':root{font:14px system-ui,-apple-system,"Segoe UI",sans-serif;color:#1d2939;background:#f5f7fb}',
  '*{box-sizing:border-box}body{margin:0;padding:30px 16px}',
  '.sheet{max-width:860px;margin:auto;padding:40px 46px;background:#fff;border:1px solid #d0d5dd;border-radius:12px;box-shadow:0 8px 24px #10284012}',
  '.brand{font-size:20px;font-weight:750}.mark{display:inline-grid;place-items:center;background:#155eef;color:white;width:31px;height:31px;border-radius:7px;margin-right:8px}',
  '.eyebrow{color:#667085;font-size:11px;letter-spacing:.16em;font-weight:700;margin-top:27px}.title{font-size:27px;margin:7px 0;overflow-wrap:anywhere}',
  '.description,.dates,.footer{font-size:12px;color:#667085;line-height:1.7}.dates{margin:14px 0 24px}',
  '.current{padding:11px 14px;background:#fffcf5;border:1px solid #e5b85c;border-radius:8px;margin:0 0 22px;overflow-wrap:anywhere}.current strong{color:#7a5d00;margin-right:8px}',
  '.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:25px 0 30px}',
  '.metric{border:1px solid #d0d5dd;border-top:4px solid #98a2b3;border-radius:8px;padding:10px 14px}',
  '.metric.decided{border-top-color:#74c69d}.metric.discussing{border-top-color:#84adff}.metric.on_hold{border-top-color:#e5b85c}',
  '.metric span{font-size:12px;color:#667085}.metric strong{display:block;font-size:25px;margin-top:4px}',
  '.section{margin-top:28px}.section-heading{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #d0d5dd;margin-bottom:12px;padding-bottom:10px}',
  '.section-heading h2{font-size:18px;border-left:4px solid #98a2b3;padding-left:10px;margin:0}.section-heading span{font-size:12px;color:#667085}',
  '.section-decided h2{border-color:#74c69d}.section-discussing h2{border-color:#84adff}.section-on_hold h2{border-color:#e5b85c}',
  '.topic{border:1px solid #d0d5dd;border-radius:8px;margin:10px 0;padding:14px 16px;break-inside:avoid-page;overflow-wrap:anywhere}',
  '.topic-heading{display:flex;gap:9px;align-items:baseline;flex-wrap:wrap}.number{font-size:12px;color:#98a2b3}.topic h3{font-size:15px;line-height:1.5;margin:0;flex:1;min-width:50%}',
  '.current-tag{font-size:11px;padding:2px 7px;background:#fffaeb;color:#7a5d00;border:1px solid #e5b85c;border-radius:14px;white-space:nowrap}',
  '.detail{margin:10px 0 0 25px}.detail-label{font-size:11px;font-weight:750;color:#667085}',
  '.detail p{margin:4px 0 0;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}.detail.incomplete p,.detail.tentative .detail-label{color:#946200}',
  '.empty{color:#98a2b3}.footer{display:flex;justify-content:space-between;gap:10px;margin-top:32px;padding-top:12px;border-top:1px solid #d0d5dd}',
  '@page{size:A4;margin:15mm 14mm}',
  '@media print{:root{background:#fff;print-color-adjust:exact;-webkit-print-color-adjust:exact}body{padding:0}.sheet{border:0;border-radius:0;box-shadow:none;max-width:none;padding:0}.section-heading{break-after:avoid}.topic{break-inside:avoid-page}}',
  '@media(max-width:600px){body{padding:0}.sheet{padding:24px 18px;border:0;border-radius:0}.summary{grid-template-columns:repeat(2,minmax(0,1fr))}.footer{flex-direction:column}}',
].join('\n')

export function serializeBoardHtml(board: Board, exportedAt: string): string {
  const report = createBoardReport(board, exportedAt)
  const metrics = (['DECIDED', 'DISCUSSING', 'ON_HOLD', 'UNSORTED'] as const).map((status) =>
    '<div class="metric ' + status.toLowerCase() + '"><span>' + CARD_STATUS_LABELS[status] + '</span><strong>' + report.counts[status] + '</strong></div>'
  ).join('')
  const current = report.currentCard
    ? '<aside class="current"><strong>現在の論点</strong>' + escapeHtml(report.currentCard.title) + '（' + CARD_STATUS_LABELS[report.currentCard.status] + '）</aside>'
    : ''
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">' +
    '<title>' + escapeHtml(report.title) + ' | Waypoint Report</title><style>' + style + '</style></head><body><main class="sheet">' +
    '<header><div class="brand"><span class="mark">W</span> Waypoint</div><div class="eyebrow">DISCUSSION REPORT / BOARD SNAPSHOT</div>' +
    '<h1 class="title">' + escapeHtml(report.title) + '</h1>' +
    '<p class="description">出力時点の議論状況を整理したスナップショットです。会議の時系列議事録ではありません。</p>' +
    '<p class="dates">出力日時：' + escapeHtml(dateText(report.exportedAt)) + ' ／ 最終更新：' + escapeHtml(dateText(report.updatedAt)) + '</p></header>' +
    current + '<div class="summary" aria-label="状態別件数">' + metrics + '</div>' +
    report.sections.map((section) => htmlSection(section, report.currentCard?.id)).join('\n') +
    '<footer class="footer"><span>Waypoint / Discussion Report</span><span>出力時点のボードの状態です。</span></footer></main></body></html>\n'
}
