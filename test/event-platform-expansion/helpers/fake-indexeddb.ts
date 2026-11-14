/**
 * A deliberately small IndexedDB test double for `lib/offline/db.ts`.
 *
 * The offline door store only uses key-path object stores, one index, and the
 * basic CRUD calls exercised below. Keeping the double local avoids adding a
 * runtime dependency just to test the real module.
 */

import { vi } from "vitest";

type Row = Record<string, unknown>;

class FakeRequest<T> {
  result!: T;
  error: Error | null = null;
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(private readonly operation: () => T) {
    setTimeout(() => {
      try {
        this.result = this.operation();
        this.onsuccess?.();
      } catch (error) {
        this.error = error instanceof Error ? error : new Error(String(error));
        this.onerror?.();
      }
    }, 0);
  }
}

class FakeIndex {
  constructor(
    private readonly store: FakeObjectStore,
    private readonly keyPath: string
  ) {}

  getAll(key: unknown) {
    return new FakeRequest(() =>
      [...this.store.rows.values()].filter(
        (row) => (row as Row)[this.keyPath] === key
      )
    );
  }
}

class FakeObjectStore {
  readonly rows = new Map<unknown, unknown>();
  readonly indexes = new Map<string, string>();

  constructor(readonly keyPath: string) {}

  createIndex(name: string, keyPath: string) {
    this.indexes.set(name, keyPath);
    return new FakeIndex(this, keyPath);
  }

  put(value: unknown) {
    return new FakeRequest(() => {
      const key = (value as Row)[this.keyPath];
      this.rows.set(key, structuredClone(value));
      return key;
    });
  }

  get(key: unknown) {
    return new FakeRequest(() => this.rows.get(key));
  }

  getAll() {
    return new FakeRequest(() => [...this.rows.values()]);
  }

  delete(key: unknown) {
    return new FakeRequest(() => {
      this.rows.delete(key);
      return undefined;
    });
  }

  clear() {
    return new FakeRequest(() => {
      this.rows.clear();
      return undefined;
    });
  }

  index(name: string) {
    const keyPath = this.indexes.get(name);
    if (!keyPath) throw new Error(`Unknown index ${name}`);
    return new FakeIndex(this, keyPath);
  }
}

class FakeDatabase {
  readonly stores = new Map<string, FakeObjectStore>();
  readonly objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  };

  createObjectStore(name: string, options: { keyPath: string }) {
    if (!this.stores.has(name)) {
      this.stores.set(name, new FakeObjectStore(options.keyPath));
    }
    return this.stores.get(name)!;
  }

  transaction(names: string | string[]) {
    const requested = Array.isArray(names) ? names : [names];
    return {
      objectStore: (name: string) => {
        if (!requested.includes(name)) {
          throw new Error(`Store ${name} is not part of this transaction`);
        }
        const store = this.stores.get(name);
        if (!store) throw new Error(`Unknown store ${name}`);
        return store;
      },
    };
  }

  close() {}
}

class FakeOpenRequest {
  result!: FakeDatabase;
  error: Error | null = null;
  onupgradeneeded: (() => void) | null = null;
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(database: FakeDatabase) {
    setTimeout(() => {
      this.result = database;
      this.onupgradeneeded?.();
      this.onsuccess?.();
    }, 0);
  }
}

export class FakeIndexedDB {
  private readonly database = new FakeDatabase();

  open() {
    return new FakeOpenRequest(this.database);
  }
}

export function installFakeIndexedDB() {
  const factory = new FakeIndexedDB();
  Object.defineProperty(window, "indexedDB", {
    configurable: true,
    value: factory,
  });
  vi.stubGlobal("indexedDB", factory);
  return factory;
}
