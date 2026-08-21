import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App routing', () => {
  it('ボード一覧を / で表示する', () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(screen.getByText('ボード一覧')).toBeInTheDocument()
  })

  it('ボード画面を /boards/:boardId で表示する', () => {
    render(<MemoryRouter initialEntries={['/boards/board-1']}><App /></MemoryRouter>)
    expect(screen.getByText('ボード: board-1')).toBeInTheDocument()
  })
})
