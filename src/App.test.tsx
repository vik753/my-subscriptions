import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'
import type * as StorageModule from './store/persistence/storage'

vi.mock('./store/persistence/storage', async (importOriginal) => {
  const mod = await importOriginal<typeof StorageModule>()
  return {
    ...mod,
    createIdbStorage: () => mod.createMemoryStorage(),
    createIdbMeta: () => mod.createMemoryMeta(),
  }
})

describe('App', () => {
  it('opens straight into the local app — no Google sign-in needed', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Subscriptions')
    expect(screen.getByRole('button', { name: 'Add hobby' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign in with Google' })).toBeNull()
  })
})
