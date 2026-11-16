import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())

// jsdom lacks these browser APIs used by Recharts / framer-motion
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserverStub

class IntersectionObserverStub {
  constructor(cb) {
    this.cb = cb
  }
  observe(el) {
    this.cb([{ isIntersecting: true, target: el, intersectionRatio: 1 }])
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
globalThis.IntersectionObserver = globalThis.IntersectionObserver || IntersectionObserverStub
window.scrollTo = () => {}
