import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const EM_DASH = String.fromCharCode(0x2014)

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(tsx?|md|html|css)$/.test(name)) out.push(full)
  }
  return out
}

describe('interface texts', () => {
  it('contain no em dash in source files or README', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
    const files = [...walk(join(root, 'src')), join(root, 'README.md'), join(root, 'index.html')]
    const offenders = files.filter((f) => readFileSync(f, 'utf8').includes(EM_DASH))
    expect(offenders).toEqual([])
  })
})
