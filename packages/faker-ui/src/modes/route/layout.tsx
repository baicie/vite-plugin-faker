import { NLayout, NLayoutContent, NLayoutSider } from 'naive-ui'
import { defineComponent } from 'vue'

const Layout = defineComponent({
  setup() {
    return () => (
      <NLayout hasSider style="height: 100vh;overflow: hidden;">
        <NLayoutSider bordered content-style="padding: 24px;">
          NLayoutSider
        </NLayoutSider>

        <NLayoutContent content-style="padding: 24px;">
          NLayoutContent
        </NLayoutContent>
      </NLayout>
    )
  },
})

export default Layout
