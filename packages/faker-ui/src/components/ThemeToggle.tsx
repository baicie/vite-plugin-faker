import { Switch } from '@headlessui/vue'
import { defineComponent, onMounted, ref } from 'vue'
import { MoonIcon, SunIcon } from '@heroicons/vue/24/solid'

export default defineComponent({
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
      <Switch
        modelValue={isDark.value}
        onUpdate:modelValue={toggleTheme}
        class={[
          isDark.value ? 'bg-indigo-600' : 'bg-gray-200',
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2',
        ]}
      >
        <span class="sr-only">Use setting</span>
        <span
          aria-hidden="true"
          class={[
            isDark.value ? 'translate-x-5' : 'translate-x-0',
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center',
          ]}
        >
          {isDark.value ? (
            <MoonIcon class="h-3 w-3 text-gray-400" />
          ) : (
            <SunIcon class="h-3 w-3 text-yellow-400" />
          )}
        </span>
      </Switch>
    )
  },
})
