# group-project

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) 
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### 配置后端 API 地址

**重要：在启动前端之前，请确保后端服务器已经运行！**

1. 如果需要修改后端 API 地址，请在项目根目录创建 `.env` 文件：

```env
# API 基础 URL 配置
# 默认: http://localhost:3000/api
# 如果后端运行在不同端口或地址，请修改此值
VITE_API_BASE_URL=http://localhost:3000/api
```

2. 后端服务器默认运行在 `http://localhost:3000`，如果后端端口不同，请修改 `.env` 文件中的 `VITE_API_BASE_URL`

3. **启动后端服务器**（在 `houduan` 目录）：
```sh
cd ../../houduan
npm install  # 如果是第一次运行
node app.js  # 或 npm start（如果有配置）
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

**⚠️ 故障排查：如果遇到 `ERR_CONNECTION_REFUSED` 错误**

这个错误表示前端无法连接到后端服务器，请按以下步骤检查：

1. **检查后端服务器是否正在运行**
   ```sh
   # 在 houduan 目录下启动后端
   cd ../../houduan
   node app.js
   ```
   应该看到类似输出：`🚀 服务器运行在 http://localhost:3000`

2. **检查后端端口配置**
   - 后端默认端口是 `3000`（在 `houduan/app.js` 中配置：`const port = process.env.PORT || 3000`）
   - 如果后端运行在不同端口，需要相应修改前端的 `.env` 文件

3. **检查前端 API 配置**
   - 复制 `.env.example` 为 `.env`（如果还没有）：
     ```sh
     cp .env.example .env
     ```
   - 确认 `.env` 文件中的 `VITE_API_BASE_URL` 与后端地址一致：
     ```env
     VITE_API_BASE_URL=http://localhost:3000/api
     ```
   - **修改 `.env` 后需要重启前端开发服务器**（停止后重新运行 `npm run dev`）

4. **常见问题**
   - 如果错误显示连接 `localhost:3001` 但后端运行在 `3000`，说明 `.env` 文件配置了错误的端口
   - 如果后端运行在 `3001`，请确保 `.env` 中配置为 `http://localhost:3001/api`
   - Vite 的环境变量需要在重启后生效，修改 `.env` 后必须重启前端服务器

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
npm run build

# Runs the end-to-end tests
npm run test:e2e
# Runs the tests only on Chromium
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- tests/example.spec.ts
# Runs the tests in debug mode
npm run test:e2e -- --debug
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
