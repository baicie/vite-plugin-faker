import { type PropType, defineComponent } from 'vue'
import { cn } from '../../lib/utils'

export const Table = defineComponent({
  name: 'Table',
  setup(_, { slots, attrs }) {
    return () => (
      <div class="w-full overflow-auto">
        <table
          class={cn('w-full caption-bottom text-sm', attrs.class as string)}
        >
          {slots.default?.()}
        </table>
      </div>
    )
  },
})

export const TableHeader = defineComponent({
  name: 'TableHeader',
  setup(_, { slots, attrs }) {
    return () => (
      <thead class={cn('[&_tr]:border-b bg-muted', attrs.class as string)}>
        {slots.default?.()}
      </thead>
    )
  },
})

export const TableBody = defineComponent({
  name: 'TableBody',
  setup(_, { slots, attrs }) {
    return () => (
      <tbody
        class={cn('[&_tr:last-child]:border-0 bg-card', attrs.class as string)}
      >
        {slots.default?.()}
      </tbody>
    )
  },
})

export const TableFooter = defineComponent({
  name: 'TableFooter',
  setup(_, { slots, attrs }) {
    return () => (
      <tfoot
        class={cn(
          'border-t bg-muted/50 font-medium [&>tr]:last:border-b-0',
          attrs.class as string,
        )}
      >
        {slots.default?.()}
      </tfoot>
    )
  },
})

export const TableRow = defineComponent({
  name: 'TableRow',
  setup(_, { slots, attrs }) {
    return () => (
      <tr
        class={cn(
          'border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted group',
          attrs.class as string,
        )}
      >
        {slots.default?.()}
      </tr>
    )
  },
})

export const TableHead = defineComponent({
  name: 'TableHead',
  props: {
    fixed: {
      type: String as PropType<'left' | 'right'>,
      default: undefined,
    },
  },
  setup(props, { slots, attrs }) {
    return () => (
      <th
        class={cn(
          'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
          props.fixed === 'left' && 'sticky left-0 z-20 bg-muted',
          props.fixed === 'right' && 'sticky right-0 z-20 bg-muted',
          attrs.class as string,
        )}
      >
        {slots.default?.()}
      </th>
    )
  },
})

export const TableCell = defineComponent({
  name: 'TableCell',
  props: {
    colspan: { type: [String, Number], default: undefined },
    rowspan: { type: [String, Number], default: undefined },
    title: { type: String, default: undefined },
    fixed: {
      type: String as PropType<'left' | 'right'>,
      default: undefined,
    },
  },
  setup(props, { slots, attrs }) {
    return () => (
      <td
        class={cn(
          'p-4 align-middle [&:has([role=checkbox])]:pr-0',
          props.fixed === 'left' &&
            'sticky left-0 z-10 bg-card group-hover:bg-muted group-data-[state=selected]:bg-muted',
          props.fixed === 'right' &&
            'sticky right-0 z-10 bg-card group-hover:bg-muted group-data-[state=selected]:bg-muted',
          attrs.class as string,
        )}
        colspan={props.colspan}
        rowspan={props.rowspan}
        title={props.title}
      >
        {slots.default?.()}
      </td>
    )
  },
})

export const TableCaption = defineComponent({
  name: 'TableCaption',
  setup(_, { slots, attrs }) {
    return () => (
      <caption
        class={cn('mt-4 text-sm text-muted-foreground', attrs.class as string)}
      >
        {slots.default?.()}
      </caption>
    )
  },
})
