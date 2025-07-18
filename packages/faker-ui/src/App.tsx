import { Fragment, defineComponent, reactive } from 'vue'
import { NDrawer, NFloatButton } from 'naive-ui'

const App = defineComponent({
  setup() {
    const state = reactive({
      open: false,
    })

    const handleOpen = () => {
      state.open = true
    }

    return () => (
      <Fragment>
        <NFloatButton
          type="primary"
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          onClick={handleOpen}
          position="fixed"
          bottom={24}
          right={0}
        >
          Click me1
        </NFloatButton>

        <NDrawer v-model:show={state.open}>
          <div>
            <h1>Hello</h1>
          </div>
        </NDrawer>
      </Fragment>
    )
  },
})

export default App
