import { describe, expect, it } from 'vitest'
import type { Board } from './Board'
import { boardReportFilename, createBoardReport, serializeBoardHtml, serializeBoardMarkdown } from './BoardReport'

const board: Board = {
  id: 'b', title: '開発 <会議> & 合意',
  createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-21T01:00:00.000Z', currentCardId: 'current',
  cards: [
    { id: 'current', title: '後の論点', memo: '1行目\n2行目', decision: '', status: 'DISCUSSING', order: 5 },
    { id: 'first', title: '*先の論点*', memo: '<img src=x>', decision: '昔の決定', status: 'DISCUSSING', order: 1 },
    { id: 'hold', title: '保留', memo: '', decision: '', status: 'ON_HOLD', order: 0 },
    { id: 'yes', title: '確定', memo: '', decision: '実施', status: 'DECIDED', order: 0 },
    { id: 'blank', title: '決定欄空', memo: '', decision: '   ', status: 'DECIDED', order: 1 },
  ],
}
const at = '2026-10-23T05:00:00.000Z'

describe('BoardReport', () => {
  it('4状態・並び・現在の論点を読み取り専用で生成する', () => {
    const before = structuredClone(board)
    const report = createBoardReport(board, at)
    expect(report.sections.map((s) => s.status)).toEqual(['DECIDED', 'DISCUSSING', 'ON_HOLD', 'UNSORTED'])
    expect(report.sections[1].cards.map((c) => c.id)).toEqual(['first', 'current'])
    expect(report.counts).toEqual({ UNSORTED: 0, DISCUSSING: 2, ON_HOLD: 1, DECIDED: 2 })
    expect(report.currentCard?.id).toBe('current')
    serializeBoardMarkdown(board, at)
    serializeBoardHtml(board, at)
    expect(board).toEqual(before)
  })
  it('Markdownは未決から表示し決定も残す。過去の決定欄を誤って確定扱いしない', () => {
    const md = serializeBoardMarkdown(board, at)
    expect(md.indexOf('## 検討中')).toBeLessThan(md.indexOf('## 決定'))
    expect(md.indexOf('先の論点')).toBeLessThan(md.indexOf('後の論点'))
    expect(md).toContain('**決定欄の記載（未確定）**')
    expect(md).toContain('> 1行目\n> 2行目')
    expect(md).toContain('## 未整理（0件）\n\n該当なし')
    expect(md).toContain('**決定内容**\n\n未記入')
    expect(md).toContain('現在の論点：後の論点（検討中）')
    expect(md).toContain('\\*先の論点\\*')
  })
  it('HTMLは決定が先で、特殊文字をエスケープし、A4印刷用CSSを含む', () => {
    const html = serializeBoardHtml(board, at)
    expect(html.indexOf('section-decided')).toBeLessThan(html.indexOf('section-discussing'))
    expect(html).toContain('&lt;img src=x&gt;')
    expect(html).toContain('開発 &lt;会議&gt; &amp; 合意')
    expect(html).not.toContain('<img src=x>')
    const malicious = serializeBoardHtml({ ...board, cards: [{ ...board.cards[0], memo: '<script>alert(1)</script>' }] }, at)
    expect(malicious).toContain('&lt;script&gt;')
    expect(malicious).not.toContain('<script>')
    expect(html).toContain('white-space:pre-wrap')
    expect(html).toContain('@page{size:A4')
    expect(html).toContain('決定欄の記載（未確定）')
  })
  it('空ボードと古いcurrentCardIdでも情報を偽造しない', () => {
    const empty: Board = { ...board, cards: [], currentCardId: 'missing' }
    expect(serializeBoardMarkdown(empty, at).match(/該当なし/g)).toHaveLength(4)
    const html = serializeBoardHtml(empty, at)
    expect(html.match(/class="empty"/g)).toHaveLength(4)
    expect(html).not.toContain('<aside class="current">')
  })
  it('ファイル名はJSONで利用中の安全化規則を再利用する', () => {
    expect(boardReportFilename('会議/共有:', 'md')).toBe('waypoint-会議 共有.md')
    expect(boardReportFilename('..', 'html')).toBe('waypoint-board.html')
  })
})
