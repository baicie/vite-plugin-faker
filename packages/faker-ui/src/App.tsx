import { defineComponent } from 'vue'
import { NButton } from 'naive-ui'

const App = defineComponent({
  setup() {
    return () => (
      <div>
        <NButton type="primary">Click me1</NButton>
      </div>
    )
  },
})

export default App
