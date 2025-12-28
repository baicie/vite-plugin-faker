import { defineComponent, ref } from 'vue'
import Layout from './layout'
import MockList from '../../tabs/mock/mock-list'
import RequestList from '../../tabs/request/request-list'
import SettingsPanel from '../../tabs/setting/settings-panel'

export default defineComponent({
  name: 'RouteMode',
  setup() {
    const selectedTab = ref(0)
    const tabs = [
      { name: 'Requests', component: RequestList },
      { name: 'Mocks', component: MockList },
      { name: 'Settings', component: SettingsPanel },
    ]

    return () => (
      <Layout
        tabs={tabs}
        selectedTab={selectedTab.value}
        onSelect={(index: number) => selectedTab.value = index}
      />
    )
  }
})
