import { logger } from '@baicie/logger'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import { defineComponent, onMounted } from 'vue'
import { useAppContext } from './hooks/use-app-context'
import { connect } from './hooks/use-ws'
import RouteMode from './modes/route'
import ButtonMode from './modes/button'

hljs.registerLanguage('json', json)

const App = defineComponent({
  setup() {
    const { wsUrl, mode } = useAppContext()

    onMounted(() => {
      logger.info('ui mounted')
    })

    connect(wsUrl, logger)

    return () => {
      if (mode === 'button') {
        return <ButtonMode />
      }

      return (
        <div class="bg-gray-100 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100 font-sans">
          <RouteMode />
        </div>
      )
    }
  },
})

export default App
