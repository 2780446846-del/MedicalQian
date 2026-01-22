# Face-api.js 模型文件

## 自动下载（推荐）

代码已配置从 CDN 自动加载模型，无需手动下载。

## 手动下载（可选）

如果需要离线使用，可以从以下地址下载模型文件到 `public/models/` 目录：

1. **tiny_face_detector_model-weights_manifest.json** 和 **tiny_face_detector_model-shard1**
   - 下载地址：https://github.com/vladmandic/face-api/tree/master/model

2. **face_landmark_68_model-weights_manifest.json** 和 **face_landmark_68_model-shard1**
   - 下载地址：https://github.com/vladmandic/face-api/tree/master/model

3. **face_recognition_model-weights_manifest.json** 和 **face_recognition_model-shard1**
   - 下载地址：https://github.com/vladmandic/face-api/tree/master/model

## 使用说明

- 模型文件会自动从 CDN 加载（首次使用需要网络）
- 如果 CDN 加载失败，会自动尝试从本地 `public/models/` 目录加载
- 模型加载成功后，会显示 "✅ Face-api.js 模型加载成功"

