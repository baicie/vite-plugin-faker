declare module 'postcss-prefix-selector' {
  interface Options {
    prefix: string
    includeFiles?: RegExp[]
    excludeFiles?: RegExp[]
    transform?: (
      prefix: string,
      selector: string,
      prefixedSelector: string,
      filePath: string,
      rule: any,
    ) => string
  }

  function postcssPluginPrefixSelector(options: Options): any
  export = postcssPluginPrefixSelector
}
