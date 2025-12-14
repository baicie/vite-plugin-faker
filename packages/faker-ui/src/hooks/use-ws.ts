import { FAKER_WEBSOCKET_SYMBOL, WSClient } from '@baicie/faker-shared'
import type { Logger } from '@baicie/logger'
import {
  type InjectionKey,
  type PropType,
  defineComponent,
  inject,
  provide,
  useSlots,
} from 'vue'

interface Context {
  wsClient: WSClient
}

const wscontext = Symbol('wscontext') as InjectionKey<Context>

export function useWebSocketContextProvider(context: Context) {
  return provide(wscontext, context)
}

export function useWebSocket() {
  return inject(wscontext)!
}

export const WebSocketProvider = defineComponent({
  name: 'WebSocketProvider',
  props: {
    logger: {
      type: Object as PropType<Logger>,
      required: true,
    },
    wsUrl: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const slots = useSlots()
    const wsClient = new WSClient(props.wsUrl, props.logger)

    wsClient.on(FAKER_WEBSOCKET_SYMBOL, function (data, msg) {
      console.log(data, msg)
    })

    useWebSocketContextProvider({
      wsClient,
    })
    return () => slots.default && slots.default()
  },
})
