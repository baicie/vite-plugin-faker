export const themeState = $state({
  mode: 'light',
})

export function toggleMode() {
  const newMode = themeState.mode === 'light' ? 'dark' : 'light'
  setMode(newMode)
}

export function setMode(mode: 'light' | 'dark') {
  themeState.mode = mode
  if (typeof document !== 'undefined') {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', mode)
  }
}

export function initTheme() {
  if (typeof window === 'undefined') return

  const stored = localStorage.getItem('theme')
  if (stored === 'dark' || stored === 'light') {
    setMode(stored)
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    setMode('dark')
  } else {
    setMode('light')
  }
}
