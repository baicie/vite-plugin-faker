<script setup lang="ts">
import { App as FakerApp, appContextKey } from '@baicie/faker-ui'
import '@baicie/faker-ui/dist/index.css'
import { provide } from 'vue'
import { initLogger } from '@baicie/logger'

// Initialize logger
initLogger({ prefix: '[FakerExt]' })

// Provide context
provide(appContextKey, {
  wsUrl: 'ws://localhost:3002/__faker_ws__', // TODO: Make this configurable
  mode: 'extension'
})
</script>

<template>
  <div class="w-[800px] h-[600px] overflow-hidden">
    <FakerApp />
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  width: 800px;
  height: 600px;
}
</style>
