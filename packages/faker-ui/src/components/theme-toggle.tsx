import { t } from '../i18n'

export interface ThemeToggleProps {
  theme: 'light' | 'dark'
  onChange: (theme: 'light' | 'dark') => void
}

export default function ThemeToggle(props: ThemeToggleProps): JSX.Element {
  const nextTheme = props.theme === 'dark' ? 'light' : 'dark'
  const label = t(nextTheme === 'dark' ? 'Use dark theme' : 'Use light theme')

  return (
    <zw-button
      class="studio-icon-button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={function (): void {
        props.onChange(nextTheme)
      }}
    >
      {props.theme === 'dark' ? (
        <zw-icon-sun size="18" />
      ) : (
        <zw-icon-moon size="18" />
      )}
    </zw-button>
  )
}
