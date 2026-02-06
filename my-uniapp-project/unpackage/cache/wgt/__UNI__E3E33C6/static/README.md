# 图片目录说明

## 目录结构

```
static/
  ├── banner/          # 横幅图片目录
  ├── doctor/          # 医生头像目录
  ├── hospital/        # 医院图片目录
  └── article/         # 文章配图目录
```

## 如何添加图片

### 方法1：直接拖放（推荐）
1. 打开文件管理器
2. 找到你的图片文件
3. 直接拖放到对应的目录中

例如：
- 横幅图片 → 拖到 `static/banner/` 目录
- 医生头像 → 拖到 `static/doctor/` 目录
- 医院图片 → 拖到 `static/hospital/` 目录
- 文章配图 → 拖到 `static/article/` 目录

### 方法2：复制粘贴
1. 复制你的图片文件
2. 在文件管理器中打开对应的目录
3. 粘贴图片文件

### 方法3：使用代码编辑器
1. 在 VS Code 或 HBuilderX 中
2. 右键点击目录 → 选择"在文件管理器中显示"
3. 将图片文件复制到打开的文件夹中

## 注意事项

1. **.gitkeep 文件**：这个文件只是用来保持目录结构的，可以保留，也可以删除，不影响图片使用

2. **图片格式**：支持 jpg、png、gif、webp 等常见格式

3. **图片命名**：建议使用有意义的名称，如：
   - `banner1.jpg`
   - `doctor-wang.jpg`
   - `hospital-xiehe.jpg`

4. **在代码中使用**：
   ```vue
   <!-- 横幅图片 -->
   <image src="/static/banner/banner1.jpg" mode="aspectFill"></image>
   
   <!-- 医生头像 -->
   <image src="/static/doctor/doctor1.jpg" mode="aspectFill"></image>
   
   <!-- 医院图片 -->
   <image src="/static/hospital/hospital1.jpg" mode="aspectFill"></image>
   
   <!-- 文章配图 -->
   <image src="/static/article/article1.jpg" mode="aspectFill"></image>
   ```

## 示例

假设你添加了以下图片：
- `static/banner/banner1.jpg` - 横幅图片
- `static/doctor/doctor1.jpg` - 医生头像
- `static/hospital/hospital1.jpg` - 医院图片
- `static/article/article1.jpg` - 文章配图

在代码中这样使用：
```javascript
const bannerImage = '/static/banner/banner1.jpg'
const doctorAvatar = '/static/doctor/doctor1.jpg'
const hospitalImage = '/static/hospital/hospital1.jpg'
const articleImage = '/static/article/article1.jpg'
```

