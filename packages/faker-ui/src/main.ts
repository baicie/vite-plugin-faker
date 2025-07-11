import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

export const fakerUI = (target: HTMLElement) => {
  const app = mount(App, {
    target,
  })

  return app
}
export default fakerUI
