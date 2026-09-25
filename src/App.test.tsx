import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'
import type * as StorageModule from './store/persistence/storage'

vi.mock('./store/persistence/storage', async (importOriginal) => {
  const mod = await importOriginal<typeof StorageModule>()
  return { ...mod, createIdbStorage: () => mod.createMemoryStorage() }
})

describe('App', () => {
  it('renders the app name as the page heading once data is loaded', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('My Subscriptions')
  })
})
