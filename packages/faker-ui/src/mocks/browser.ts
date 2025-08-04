import { setupWorker } from 'msw/browser'
import { mswPath } from '@baicie/faker-shared'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

export async function startMocking(): Promise<
  ServiceWorkerRegistration | undefined
> {
  return worker.start({
    onUnhandledRequest: 'warn',
    serviceWorker: {
      url: mswPath,
    },
  })
}
