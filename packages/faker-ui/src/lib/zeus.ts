import { effect, onCleanup, scope } from '@zeus-js/zeus'
import type { JSXValue } from '@zeus-js/zeus'

function removeNodes(nodes: Node[]): void {
  for (const node of nodes) {
    if (node.parentNode) {
      node.parentNode.removeChild(node)
    }
  }
}

function insertValue(
  parent: Node,
  value: JSXValue,
  before: Node | null,
): Node[] {
  if (
    value === null ||
    value === undefined ||
    value === false ||
    value === true
  ) {
    return []
  }

  if (Array.isArray(value)) {
    const nodes: Node[] = []
    for (const item of value) {
      const childNodes = insertValue(parent, item, before)
      for (const child of childNodes) {
        nodes.push(child)
      }
    }
    return nodes
  }

  if (
    typeof DocumentFragment !== 'undefined' &&
    value instanceof DocumentFragment
  ) {
    const nodes: Node[] = []
    while (value.firstChild) {
      const child = value.firstChild
      parent.insertBefore(child, before)
      nodes.push(child)
    }
    return nodes
  }

  if (typeof Node !== 'undefined' && value instanceof Node) {
    parent.insertBefore(value, before)
    return [value]
  }

  const textNode = document.createTextNode(String(value))
  parent.insertBefore(textNode, before)
  return [textNode]
}

export function dynamic(renderValue: () => JSXValue): JSX.Element {
  const fragment = document.createDocumentFragment()
  const anchor = document.createComment('zeus-dynamic')
  fragment.appendChild(anchor)

  let nodes: Node[] = []
  let contentScope: ReturnType<typeof scope> | undefined
  const runner = effect(function () {
    if (contentScope) {
      contentScope.stop()
    }
    removeNodes(nodes)
    const parent = anchor.parentNode
    if (!parent) {
      nodes = []
      return
    }
    contentScope = scope()
    const nextNodes = contentScope.run(function () {
      return insertValue(parent, renderValue(), anchor)
    })
    nodes = nextNodes || []
  })

  onCleanup(function () {
    runner.effect.stop()
    if (contentScope) {
      contentScope.stop()
      contentScope = undefined
    }
    removeNodes(nodes)
    nodes = []
    if (anchor.parentNode) {
      anchor.parentNode.removeChild(anchor)
    }
  })

  return fragment as unknown as JSX.Element
}

export function readInputValue(event: Event): string {
  const target = event.target
  return target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
    ? target.value
    : ''
}

export function readChecked(event: Event): boolean {
  const target = event.target
  return target instanceof HTMLInputElement ? target.checked : false
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error'
}

export function focusZeusControl(target: HTMLElement | null): void {
  if (!target || !target.isConnected) {
    return
  }
  const control = target.querySelector<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  if (control) {
    control.focus()
    return
  }
  if (!target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1')
  }
  target.focus()
}
