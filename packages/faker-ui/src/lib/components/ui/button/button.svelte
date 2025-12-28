<script lang="ts">
  import { Button as ButtonPrimitive } from 'bits-ui'
  import { type Props, buttonVariants } from './index.js'
  import { cn } from '$lib/utils.js'

  let {
    ref = $bindable(null),
    class: className,
    variant = 'default',
    size = 'default',
    ...restProps
  }: Props = $props()

  let computedClass = $derived(
    cn(buttonVariants({ variant, size, className: className as any })),
  )
</script>

<ButtonPrimitive.Root bind:ref class={computedClass} {...restProps}>
  {@render restProps.children?.()}
</ButtonPrimitive.Root>
