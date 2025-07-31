import { Fragment, defineComponent, reactive } from 'vue'
import { NDataTable, NDrawer, NFloatButton } from 'naive-ui'
import { getDashboard } from './api'

const App = defineComponent({
  setup() {
    const state = reactive({
      open: false,
    })

    const handleOpen = async () => {
      state.open = true
      const result = await getDashboard({
        page: 1,
        pageSize: 10,
        search: '',
      })
      console.log(result)
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
          open
        </NFloatButton>

        <NDrawer v-model:show={state.open} defaultWidth={520} resizable>
          <NDataTable></NDataTable>
        </NDrawer>
      </Fragment>
    )
  },
})

export default App
