import seedrandom from 'seedrandom'

/** Small deterministic random helper built on seedrandom. */
export class Rng {
  private readonly rng: seedrandom.PRNG

  constructor(seed: string) {
    this.rng = seedrandom(seed)
  }

  /** Uniform in [0, 1). */
  next(): number {
    return this.rng()
  }

  float(min: number, max: number): number {
    return min + (max - min) * this.rng()
  }

  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1))
  }

  bool(probability = 0.5): boolean {
    return this.rng() < probability
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.rng() * items.length)]
  }

  /** Picks an index according to weights (not necessarily normalized). */
  weightedIndex(weights: readonly number[]): number {
    const total = weights.reduce((a, b) => a + b, 0)
    let r = this.rng() * total
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i]
      if (r < 0) return i
    }
    return weights.length - 1
  }

  weighted<T extends string>(weights: Record<T, number>): T {
    const keys = Object.keys(weights) as T[]
    return keys[this.weightedIndex(keys.map((k) => weights[k]))]
  }

  /** Approximate normal distribution (sum of uniforms). */
  gaussian(mean = 0, stdDev = 1): number {
    let sum = 0
    for (let i = 0; i < 6; i++) sum += this.rng()
    return mean + ((sum - 3) / Math.sqrt(0.5)) * stdDev
  }

  shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
}

export function childSeed(seed: string, ...parts: Array<string | number>): string {
  return [seed, ...parts].join(':')
}
