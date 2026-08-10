import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { Select } from '../src/components/ui/select'

describe('Select', () => {
  afterEach(function () {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('opens at the trigger position and emits the selected value', function () {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 60,
      height: 40,
      left: 20,
      right: 220,
      top: 20,
      width: 200,
      x: 20,
      y: 20,
      toJSON: function () {
        return {}
      },
    })

    const wrapper = mount(Select, {
      attachTo: document.body,
      props: {
        modelValue: 'first',
        options: [
          { label: 'First', value: 'first' },
          { label: 'Second', value: 'second' },
        ],
      },
    })

    return wrapper
      .get('button')
      .trigger('click')
      .then(function () {
        return nextTick()
      })
      .then(function () {
        const listbox =
          document.body.querySelector<HTMLElement>('[role="listbox"]')
        const options =
          document.body.querySelectorAll<HTMLElement>('[role="option"]')

        expect(listbox).not.toBeNull()
        expect(listbox!.style.top).toBe('60px')
        expect(listbox!.style.left).toBe('20px')
        expect(listbox!.style.width).toBe('200px')
        expect(options).toHaveLength(2)

        options[1].click()
        return nextTick()
      })
      .then(function () {
        expect(wrapper.emitted('update:modelValue')).toEqual([['second']])
        expect(document.body.querySelector('[role="listbox"]')).toBeNull()
        wrapper.unmount()
      })
  })
})
