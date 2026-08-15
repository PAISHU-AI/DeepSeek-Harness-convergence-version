declare module 'mammoth/mammoth.browser.js' {
  const mammoth: {
    extractRawText(input: { readonly arrayBuffer: ArrayBuffer }): Promise<{ readonly value: string }>
  }

  export default mammoth
}
