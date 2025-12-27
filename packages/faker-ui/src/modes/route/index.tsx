import { defineComponent } from 'vue'
import Layout from './layout'

const RouteMode = defineComponent({
  setup() {
    return () => <Layout />
  },
})

export default RouteMode
