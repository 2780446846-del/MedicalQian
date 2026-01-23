# 图片使用指南

## 1. 图片存放位置

### 本地图片（开发阶段）
将图片放在 `static` 目录下：
```
my-uniapp-project/
  └── static/
      ├── logo.png          # 项目logo
      ├── banner/           # 横幅图片
      │   ├── banner1.jpg
      │   └── banner2.jpg
      ├── doctor/           # 医生头像
      │   ├── doctor1.jpg
      │   └── doctor2.jpg
      ├── hospital/         # 医院图片
      │   ├── hospital1.jpg
      │   └── hospital2.jpg
      └── article/          # 文章配图
          ├── article1.jpg
          └── article2.jpg
```

### 在代码中引用本地图片

#### 方式1：使用绝对路径（推荐）
```vue
<image src="/static/logo.png" mode="aspectFill"></image>
```

#### 方式2：使用相对路径
```vue
<image src="@/static/logo.png" mode="aspectFill"></image>
```

#### 方式3：在 data 中定义
```javascript
const imageUrl = ref('/static/logo.png')
// 或
const imageUrl = ref('@/static/logo.png')
```

## 2. 在首页中使用图片示例

### 横幅图片
```vue
<view class="banner-image">
  <image src="/static/banner/doctor-banner.jpg" mode="aspectFill" class="banner-img"></image>
</view>
```

### 医生头像
```javascript
const doctors = ref([
  {
    id: 1,
    name: '王医生',
    avatar: '/static/doctor/doctor1.jpg'  // 本地图片路径
  }
])
```

### 医院图片
```javascript
const hospitals = ref([
  {
    id: 1,
    name: '北京协和医院',
    image: '/static/hospital/hospital1.jpg'
  }
])
```

## 3. MongoDB 存储图片方案

### 方案说明
MongoDB 本身不适合直接存储大文件（图片），推荐方案：

#### 方案A：MongoDB 存储图片 URL（推荐）
1. 将图片上传到云存储（如：阿里云OSS、腾讯云COS、七牛云等）
2. MongoDB 只存储图片的 URL 地址
3. 前端通过 URL 加载图片

#### 方案B：使用 MongoDB GridFS（不推荐）
- 可以存储，但性能较差
- 适合小文件，不适合生产环境

### 实现步骤

#### 1. 后端 API 接口（Node.js + MongoDB 示例）

```javascript
// 上传图片到云存储，保存 URL 到 MongoDB
const uploadImage = async (req, res) => {
  // 1. 上传图片到云存储（阿里云OSS示例）
  const ossUrl = await uploadToOSS(req.file)
  
  // 2. 保存 URL 到 MongoDB
  const imageDoc = {
    url: ossUrl,
    type: 'doctor_avatar',
    uploadTime: new Date()
  }
  await db.collection('images').insertOne(imageDoc)
  
  res.json({ url: ossUrl })
}

// 获取图片列表
const getImages = async (req, res) => {
  const images = await db.collection('images').find({}).toArray()
  res.json(images)
}
```

#### 2. 前端调用 API 获取图片

```javascript
// 在 pages/index/index.vue 中
import { ref, onMounted } from 'vue'

// 医生数据（从 API 获取）
const doctors = ref([])

// 从后端获取医生列表（包含图片URL）
const loadDoctors = async () => {
  try {
    const res = await uni.request({
      url: 'https://your-api.com/api/doctors',
      method: 'GET'
    })
    
    if (res.statusCode === 200) {
      doctors.value = res.data.map(doctor => ({
        ...doctor,
        // MongoDB 返回的图片 URL
        avatar: doctor.avatarUrl || '/static/logo.png' // 默认图片
      }))
    }
  } catch (error) {
    console.error('加载医生列表失败:', error)
  }
}

onMounted(() => {
  loadDoctors()
})
```

#### 3. 在模板中使用

```vue
<view class="doctor-avatar">
  <image 
    :src="doctor.avatar" 
    mode="aspectFill" 
    class="avatar-img"
    @error="handleImageError"
  ></image>
</view>
```

```javascript
// 图片加载失败时的处理
const handleImageError = (e) => {
  e.target.src = '/static/logo.png' // 使用默认图片
}
```

## 4. 完整示例：从 MongoDB 加载图片

### 创建 API 工具文件

创建 `utils/api.js`:
```javascript
const BASE_URL = 'https://your-api.com/api'

// 请求封装
export const request = (options) => {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(res)
        }
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}

// 获取医生列表
export const getDoctors = () => {
  return request({
    url: '/doctors',
    method: 'GET'
  })
}

// 获取医院列表
export const getHospitals = () => {
  return request({
    url: '/hospitals',
    method: 'GET'
  })
}
```

### 在页面中使用

```javascript
import { getDoctors, getHospitals } from '@/utils/api'

const doctors = ref([])
const hospitals = ref([])

// 加载数据
const loadData = async () => {
  try {
    // 并行加载多个接口
    const [doctorsData, hospitalsData] = await Promise.all([
      getDoctors(),
      getHospitals()
    ])
    
    doctors.value = doctorsData
    hospitals.value = hospitalsData
  } catch (error) {
    console.error('加载数据失败:', error)
    uni.showToast({
      title: '加载失败，请重试',
      icon: 'none'
    })
  }
}

onMounted(() => {
  loadData()
})
```

## 5. 图片优化建议

1. **图片压缩**：上传前压缩图片，减小体积
2. **懒加载**：使用 `lazy-load` 属性
3. **占位图**：加载失败时显示默认图片
4. **CDN 加速**：使用 CDN 加速图片加载
5. **格式选择**：WebP 格式体积更小

```vue
<image 
  :src="doctor.avatar" 
  mode="aspectFill" 
  lazy-load
  :placeholder="'/static/logo.png'"
  @error="handleImageError"
></image>
```

## 6. 总结

- **开发阶段**：图片放在 `static` 目录，使用 `/static/xxx.jpg` 引用
- **生产环境**：图片上传到云存储，MongoDB 存储 URL，前端通过 API 获取
- **最佳实践**：使用云存储 + MongoDB URL 的方案，性能好、易维护

