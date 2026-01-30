import { defineComponent, onMounted, ref } from 'vue'
import { Switch } from './ui/switch'
import { MoonIcon, SunIcon } from '@heroicons/vue/24/solid'

const ThemeToggle = defineComponent({
  name: 'ThemeToggle',
  setup() {
    const isDark = ref(false)

    const toggleTheme = (value: boolean) => {
      isDark.value = value
      if (value) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
    }

    onMounted(() => {
      const storedTheme = localStorage.getItem('theme')
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches

      if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
        isDark.value = true
        document.documentElement.classList.add('dark')
      } else {
        isDark.value = false
        document.documentElement.classList.remove('dark')
      }
    })

    return () => (
      <div
        class="relative inline-flex items-center cursor-pointer"
        onClick={() => toggleTheme(!isDark.value)}
      >
        <Switch
          modelValue={isDark.value}
          onUpdate:modelValue={toggleTheme}
          class="pointer-events-none"
          // tabindex={-1}
        />
        <div class="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
          <span
            class={[
              'transition-opacity duration-200',
              isDark.value ? 'opacity-0' : 'opacity-100',
            ]}
          >
            <SunIcon class="h-3 w-3 text-gray-500" />
          </span>
          <span
            class={[
              'transition-opacity duration-200',
              isDark.value ? 'opacity-100' : 'opacity-0',
            ]}
          >
            <MoonIcon class="h-3 w-3 text-gray-100" />
          </span>
        </div>
      </div>
    )
  },
})

export default ThemeToggle
