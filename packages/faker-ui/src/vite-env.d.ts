/// <reference types="vite/client" />

declare global {
  interface Window {
    __VITE_HMR_WS__: string
  }
}

export {}
