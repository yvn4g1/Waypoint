import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { LocalStorageBoardRepository } from './storage/LocalStorageBoardRepository'

const repository = new LocalStorageBoardRepository(localStorage)

beforeEach(() => localStorage.clear())

describe('App routing', () => {
  it('ボード一覧を / で表示する', () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(screen.getByText('ボード一覧')).toBeInTheDocument()
  })

  it('ボード画面を /boards/:boardId で表示する', () => {
    repository.save({ id: 'board-1', title: 'ボード画面', createdAt: '2026-08-21T00:00:00.000Z', updatedAt: '2026-08-21T00:00:00.000Z', cards: [] })
    render(<MemoryRouter initialEntries={['/boards/board-1']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'ボード画面' })).toBeInTheDocument()
  })
})
