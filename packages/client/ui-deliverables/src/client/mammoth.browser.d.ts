declare module 'mammoth/mammoth.browser.js' {
  const mammoth: {
    convertToHtml(input: { readonly arrayBuffer: ArrayBuffer }): Promise<{ readonly value: string }>
  }
  export default mammoth
}
