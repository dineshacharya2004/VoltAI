// Mulberry32-based deterministic RNG for reproducible simulation outputs.
export function createSeededRng(seed: number) {
  let state = seed >>> 0

  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0
      let t = Math.imul(state ^ (state >>> 15), 1 | state)
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
    nextInt(min: number, max: number) {
      const value = this.next()
      return Math.floor(value * (max - min + 1)) + min
    },
    nextInRange(min: number, max: number) {
      return this.next() * (max - min) + min
    },
    pick<T>(items: T[]) {
      return items[this.nextInt(0, items.length - 1)]
    },
  }
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function createTraceId(seed: number, scenario: string, months: number) {
  return `trace-${scenario}-${months}m-${seed}`
}
