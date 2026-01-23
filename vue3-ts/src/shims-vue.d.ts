declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 为 Vite 环境变量添加类型声明
declare interface ImportMeta {
  env: {
    [key: string]: string
    VITE_API_BASE_URL: string
  }
}

// 声明常用的全局变量
declare const window: Window & typeof globalThis
declare const document: Document
