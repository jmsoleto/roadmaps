/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The festivos proxy (workers/festivos-proxy). Empty or absent: no holiday import. */
  readonly VITE_FESTIVOS_PROXY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
