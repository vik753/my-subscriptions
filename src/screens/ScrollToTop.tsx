import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router'

/** A new screen starts at the top; the declarative router has no built-in scroll restoration. */
export function ScrollToTop() {
  const { pathname } = useLocation()
  useLayoutEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}
