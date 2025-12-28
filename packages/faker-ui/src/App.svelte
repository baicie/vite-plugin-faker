<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js'
  import ThemeToggle from '$lib/components/theme-toggle.svelte'
  import { initTheme } from '$lib/theme.svelte.js'
  import { setContext, onMount } from 'svelte'
  import { appContextKey, type UIOptions } from './hooks/use-app-context.js'
  import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  } from '$lib/components/ui/tabs/index.js'

  import RequestList from './tabs/request/request-list.svelte'
  import MockList from './tabs/mock/mock-list.svelte'
  import SettingsPanel from './tabs/setting/settings-panel.svelte'
  import { connect } from './hooks/use-ws.js'
  import { logger } from '@baicie/logger'

  let { uiOptions = {} }: { uiOptions?: UIOptions } = $props()

  onMount(() => {
    initTheme()
    setContext(appContextKey, uiOptions)
    if (uiOptions.wsUrl) {
      connect(uiOptions.wsUrl, logger)
    }
  })

  let activeTab = $state('requests')
  let open = $state(false)

  function handleOpen() {
    open = true
  }
</script>

{#if uiOptions.mode === 'button'}
  <div class="fixed bottom-6 right-6 z-[1000]">
    <Button onclick={handleOpen}>Open Faker UI</Button>
  </div>

  {#if open}
    <div
      class="fixed inset-0 z-[1001] bg-background/80 backdrop-blur-sm"
      onclick={() => (open = false)}
      role="presentation"
    ></div>
    <div
      class="fixed inset-y-0 right-0 z-[1002] w-full max-w-2xl border-l bg-background p-6 shadow-lg transition-transform duration-300 ease-in-out sm:max-w-screen-md"
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Faker UI</h2>
        <div class="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onclick={() => (open = false)}>
            <span class="sr-only">Close</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-4 w-4"
              ><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
            >
          </Button>
        </div>
      </div>

      <Tabs bind:value={activeTab} class="w-full">
        <TabsList class="grid w-full grid-cols-3">
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="mocks">Mocks</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
          <RequestList />
        </TabsContent>
        <TabsContent value="mocks">
          <MockList />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  {/if}
{:else}
  <div class="flex h-screen w-full">
    <!-- Sidebar could go here if needed -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <header class="flex h-14 items-center gap-4 border-b bg-muted/40 px-6">
        <h1 class="font-semibold text-lg">Faker UI</h1>
        <div class="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>
      <main class="flex-1 overflow-auto p-6">
        <Tabs bind:value={activeTab} class="w-full h-full flex flex-col">
          <div class="flex-none">
            <TabsList class="w-[400px] grid grid-cols-3">
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="mocks">Mocks</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </div>
          <div class="flex-1 overflow-auto mt-2">
            <TabsContent value="requests" class="h-full m-0">
              <RequestList />
            </TabsContent>
            <TabsContent value="mocks" class="h-full m-0">
              <MockList />
            </TabsContent>
            <TabsContent value="settings" class="h-full m-0">
              <SettingsPanel />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  </div>
{/if}
