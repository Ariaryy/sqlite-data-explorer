declare module "bun:sqlite" {
  export class Database {
    constructor(path: string, options?: { readonly?: boolean })
    exec(sql: string): void
    prepare(sql: string): {
      all(...params: unknown[]): Record<string, unknown>[]
      get(...params: unknown[]): Record<string, unknown> | undefined
      iterate(...params: unknown[]): Iterable<Record<string, unknown>>
      run(...params: unknown[]): unknown
      columnNames: string[]
    }
    close(): void
  }
}
