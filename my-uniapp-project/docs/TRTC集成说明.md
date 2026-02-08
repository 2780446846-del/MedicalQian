# 腾讯云 TRTC APP 端音视频通话集成说明

咨询聊天页在 **APP 端**点击「视频通话」或「语音通话」会跳转到 TRTC 通话页。按以下步骤配置后即可使用真实音视频通话。

## 一、腾讯云控制台

1. 登录 [腾讯云实时音视频控制台](https://console.cloud.tencent.com/trtc)
2. 创建应用，获取 **SDKAppID** 和 **SecretKey**（在「应用管理」→「快速上手」中查看）

## 二、后端配置（MedicalHou）

1. 在 MedicalHou 的 `.env` 中增加（已预留位置）：
   ```env
   TRTC_SDK_APP_ID=你的SDKAppID
   TRTC_SECRET_KEY=你的SecretKey
   ```
2. 重启后端，确保接口 `GET /api/trtc/userSig?userId=xxx` 返回 `{ userSig, sdkAppId }`

## 三、前端配置（my-uniapp-project）

1. **UserSig 地址**  
   已默认使用当前项目的 `API_BASE_URL` 推导（即请求 `后端根地址/api/trtc/userSig`）。若后端地址不同，可在 `utils/trtcConfig.js` 中修改 `GET_USER_SIG_URL`。

2. **TRTC 原生插件（必须）**  
   - 使用 HBuilderX 打开项目  
   - 在 [DCloud 插件市场](https://ext.dcloud.net.cn/plugin?id=7774) 安装「【官方】腾讯云实时音视频 SDK」  
   - 安装后插件通常位于 `uni_modules` 或项目根目录，请查看插件说明中的引入方式  

3. **trtc-call 页面中的插件路径**  
   - 打开 `pages/online-consult/trtc-call.vue`  
   - 在 `onMounted` 里找到 `require('@/uni_modules/trtc-sdk-app/TrtcCloud.js')`  
   - 若插件安装路径不同，请改为你项目中的实际路径（参考插件文档）

4. **自定义调试基座**  
   - 菜单：运行 → 运行到手机或模拟器 → 制作自定义调试基座  
   - 打包完成后，选择「运行基座」为自定义调试基座，再运行到真机  

## 四、医生端

医生端（vue3-ts）若也要接 TRTC，可复用同一套：  
- 使用同一 SDKAppID，同一 roomId 规则（如 `consult_医生ID_患者ID`）  
- 医生进房时用医生 userId 向同一后端 `/api/trtc/userSig` 获取 UserSig 即可  

## 五、当前行为

- **未配置或未安装插件时**：进入通话页会显示配置说明与插件链接，不会报错。  
- **已配置且已安装插件时**：进入通话页会拉取 UserSig、进房并展示本地/远端画面（需按插件文档绑定视图组件）。  

如有问题可参考 [腾讯云 TRTC uni-app 文档](https://cloud.tencent.com/document/product/647/72629)。
