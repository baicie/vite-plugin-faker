declare module 'rollup-plugin-web-worker-loader' {
  import type { Plugin } from 'rolldown'

  export default function webWorkerLoaderPlugin(
    userConfig?: WorkerLoaderPluginOptions,
  ): Plugin
  export interface WorkerLoaderPluginOptions {
    targetPlatform?: 'browser' | 'node'
    inline?: boolean
    preserveSource?: boolean
    sourceMap?: boolean
  }
}
