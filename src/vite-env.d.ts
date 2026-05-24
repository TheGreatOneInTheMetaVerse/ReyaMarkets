/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTRACT_ADDRESS: string
  readonly VITE_RUSD_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
