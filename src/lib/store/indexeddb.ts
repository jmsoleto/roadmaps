/**
 * The IndexedDB plumbing the applications share.
 *
 * Not a store and not a domain: opening the database, promisifying a request,
 * waiting for a transaction, and the shape of a load's outcome. Decisions wrote
 * all of it first; API Hub is the second application to need it, and copying it
 * would mean two places where the open timeout can drift apart.
 *
 * What is emphatically **not** here is anything about what an application
 * stores. Each keeps its own object store and its own document format, and no
 * application reads another's — `local-persistence` requires exactly that. What
 * they share is the connection, because there is only one database.
 */

/** Every application's data lives in one database, in its own object store. */
const DB_NAME = 'tech-lead-hub';

/**
 * The version. Bumped whenever an object store is added.
 *
 * v2 added the attachment store. v3 added API Hub's contracts and its model
 * library — the library empty and unused, because creating it later would mean
 * a v4 upgrade over contracts the user had already written.
 */
const DB_VERSION = 3;

/**
 * The object stores, created on first run or version bump.
 *
 * One list rather than one per application: `onupgradeneeded` fires once for
 * the whole database, so an application cannot create its own store on its own
 * schedule. It creates only what is missing, which is what makes every bump
 * additive and leaves the other applications' data untouched.
 */
const STORES = ['decisions', 'attachments', 'apiContracts', 'apiLibrary'] as const;

/**
 * The three ways a load can end.
 *
 * `unavailable` exists because arriving on an empty list over a store that
 * actually holds data invites writing over it, and there is no server to
 * recover from. See `local-persistence`.
 */
export type LoadOutcome<T> =
  { kind: 'loaded'; data: T } | { kind: 'empty' } | { kind: 'unavailable'; reason: string };

/** Promisify one IndexedDB request. */
export function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

/** Resolve when a transaction finishes, reject when it does not. */
export function settled(tx: IDBTransaction, message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(message));
    tx.onabort = () => reject(tx.error ?? new Error(message));
  });
}

/**
 * How long to wait for the open request to say anything at all.
 *
 * `onblocked` covers the case IndexedDB reports — another connection holding an
 * older version. It does **not** cover the one where the request simply never
 * fires any event, which a wedged database really does: no success, no error,
 * no blocked, forever.
 *
 * Without a bound there, `bootstrap` never resolves and **nothing mounts** —
 * the hub and Roadmaps included, even though neither has anything to do with
 * this store. `local-persistence` promises the opposite, so the wait has an end.
 */
const OPEN_TIMEOUT_MS = 5000;

/**
 * Open the database, creating its object stores on first run or version bump.
 *
 * Every failure resolves to a rejection rather than a wait: a tab that never
 * closes, or a database that never answers, would otherwise hang the whole
 * application, and saying so is more useful than a spinner.
 */
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('este navegador no ofrece IndexedDB'));
      return;
    }

    let settledOnce = false;
    const finish = (fn: () => void) => {
      if (settledOnce) return;
      settledOnce = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(
      () =>
        finish(() =>
          reject(
            new Error(
              'la base de datos no responde; puede haber otra pestaña con una versión anterior abierta',
            ),
          ),
        ),
      OPEN_TIMEOUT_MS,
    );

    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
      }
    };
    req.onsuccess = () => finish(() => resolve(req.result));
    req.onerror = () =>
      finish(() => reject(req.error ?? new Error('no se pudo abrir la base de datos')));
    req.onblocked = () =>
      finish(() =>
        reject(new Error('otra pestaña tiene abierta una versión anterior de los datos')),
      );
  });
}

/**
 * A connection opened once and reused, with the open injectable.
 *
 * The injection is what lets the failure path be exercised without breaking a
 * real database — the one path that must never be discovered in production.
 */
export class Connection {
  private db: IDBDatabase | null = null;

  constructor(private readonly open: () => Promise<IDBDatabase> = openDatabase) {}

  async get(): Promise<IDBDatabase> {
    if (this.db === null) this.db = await this.open();
    return this.db;
  }
}
