<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js'
  import { getSettings, updateSettings, clearCache } from '../../api/setting.js'
  import { onMount } from 'svelte'

  let globalDelay = $state(0)
  let enableAllMocks = $state(true)
  let logRequests = $state(true)
  let loading = $state(false)

  async function loadSettings() {
    loading = true
    try {
      const res = await getSettings()
      if (res) {
        globalDelay = res.globalDelay ?? 0
        enableAllMocks = res.enableAllMocks ?? true
        logRequests = res.logRequests ?? true
      }
    } catch (e) {
      console.error('Failed to load settings', e)
    } finally {
      loading = false
    }
  }

  async function handleSave() {
    loading = true
    try {
      await updateSettings({
        globalDelay,
        enableAllMocks,
        logRequests,
      })
    } catch (e) {
      console.error('Failed to save settings', e)
    } finally {
      loading = false
    }
  }

  async function handleClearCache() {
    if (!confirm('Are you sure you want to clear all request cache?')) return

    loading = true
    try {
      await clearCache()
    } catch (e) {
      console.error('Failed to clear cache', e)
    } finally {
      loading = false
    }
  }

  onMount(() => {
    loadSettings()
  })
</script>

<div class="p-4 space-y-6">
  <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
    <div class="flex flex-col space-y-1.5 p-6">
      <h3 class="font-semibold leading-none tracking-tight">Global Settings</h3>
    </div>
    <div class="p-6 pt-0 space-y-4">
      <div class="flex items-center justify-between">
        <label
          for="delay"
          class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >Global Delay (ms)</label
        >
        <input
          type="number"
          id="delay"
          class="flex h-9 w-20 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          bind:value={globalDelay}
        />
      </div>
      <div class="flex items-center justify-between">
        <label
          for="enable-mocks"
          class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >Enable All Mocks</label
        >
        <input
          type="checkbox"
          id="enable-mocks"
          bind:checked={enableAllMocks}
          class="h-4 w-4"
        />
      </div>
      <div class="flex items-center justify-between">
        <label
          for="log-requests"
          class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >Log Requests</label
        >
        <input
          type="checkbox"
          id="log-requests"
          bind:checked={logRequests}
          class="h-4 w-4"
        />
      </div>
      <Button onclick={handleSave} disabled={loading}>Save Settings</Button>
    </div>
  </div>

  <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
    <div class="flex flex-col space-y-1.5 p-6">
      <h3 class="font-semibold leading-none tracking-tight text-destructive">
        Danger Zone
      </h3>
    </div>
    <div class="p-6 pt-0">
      <Button
        variant="destructive"
        onclick={handleClearCache}
        disabled={loading}>Clear All Cache</Button
      >
    </div>
  </div>
</div>
