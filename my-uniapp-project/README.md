# 2502B

#### 介绍
uni-app Vue 3 + TypeScript 项目

#### 软件架构
软件架构说明

#### 安装教程

1.  克隆项目到本地
2.  进入项目目录，安装依赖：`npm install`
3.  配置后端 API 地址（见下方配置说明）

#### 配置说明

**⚠️ 重要：在运行项目前，必须先配置后端 API 地址！**

1. **复制配置文件**
   ```sh
   cd utils
   cp config.example.js config.js
   ```

2. **修改配置文件 `utils/config.js`**
   ```javascript
   // API基础URL配置（用于HTTP请求）
   export const API_BASE_URL = 'http://localhost:3000/api'
   
   // Socket.IO 服务器地址（用于WebSocket连接）
   export const SOCKET_URL = 'http://localhost:3000'
   ```

3. **根据实际情况修改地址**
   - **本地开发**：如果后端运行在本机，使用 `http://localhost:3000`
   - **局域网**：如果后端运行在局域网其他电脑，使用 `http://后端IP地址:端口`
     - 例如：`http://192.168.1.100:3000/api`
   - **公网服务器**：如果后端部署在服务器，使用服务器地址
     - 例如：`http://your-domain.com/api`

4. **确保后端服务器已启动**
   - 后端项目位于 `../../houduan` 目录
   - 启动后端：`cd ../../houduan && node app.js`
   - 后端默认运行在 `http://localhost:3000`

#### 使用说明

1.  配置完成后，运行项目：`npm run dev`
2.  在 HBuilderX 中打开项目，选择运行到浏览器或小程序
3.  登录功能需要后端服务器正常运行才能使用

#### 注意事项

- `utils/config.js` 文件已添加到 `.gitignore`，不会被提交到 Git
- 每个开发者需要在本地创建自己的 `config.js` 文件
- 如果遇到 `ERR_CONNECTION_REFUSED` 错误，请检查：
  1. 后端服务器是否正在运行
  2. `config.js` 中的地址是否正确
  3. 防火墙是否阻止了连接

#### 参与贡献

1.  Fork 本仓库
2.  新建 Feat_xxx 分支
3.  提交代码
4.  新建 Pull Request


#### 特技

1.  使用 Readme\_XXX.md 来支持不同的语言，例如 Readme\_en.md, Readme\_zh.md
2.  Gitee 官方博客 [blog.gitee.com](https://blog.gitee.com)
3.  你可以 [https://gitee.com/explore](https://gitee.com/explore) 这个地址来了解 Gitee 上的优秀开源项目
4.  [GVP](https://gitee.com/gvp) 全称是 Gitee 最有价值开源项目，是综合评定出的优秀开源项目
5.  Gitee 官方提供的使用手册 [https://gitee.com/help](https://gitee.com/help)
6.  Gitee 封面人物是一档用来展示 Gitee 会员风采的栏目 [https://gitee.com/gitee-stars/](https://gitee.com/gitee-stars/)
