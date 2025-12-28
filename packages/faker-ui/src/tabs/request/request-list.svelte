<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js'
  import type { RequestRecord } from '@baicie/faker-shared'
  import { fetchRequestHistory } from '../../api/request.js'
  import { onMount } from 'svelte'

  // Use any to avoid strict type checking issues during migration
  let requests: any[] = $state([])
  let loading = $state(false)
  let page = $state(1)
  let pageSize = $state(20)
  let total = $state(0)

  async function loadRequests(targetPage?: number) {
    if (typeof targetPage === 'number') {
      page = targetPage
    }
    loading = true
    try {
      const res = (await fetchRequestHistory({
        page,
        pageSize,
      })) as any

      if (res) {
        requests = res.list || res.items || res.data || []
        if (res.pagination) {
          total = res.pagination.total || 0
          page = res.pagination.page || 1
          pageSize = res.pagination.pageSize || 20
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      loading = false
    }
  }

  function handleRefresh() {
    loadRequests(1)
  }

  onMount(() => {
    loadRequests()
  })
</script>

<div class="p-4">
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-xl font-bold">Request History</h2>
    <div class="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onclick={handleRefresh}
        disabled={loading}>Refresh</Button
      >
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onclick={() => loadRequests(page - 1)}
          disabled={page <= 1 || loading}>Prev</Button
        >
        <span class="text-sm">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          onclick={() => loadRequests(page + 1)}
          disabled={requests.length < pageSize || loading}>Next</Button
        >
      </div>
    </div>
  </div>

  <div class="rounded-md border">
    <table class="w-full text-sm text-left">
      <thead class="bg-muted/50 text-muted-foreground">
        <tr>
          <th class="h-12 px-4 align-middle font-medium">URL</th>
          <th class="h-12 px-4 align-middle font-medium">Method</th>
          <th class="h-12 px-4 align-middle font-medium">Status</th>
          <th class="h-12 px-4 align-middle font-medium">Mocked</th>
          <th class="h-12 px-4 align-middle font-medium">Duration</th>
          <th class="h-12 px-4 align-middle font-medium">Time</th>
          <th class="h-12 px-4 align-middle font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if requests.length === 0}
          <tr>
            <td colspan="7" class="p-4 text-center text-muted-foreground">
              {#if loading}
                Loading...
              {:else}
                No requests found
              {/if}
            </td>
          </tr>
        {:else}
          {#each requests as req}
            <tr class="border-t hover:bg-muted/50">
              <td class="p-4 max-w-[300px] truncate" title={req.url}
                >{req.url}</td
              >
              <td class="p-4">
                <span
                  class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                  {req.method}
                </span>
              </td>
              <td class="p-4">
                {#if req.response?.statusCode}
                  <span
                    class={req.response.statusCode >= 200 &&
                    req.response.statusCode < 300
                      ? 'text-green-600'
                      : 'text-red-600'}
                  >
                    {req.response.statusCode}
                  </span>
                {:else}
                  -
                {/if}
              </td>
              <td class="p-4">{req.isMocked ? 'Yes' : 'No'}</td>
              <td class="p-4">{req.duration}ms</td>
              <td class="p-4 whitespace-nowrap"
                >{new Date(req.timestamp).toLocaleTimeString()}</td
              >
              <td class="p-4">
                <Button variant="ghost" size="sm">Details</Button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
