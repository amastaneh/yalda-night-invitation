import { DatabaseSync } from 'node:sqlite';
// SQLite-backed D1 contract adapter. Browser tests separately exercise Wrangler's real local D1.
export function database() {
  const sqlite = new DatabaseSync(':memory:');
  class Statement {
    constructor(
      private sql: string,
      private values: (string | number | null)[] = [],
    ) {}
    bind(...values: (string | number | null)[]) {
      return new Statement(this.sql, values);
    }
    async first<T>(column?: string) {
      const row = sqlite.prepare(this.sql).get(...this.values);
      return (column ? row?.[column] : row || null) as T;
    }
    async all() {
      const results = sqlite.prepare(this.sql).all(...this.values);
      const changes = Number(sqlite.prepare('SELECT changes() n').get()!.n);
      return {
        results,
        success: true,
        meta: {
          changes,
          duration: 0,
          last_row_id: 0,
          changed_db: changes > 0,
          size_after: 0,
          rows_read: results.length,
          rows_written: changes,
        },
      };
    }
    async run() {
      const result = sqlite.prepare(this.sql).run(...this.values);
      return { results: [], success: true, meta: { changes: Number(result.changes) } };
    }
    async raw() {
      return (await this.all()).results.map((r) => Object.values(r));
    }
  }
  const d1 = {
    prepare: (sql: string) => new Statement(sql),
    async batch(statements: Statement[]) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const s of statements) results.push(await s.all());
        sqlite.exec('COMMIT');
        return results;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return { sqlite, d1: d1 as unknown as D1Database };
}
