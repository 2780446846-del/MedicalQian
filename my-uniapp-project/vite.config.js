import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import fs from 'node:fs'
import path from 'node:path'

export default defineConfig({
  plugins: [uni()],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'cert/dev-key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'cert/dev-cert.pem')),    
    },
    host: '0.0.0.0',
    port: 5174,
  },
})