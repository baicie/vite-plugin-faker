import type { FakerHotContext, FakerLogger } from '@baicie/faker-shared'
import { render } from '@zeus-js/zeus'
import { logger } from '@baicie/logger'
import '@zeus-web/button/wc/auto'
import '@zeus-web/dialog/wc/auto'
import '@zeus-web/input/wc/auto'
import '@zeus-web/tabs/wc/auto'
import '@zeus-web/select/wc/auto'
import '@zeus-web/switch/wc/auto'
import '@zeus-web/icons/wc'
import FakerStudioApp from '../App'
import { configureAppContext } from '../hooks/use-app-context'
import type { UIOptionsInput } from '../hooks/use-app-context'
import { connect, disconnect } from '../hooks/use-ws'
import '../index.css'

const mountedApps = new WeakMap<Element, () => void>()

export function mountFakerStudio(
  target: Element,
  options?: UIOptionsInput,
  appLogger: FakerLogger = logger,
  hotContext?: FakerHotContext,
): () => void {
  const previousDispose = mountedApps.get(target)
  if (previousDispose) {
    previousDispose()
  }

  const resolvedOptions = configureAppContext(options)
  const client = connect(resolvedOptions.wsUrl, appLogger, hotContext)
  const disposeRender = render(function () {
    return <FakerStudioApp client={client} options={resolvedOptions} />
  }, target)
  let disposed = false

  function dispose(): void {
    if (disposed) {
      return
    }
    disposed = true
    if (mountedApps.get(target) === dispose) {
      mountedApps.delete(target)
    }
    disposeRender()
    disconnect(client)
  }

  mountedApps.set(target, dispose)
  return dispose
}
