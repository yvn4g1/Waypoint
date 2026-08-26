import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Card } from '../domain/Board'
import { CardDetailDrawer, MIN_TEXTAREA_HEIGHT } from './CardDetailDrawer'

const firstCard: Card = { id: 'first', title: '最初のCard', memo: '', decision: '', status: 'UNSORTED', order: 0 }
const secondCard: Card = { ...firstCard, id: 'second', title: '次のCard' }

class ResizeObserverMock {
  static observers: ResizeObserverMock[] = []
  readonly elements = new Set<Element>()

  constructor(private readonly callback: ResizeObserverCallback) {
    ResizeObserverMock.observers.push(this)
  }

  observe(element: Element) { this.elements.add(element) }
  disconnect() { this.elements.clear() }
  unobserve(element: Element) { this.elements.delete(element) }

  static trigger(element: Element) {
    for (const observer of ResizeObserverMock.observers) {
      if (observer.elements.has(element)) observer.callback([], observer as unknown as ResizeObserver)
    }
  }
}

function DrawerHarness({ card = firstCard }: { card?: Card }) {
  const [currentCard, setCurrentCard] = useState(card)
  return <>
    <button type="button" onClick={() => setCurrentCard(secondCard)}>別Cardへ切替</button>
    <CardDetailDrawer card={currentCard} side="right" onClose={vi.fn()} onChange={(field, value) => setCurrentCard((current) => ({ ...current, [field]: value }))} onStatusChange={vi.fn()} onDelete={vi.fn()} />
  </>
}

describe('CardDetailDrawer textarea sizing', () => {
  afterEach(() => {
    ResizeObserverMock.observers = []
    vi.unstubAllGlobals()
  })

  it('starts empty and one-line fields at a compact single-line height', () => {
    render(<DrawerHarness />)
    const memo = screen.getByLabelText('自由メモ')
    const decision = screen.getByLabelText('決定内容')
    expect(memo).toHaveAttribute('rows', '1')
    expect(memo).toHaveStyle({ height: `${MIN_TEXTAREA_HEIGHT}px` })
    expect(decision).toHaveStyle({ height: `${MIN_TEXTAREA_HEIGHT}px` })
  })

  it('keeps each manually resized textarea height while editing, then resets it for another Card', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    const rendered = render(<DrawerHarness />)
    const memo = screen.getByLabelText('自由メモ') as HTMLTextAreaElement
    Object.defineProperty(memo, 'offsetHeight', { configurable: true, get: () => 180 })
    memo.style.height = '180px'
    act(() => ResizeObserverMock.trigger(memo))

    fireEvent.change(memo, { target: { value: '編集したメモ' } })
    expect(memo).toHaveStyle({ height: '180px' })
    expect(screen.getByLabelText('決定内容')).toHaveStyle({ height: `${MIN_TEXTAREA_HEIGHT}px` })

    fireEvent.click(screen.getByRole('button', { name: '別Cardへ切替' }))
    expect(screen.getByLabelText('自由メモ')).toHaveStyle({ height: `${MIN_TEXTAREA_HEIGHT}px` })

    rendered.unmount()
    render(<DrawerHarness />)
    expect(screen.getByLabelText('自由メモ')).toHaveStyle({ height: `${MIN_TEXTAREA_HEIGHT}px` })
  })
})
