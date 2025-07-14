<script lang="ts">
  function handleClick() {
    console.log('click')
  }
</script>

<main data-theme="cerberus">
  <button
    type="button"
    onclick={handleClick}
    class="btn btn-primary fixed bottom-6 right-6 rounded-full shadow-lg w-14 h-14 flex items-center justify-center text-xl"
    aria-label="Float Button"
  >
    +
  </button>
</main>

<style>
</style>
