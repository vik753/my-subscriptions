import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router'

/** A new screen starts at the top; the declarative router has no built-in scroll restoration. */
export function ScrollToTop() {
  const { pathname } = useLocation()
  // Block body: Chromium's scrollTo returns a promise, which React would take for a cleanup function.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
