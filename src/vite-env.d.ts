/// <reference types="vite/client" />

// Viteの ?raw サフィックスでGLSLファイルをstring型としてimportできるようにする
declare module '*.vert?raw' {
  const src: string
  export default src
}

declare module '*.frag?raw' {
  const src: string
  export default src
}
