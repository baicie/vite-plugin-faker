const BROWSER_ONLY_MESSAGE =
  '@baicie/faker-ui can only mount Faker Studio in a browser environment'

export function fakerUI(target: string, wsUrl?: string): Promise<void> {
  void target
  void wsUrl
  return Promise.reject(new Error(BROWSER_ONLY_MESSAGE))
}

export default fakerUI
