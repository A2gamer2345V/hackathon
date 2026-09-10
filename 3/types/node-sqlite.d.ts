/**
 * Types for `node:sqlite`.
 *
 * The runtime has it — Node 24 ships `node:sqlite` as a built-in and
 * `lib/server/db.ts` uses it directly. What is missing is only the *declaration*:
 * this project pins `@types/node@20`, which predates the module, so TypeScript
 * cannot see it.
 *
 * Declaring the slice we actually call is deliberate rather than lazy. Bumping
 * `@types/node` to 24 would pull a much larger change through the whole codebase
 * (a major version of the DOM/Node lib surface) to solve a one-module problem, and
 * the registry is not reachable from this machine in any case.
 *
 * When `@types/node` is eventually upgraded, delete this file — the real
 * declarations will conflict with it, which is the reminder to do so.
 *
 * Mirrors the documented API at https://nodejs.org/api/sqlite.html.
 */
declare module 'node:sqlite' {
  /** A value SQLite can store natively. */
  type SQLOutputValue = null | number | bigint | string | Uint8Array;
  /** A value that can be bound to a statement parameter. */
  type SQLInputValue = null | number | bigint | string | Uint8Array | boolean | undefined;

  interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
    enableForeignKeyConstraints?: boolean;
    enableDoubleQuotedStringLiterals?: boolean;
    allowExtension?: boolean;
  }

  interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  class StatementSync {
    /** Every matching row. Rows come back as null-prototype objects. */
    all(...params: SQLInputValue[]): Record<string, SQLOutputValue>[];
    /** The first matching row, or `undefined` when there is none. */
    get(...params: SQLInputValue[]): Record<string, SQLOutputValue> | undefined;
    run(...params: SQLInputValue[]): StatementResultingChanges;
    columns(): { column: string | null; database: string | null; name: string; table: string | null; type: string | null }[];
    expandedSQL(): string;
    sourceSQL(): string;
    setAllowBareNamedParameters(enabled: boolean): void;
    setReadBigInts(enabled: boolean): void;
  }

  class DatabaseSync {
    constructor(path: string | Buffer | URL, options?: DatabaseSyncOptions);
    close(): void;
    open(): void;
    /** Runs one or more statements for their side effects. No results. */
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    readonly isOpen: boolean;
    readonly isTransaction: boolean;
  }

  export { DatabaseSync, StatementSync };
  export type { DatabaseSyncOptions, SQLInputValue, SQLOutputValue, StatementResultingChanges };
}
