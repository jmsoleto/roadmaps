/**
 * A folder tree in memory, for tests.
 *
 * Behaves like the File System Access API in what the hub relies on: lookups
 * that fail throw `NotFoundError`, writes land on `close()` and not before,
 * and each folder answers for its own permission. `writes` and `removals`
 * count operations, so a test can say "nothing was written".
 */

import type { FolderDir, FolderFile, FolderWritable, PermissionState } from './fs';

const notFound = (name: string) =>
  Object.assign(new Error(`${name} not found`), { name: 'NotFoundError' });

export class MemoryFile implements FolderFile {
  readonly kind = 'file';
  constructor(
    readonly name: string,
    public content: string,
    private root: MemoryDir,
  ) {}
  async getFile() {
    const content = this.content;
    return { text: async () => content };
  }
  async createWritable(): Promise<FolderWritable> {
    let buffer = '';
    return {
      write: async (data: string) => {
        if (this.root.failWrites) throw new Error('disk full');
        buffer += data;
      },
      close: async () => {
        await this.root.delay();
        this.content = buffer;
        this.root.writes.push(this.name);
      },
      abort: async () => {},
    };
  }
}

export class MemoryDir implements FolderDir {
  readonly kind = 'directory';
  readonly children = new Map<string, MemoryDir | MemoryFile>();
  private own = {
    writes: [] as string[],
    removals: [] as string[],
    permission: 'granted' as PermissionState,
    grantOnRequest: 'granted' as PermissionState,
    failWrites: false,
    writeDelay: 0,
    gone: false,
  };

  // Shared by the whole tree and kept at the root, so a test can hold any
  // folder of the tree and see every write, or break the whole tree at once.
  /** Files written, in order. */
  get writes() {
    return this.root.own.writes;
  }
  set writes(v: string[]) {
    this.root.own.writes = v;
  }
  /** Files removed, in order. */
  get removals() {
    return this.root.own.removals;
  }
  set removals(v: string[]) {
    this.root.own.removals = v;
  }
  get permission() {
    return this.root.own.permission;
  }
  set permission(v: PermissionState) {
    this.root.own.permission = v;
  }
  /** Answer to the next `requestPermission`. */
  get grantOnRequest() {
    return this.root.own.grantOnRequest;
  }
  set grantOnRequest(v: PermissionState) {
    this.root.own.grantOnRequest = v;
  }
  get failWrites() {
    return this.root.own.failWrites;
  }
  set failWrites(v: boolean) {
    this.root.own.failWrites = v;
  }
  /** Milliseconds each write takes, to exercise queues. */
  get writeDelay() {
    return this.root.own.writeDelay;
  }
  set writeDelay(v: number) {
    this.root.own.writeDelay = v;
  }
  /** Set when the folder has been deleted or moved away. */
  get gone() {
    return this.root.own.gone;
  }
  set gone(v: boolean) {
    this.root.own.gone = v;
  }

  constructor(
    readonly name: string,
    private parent: MemoryDir | null = null,
  ) {}

  get root(): MemoryDir {
    return this.parent ? this.parent.root : this;
  }

  async delay(): Promise<void> {
    const ms = this.writeDelay;
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
  }

  private check() {
    if (this.gone) throw notFound(this.name);
  }

  async getDirectoryHandle(name: string, options: { create?: boolean } = {}): Promise<MemoryDir> {
    this.check();
    const found = this.children.get(name);
    if (found instanceof MemoryDir) return found;
    if (found) throw Object.assign(new Error(name), { name: 'TypeMismatchError' });
    if (!options.create) throw notFound(name);
    const dir = new MemoryDir(name, this);
    this.children.set(name, dir);
    return dir;
  }

  async getFileHandle(name: string, options: { create?: boolean } = {}): Promise<MemoryFile> {
    this.check();
    const found = this.children.get(name);
    if (found instanceof MemoryFile) return found;
    if (found) throw Object.assign(new Error(name), { name: 'TypeMismatchError' });
    if (!options.create) throw notFound(name);
    const file = new MemoryFile(name, '', this.root);
    this.children.set(name, file);
    return file;
  }

  async removeEntry(name: string): Promise<void> {
    this.check();
    if (!this.children.delete(name)) throw notFound(name);
    this.removals.push(name);
  }

  async *values(): AsyncIterable<MemoryDir | MemoryFile> {
    this.check();
    for (const child of [...this.children.values()]) yield child;
  }

  async queryPermission(): Promise<PermissionState> {
    return this.permission;
  }

  async requestPermission(): Promise<PermissionState> {
    this.permission = this.grantOnRequest;
    return this.permission;
  }

  // ---- for building and inspecting trees in tests ----

  /** The folder at `parts` below this one, creating it empty if needed. */
  private descend(parts: string[]): MemoryDir {
    if (parts.length === 0) return this;
    const [head, ...rest] = parts;
    let next = this.children.get(head);
    if (!(next instanceof MemoryDir)) {
      next = new MemoryDir(head, this);
      this.children.set(head, next);
    }
    return next.descend(rest);
  }

  /** Put a file at `path` (`a/b/c.json`), creating folders on the way. */
  put(path: string, content: string): this {
    const parts = path.split('/');
    const name = parts[parts.length - 1];
    this.descend(parts.slice(0, -1)).children.set(name, new MemoryFile(name, content, this.root));
    return this;
  }

  /** A folder at `path`, creating it empty if needed. */
  dir(path: string): MemoryDir {
    return this.descend(path.split('/'));
  }

  /** The content of the file at `path`, or `undefined`. */
  read(path: string): string | undefined {
    const [head, ...rest] = path.split('/');
    const child = this.children.get(head);
    if (rest.length === 0) return child instanceof MemoryFile ? child.content : undefined;
    return child instanceof MemoryDir ? child.read(rest.join('/')) : undefined;
  }

  /** Every file below, by path, for comparing whole trees. */
  snapshot(prefix = ''): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [name, child] of this.children) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (child instanceof MemoryFile) out[path] = child.content;
      else Object.assign(out, child.snapshot(path));
    }
    return out;
  }
}
