<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js'
  import type { MockConfig } from '@baicie/faker-shared'
  import { fetchMockList } from '../../api/mock.js'
  import { onMount } from 'svelte'

  let mocks: any[] = $state([])
  let loading = $state(false)

  async function loadMocks() {
    loading = true
    try {
      const res = (await fetchMockList({ page: 1, pageSize: 100 })) as any
      if (res && (res.list || res.items || res.data)) {
        mocks = res.list || res.items || res.data || []
      }
    } catch (e) {
      console.error(e)
    } finally {
      loading = false
    }
  }

  onMount(() => {
    loadMocks()
  })
</script>

<div class="p-4">
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-xl font-bold">Mock Configuration</h2>
    <Button size="sm">Add Mock</Button>
  </div>

  <div class="rounded-md border">
    <table class="w-full text-sm text-left">
      <thead class="bg-muted/50 text-muted-foreground">
        <tr>
          <th class="h-12 px-4 align-middle font-medium">URL</th>
          <th class="h-12 px-4 align-middle font-medium">Method</th>
          <th class="h-12 px-4 align-middle font-medium">Enabled</th>
          <th class="h-12 px-4 align-middle font-medium">Type</th>
          <th class="h-12 px-4 align-middle font-medium">Description</th>
          <th class="h-12 px-4 align-middle font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if mocks.length === 0}
          <tr>
            <td colspan="6" class="p-4 text-center text-muted-foreground">
              {#if loading}
                Loading...
              {:else}
                No mocks found
              {/if}
            </td>
          </tr>
        {:else}
          {#each mocks as mock}
            <tr class="border-t hover:bg-muted/50">
              <td class="p-4">{mock.url}</td>
              <td class="p-4">{mock.method}</td>
              <td class="p-4">{mock.enabled ? 'Yes' : 'No'}</td>
              <td class="p-4">{mock.responseType || '-'}</td>
              <td class="p-4">{mock.description || '-'}</td>
              <td class="p-4">
                <Button variant="ghost" size="sm">Edit</Button>
                <Button variant="ghost" size="sm" class="text-destructive"
                  >Delete</Button
                >
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
