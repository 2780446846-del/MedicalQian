<template>
  <div class="china-map-wrapper">
    <div ref="mapRef" class="china-map-container"></div>
    <!-- 点击提示框 -->
    <Transition name="fade">
      <div v-if="showTip" class="province-tip" :style="tipStyle">
        <div class="tip-content">
          <div class="tip-title">{{ tipData.province }}</div>
          <div class="tip-value">
            <span class="tip-number">{{ tipData.count }}</span>
            <span class="tip-unit">名患者</span>
          </div>
          <!-- 城市列表 -->
          <div v-if="tipData.cities && tipData.cities.length > 0" class="tip-cities">
            <div class="cities-title">城市分布：</div>
            <div class="cities-list">
              <div 
                v-for="city in tipData.cities" 
                :key="city.name" 
                class="city-item"
              >
                <span class="city-name">{{ city.name }}</span>
                <span class="city-count">{{ city.count }}名</span>
              </div>
            </div>
          </div>
        </div>
        <div class="tip-arrow"></div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
// 导入echarts-gl以支持3D地图
import 'echarts-gl'
import { get } from '@/utils/request'

// Props定义
interface ProvinceData {
  name: string
  value: number
}

const props = defineProps<{
  data: ProvinceData[]
}>()

// 事件定义
const emit = defineEmits<{
  'province-click': [data: { province: string; provinceData: ProvinceData }]
  'province-hover': [data: { province: string; provinceData: ProvinceData }]
  'province-leave': []
  'map-blank-click': []
}>()

const mapRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

// 提示框相关
const showTip = ref(false)
const tipData = ref<{ province: string; count: number; cities?: Array<{ name: string; count: number }> }>({ 
  province: '', 
  count: 0,
  cities: []
})
const tipStyle = ref({ left: '0px', top: '0px' })
let tipTimer: number | null = null
const loadingCities = ref(false)

// 选中的省份
const selectedProvince = ref<string>('')

// 点击地图外区域时隐藏提示
const handleDocumentClick = (e: MouseEvent) => {
  if (mapRef.value && !mapRef.value.contains(e.target as Node)) {
    hideTip()
  }
}

onMounted(async () => {
  // 添加全局点击监听
  document.addEventListener('click', handleDocumentClick)
  
  // 延迟初始化，确保props.data已经传递
  setTimeout(async () => {
    await initMap()
  }, 200)
})

const initMap = async () => {
  if (!mapRef.value) return
  
  // 销毁旧实例并清理事件监听器
  if (chart) {
    chart.off('click')
    chart.off('mouseover')
    chart.off('mouseout')
    chart.off('georoam')
    chart.dispose()
    chart = null
  }
  
  // 使用WebGL渲染器以支持3D效果
  chart = echarts.init(mapRef.value, null, { renderer: 'canvas' })

  // 动态加载中国地图数据
  try {
    const response = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
    const chinaMapData = await response.json()
    echarts.registerMap('china', chinaMapData)
    console.log('✅ 中国地图数据加载成功')
  } catch (error) {
    console.error('❌ 地图数据加载失败:', error)
  }

  // 使用props数据
  const provinceData = props.data || []

  // 计算最大值，用于 visualMap
  const maxValue = provinceData.length > 0 
    ? Math.max(...provinceData.map(item => item.value), 100)
    : 100

  const option = {
    // 深色科技感背景
    backgroundColor: '#000000',
    graphic: [
      // 网格线
      {
        type: 'group',
        children: new Array(50).fill(0).map((_, i) => ({
          type: 'line',
          shape: { x1: i * 25, y1: 0, x2: i * 25, y2: 1000 },
          style: { 
            stroke: 'rgba(0, 255, 0, 0.08)',
            lineWidth: 1
          }
        }))
      },
      {
        type: 'group',
        children: new Array(40).fill(0).map((_, i) => ({
          type: 'line',
          shape: { x1: 0, y1: i * 25, x2: 1500, y2: i * 25 },
          style: { 
            stroke: 'rgba(0, 255, 0, 0.08)',
            lineWidth: 1
          }
        }))
      }
    ],
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderColor: '#00ff00',
      borderWidth: 2,
      textStyle: { 
        color: '#00ff00',
        fontSize: 14,
        fontWeight: 'bold'
      },
      formatter: (params: any) => {
        if (params.componentType === 'series' && (params.seriesType === 'map' || params.seriesType === 'map3D' || params.seriesType === 'geo3D')) {
          const fullData = provinceData.find(p => p.name === params.name || p.name.includes(params.name) || params.name.includes(p.name))
          if (fullData) {
            return `<div style="color: #00ff00; font-weight: bold;">${fullData.name}</div><div style="color: #ffa500; margin-top: 5px;">${fullData.value}名患者</div>`
          }
          return `<div style="color: #00ff00;">${params.name}: 0名患者</div>`
        }
        return `${params.name}: 0名患者`
      }
    },
    visualMap: {
      min: 0,
      max: maxValue,
      left: 'left',
      top: 'bottom',
      text: ['多', '少'],
      calculable: true,
      realtime: true,
      inRange: {
        // 科技感颜色渐变：从深色到青色到绿色到橙色，不那么绿
        color: ['#000000', '#001122', '#003344', '#00aaff', '#00ff88', '#ffa500', '#ff6600']
      },
      textStyle: {
        color: '#ffffff', // 改为白色，更清晰
        fontSize: 12,
        fontWeight: 'bold',
        textShadow: '0 0 5px rgba(0, 255, 0, 0.8)'
      },
      itemWidth: 20,
      itemHeight: 200,
      borderColor: '#00ff88',
      borderWidth: 2,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      itemGap: 5
    },
    series: [
      {
        name: '患者分布',
        type: 'map3D',
        map: 'china',
        roam: true,
        // 启用点击事件
        silent: false,
        // 启用选中状态
        selectedMode: false,
        // 3D视角配置
        viewControl: {
          projection: 'perspective',
          autoRotate: false, // 可以设置为true启用自动旋转
          autoRotateDirection: 'cw',
          autoRotateSpeed: 10,
          rotateSensitivity: 1.5, // 旋转灵敏度
          zoomSensitivity: 1.2, // 缩放灵敏度
          panSensitivity: 1, // 平移灵敏度
          distance: 150, // 初始距离
          minDistance: 60, // 最近距离
          maxDistance: 300, // 最远距离
          alpha: 30, // 上下旋转角度（0-180）
          beta: 0, // 左右旋转角度（-180-180）
          animation: true, // 启用动画
          animationDurationUpdate: 1000 // 动画时长
        },
        // 光照配置（调整为更柔和的青色，不那么绿）
        light: {
          main: {
            intensity: 1.3,
            shadow: true,
            shadowQuality: 'high',
            color: '#00aaff' // 改为青色，不那么绿
          },
          ambient: {
            intensity: 0.5,
            color: '#001122' // 深蓝色环境光
          }
        },
        // 地面配置（深色背景）
        groundPlane: {
          show: true,
          color: '#000000',
          opacity: 0.9
        },
        // 标签配置（使用更清晰的白色文字，带绿色边框）
        label: {
          show: true,
          color: '#ffffff', // 改为白色，更清晰
          fontSize: 13,
          fontFamily: 'Consolas, monospace',
          distance: 5,
          textStyle: {
            color: '#ffffff', // 白色文字
            fontSize: 13,
            fontWeight: 'bold',
            backgroundColor: 'rgba(0, 0, 0, 0.7)', // 深色背景
            borderColor: '#00ff00', // 绿色边框
            borderWidth: 1,
            borderRadius: 4,
            padding: [4, 8],
            textShadow: '0 0 5px rgba(0, 255, 0, 0.8), 0 0 10px rgba(0, 0, 0, 0.8)' // 绿色发光 + 黑色阴影
          },
          formatter: (params: any) => {
            const fullData = provinceData.find(p => p.name === params.name || p.name.includes(params.name) || params.name.includes(p.name))
            return fullData ? `${params.name}\n${fullData.value}名` : params.name
          }
        },
        // 区域样式（调整颜色，不那么绿，更清晰）
        itemStyle: {
          borderColor: '#00ff88', // 稍微淡一点的绿色
          borderWidth: 1.5,
          opacity: 0.85,
          shadowBlur: 8,
          shadowColor: 'rgba(0, 255, 136, 0.4)'
        },
        // 高亮样式（橙色/金色发光效果）
        emphasis: {
          label: {
            show: true,
            color: '#ffa500',
            fontSize: 16,
            fontWeight: 'bold',
            textShadow: '0 0 20px rgba(255, 165, 0, 1), 0 0 10px rgba(255, 165, 0, 0.8)'
          },
          itemStyle: {
            color: '#ff8c00',
            borderColor: '#ffa500',
            borderWidth: 4,
            opacity: 1,
            shadowBlur: 30,
            shadowColor: 'rgba(255, 165, 0, 1)'
          }
        },
        // 根据数据值设置高度
        shading: 'lambert',
        data: provinceData.map(item => {
          const isSelected = selectedProvince.value && (
            item.name === selectedProvince.value || 
            item.name.includes(selectedProvince.value) || 
            selectedProvince.value.includes(item.name)
          )
          
          return {
            name: item.name,
            value: item.value,
            // 根据患者数量设置高度（最小3，每名患者增加0.5）
            height: Math.max(item.value * 0.5, 3),
            // 选中时的特殊样式 - 橙色/金色发光效果
            itemStyle: isSelected ? {
              color: '#ff8c00', // 橙色背景
              borderColor: '#ffa500', // 金色边框
              borderWidth: 5,
              opacity: 1,
              shadowBlur: 40,
              shadowColor: 'rgba(255, 165, 0, 1)'
            } : undefined,
            // 选中时的标签样式
            label: isSelected ? {
              show: true,
              color: '#ffa500',
              fontSize: 18,
              fontWeight: 'bold',
              textShadow: '0 0 30px rgba(255, 165, 0, 1), 0 0 15px rgba(255, 165, 0, 0.8)'
            } : undefined
          }
        }),
        // 区域高度配置（基础高度）
        regionHeight: 2
      },
    ]
  }

  chart.setOption(option)
  
  // 如果有选中的省份，应用选中样式
  if (selectedProvince.value) {
    updateMapWithSelection()
  }

  // 添加事件监听器 - 移除旧的事件监听器避免重复绑定
  chart.off('click')
  chart.off('georoam')
  
  // 延迟绑定事件，确保地图完全渲染
  setTimeout(() => {
    if (!chart) return
    
    chart.on('click', (params: any) => {
      console.log('🔵 地图点击事件触发:', {
        componentType: params.componentType,
        seriesType: params.seriesType,
        name: params.name,
        data: params.data,
        event: params.event
      })
      
      // 对于 map3D，检查不同的参数结构
      if (params.componentType === 'series') {
        const seriesType = params.seriesType || params.seriesType
        if (seriesType === 'map3D' || seriesType === 'geo3D' || seriesType === 'map') {
          // 尝试多种方式获取省份名称
          const provinceName = params.name || 
                              params.data?.name || 
                              params.data?.value?.name ||
                              (params.data && typeof params.data === 'object' ? params.data.name : null) ||
                              ''
          
          if (!provinceName) {
            console.warn('⚠️ 无法获取省份名称，参数:', params)
            return
          }
          
          console.log('✅ 点击的省份:', provinceName)
          
          const provinceInfo = provinceData.find(p => 
            p.name === provinceName || 
            p.name.includes(provinceName) || 
            provinceName.includes(p.name)
          )
          const clickedData = provinceInfo || { name: provinceName, value: 0 }
          
          // 更新选中的省份（触发背景颜色变化）
          selectedProvince.value = provinceName
          
          // 显示提示框
          showProvinceTip(params, clickedData)
          
          // 更新地图，应用选中样式
          updateMapWithSelection()
          
          emit('province-click', {
            province: provinceName,
            provinceData: clickedData
          })
          
          return
        }
      }
      
      // 点击空白区域，取消选中
      if (params.componentType !== 'series') {
        console.log('点击空白区域')
        selectedProvince.value = ''
        updateMapWithSelection()
        emit('map-blank-click')
        hideTip()
      }
    })
    
    // 也监听 georoam 事件（3D地图的交互事件）
    chart.on('georoam', () => {
      // 地图交互时不做处理，只是确保事件系统正常工作
    })
    
    console.log('✅ 地图事件监听器已绑定')
  }, 300)

  chart.on('mouseover', (params: any) => {
    if (params.componentType === 'series' && (params.seriesType === 'map' || params.seriesType === 'map3D' || params.seriesType === 'geo3D')) {
      const provinceInfo = provinceData.find(p => p.name === params.name || p.name.includes(params.name) || params.name.includes(p.name))
      emit('province-hover', {
        province: params.name,
        provinceData: provinceInfo || { name: params.name, value: 0 }
      })
    }
  })

  chart.on('mouseout', () => {
    emit('province-leave')
  })
}

// 省份名称映射（地图名称 -> 地址中可能的名称）
const provinceNameMap: Record<string, string[]> = {
  '北京': ['北京', '北京市'],
  '上海': ['上海', '上海市'],
  '天津': ['天津', '天津市'],
  '重庆': ['重庆', '重庆市'],
  '河北': ['河北', '河北省'],
  '山西': ['山西', '山西省'],
  '内蒙古': ['内蒙古', '内蒙古自治区', '内蒙古省'],
  '辽宁': ['辽宁', '辽宁省'],
  '吉林': ['吉林', '吉林省'],
  '黑龙江': ['黑龙江', '黑龙江省'],
  '江苏': ['江苏', '江苏省'],
  '浙江': ['浙江', '浙江省'],
  '安徽': ['安徽', '安徽省'],
  '福建': ['福建', '福建省'],
  '江西': ['江西', '江西省'],
  '山东': ['山东', '山东省'],
  '河南': ['河南', '河南省'],
  '湖北': ['湖北', '湖北省'],
  '湖南': ['湖南', '湖南省'],
  '广东': ['广东', '广东省'],
  '广西': ['广西', '广西壮族自治区', '广西省'],
  '海南': ['海南', '海南省'],
  '四川': ['四川', '四川省'],
  '贵州': ['贵州', '贵州省'],
  '云南': ['云南', '云南省'],
  '西藏': ['西藏', '西藏自治区'],
  '陕西': ['陕西', '陕西省'],
  '甘肃': ['甘肃', '甘肃省'],
  '青海': ['青海', '青海省'],
  '宁夏': ['宁夏', '宁夏回族自治区', '宁夏省'],
  '新疆': ['新疆', '新疆维吾尔自治区', '新疆省'],
  // 处理地图中可能出现的完整名称
  '北京市': ['北京', '北京市'],
  '上海市': ['上海', '上海市'],
  '天津市': ['天津', '天津市'],
  '重庆市': ['重庆', '重庆市'],
  '河北省': ['河北', '河北省'],
  '山西省': ['山西', '山西省'],
  '内蒙古自治区': ['内蒙古', '内蒙古自治区', '内蒙古省'],
  '辽宁省': ['辽宁', '辽宁省'],
  '吉林省': ['吉林', '吉林省'],
  '黑龙江省': ['黑龙江', '黑龙江省'],
  '江苏省': ['江苏', '江苏省'],
  '浙江省': ['浙江', '浙江省'],
  '安徽省': ['安徽', '安徽省'],
  '福建省': ['福建', '福建省'],
  '江西省': ['江西', '江西省'],
  '山东省': ['山东', '山东省'],
  '河南省': ['河南', '河南省'],
  '湖北省': ['湖北', '湖北省'],
  '湖南省': ['湖南', '湖南省'],
  '广东省': ['广东', '广东省'],
  '广西壮族自治区': ['广西', '广西壮族自治区', '广西省'],
  '海南省': ['海南', '海南省'],
  '四川省': ['四川', '四川省'],
  '贵州省': ['贵州', '贵州省'],
  '云南省': ['云南', '云南省'],
  '西藏自治区': ['西藏', '西藏自治区'],
  '陕西省': ['陕西', '陕西省'],
  '甘肃省': ['甘肃', '甘肃省'],
  '青海省': ['青海', '青海省'],
  '宁夏回族自治区': ['宁夏', '宁夏回族自治区', '宁夏省'],
  '新疆维吾尔自治区': ['新疆', '新疆维吾尔自治区', '新疆省']
}

// 从地址中提取城市名称
const extractCityFromAddress = (address: string, provinceName: string): string | null => {
  if (!address) return null
  
  // 获取省份的所有可能名称
  const provinceNames = provinceNameMap[provinceName] || [provinceName]
  
  // 检查地址是否包含该省份
  const hasProvince = provinceNames.some(name => address.includes(name))
  if (!hasProvince) return null
  
  // 尝试提取城市名称（格式：XX市、XX区、XX县等）
  const cityPatterns = [
    /([^省市区县]+?[市区县])/g,
    /([^省市区县]+?市)/g,
    /([^省市区县]+?区)/g,
    /([^省市区县]+?县)/g
  ]
  
  for (const pattern of cityPatterns) {
    const matches = address.match(pattern)
    if (matches && matches.length > 0) {
      // 返回第一个匹配的城市（排除省份名）
      const city = matches[0]
      if (!provinceNames.some(name => city.includes(name))) {
        return city
      }
    }
  }
  
  // 如果没有找到城市，返回省份名
  return provinceName
}

// 获取省份下的城市分布数据
const fetchCityData = async (provinceName: string) => {
  try {
    loadingCities.value = true
    
    // 获取所有患者数据（不分页）
    const response = await get<{
      success: boolean
      data: Array<{ address?: string }> | { data: Array<{ address?: string }> }
    }>('/patients', { 
      data: { page: 1, pageSize: 10000 } 
    })
    
    // 处理不同的响应结构
    let patients: Array<{ address?: string }> = []
    if (response.success) {
      if (Array.isArray(response.data)) {
        patients = response.data
      } else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        patients = (response.data as any).data || []
      }
    }
    
    if (patients.length === 0) {
      return []
    }
    
    // 获取省份的所有可能名称
    const provinceNames = provinceNameMap[provinceName] || [provinceName]
    
    // 筛选该省份的患者
    const provincePatients = patients.filter((patient: any) => {
      if (!patient.address) return false
      const address = String(patient.address)
      return provinceNames.some(name => address.includes(name))
    })
    
    // 统计各城市的患者数量
    const cityCount: Record<string, number> = {}
    
    provincePatients.forEach((patient: any) => {
      const city = extractCityFromAddress(String(patient.address || ''), provinceName)
      if (city && city !== provinceName) {
        cityCount[city] = (cityCount[city] || 0) + 1
      }
    })
    
    // 转换为数组并排序
    const cities = Object.entries(cityCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // 最多显示10个城市
    
    return cities
  } catch (error) {
    console.error('获取城市数据失败:', error)
    return []
  } finally {
    loadingCities.value = false
  }
}

// 显示省份提示
const showProvinceTip = async (params: any, data: ProvinceData) => {
  if (!mapRef.value || !chart) return
  
  // 清除之前的定时器
  if (tipTimer) {
    clearTimeout(tipTimer)
  }
  
  // 获取点击位置 - 尝试多种方式获取坐标
  let clickX = 0
  let clickY = 0
  
  if (params.event) {
    // 优先使用事件对象的坐标
    if (params.event.offsetX !== undefined) {
      clickX = params.event.offsetX
      clickY = params.event.offsetY
    } else if (params.event.clientX !== undefined) {
      // 使用clientX/Y，需要减去容器的偏移
      const rect = mapRef.value.getBoundingClientRect()
      clickX = params.event.clientX - rect.left
      clickY = params.event.clientY - rect.top
    }
  }
  
  // 如果还是没有获取到，使用地图中心位置
  if (clickX === 0 && clickY === 0) {
    const rect = mapRef.value.getBoundingClientRect()
    clickX = rect.width / 2
    clickY = rect.height / 2
  }
  
  // 先显示基本信息
  tipData.value = {
    province: data.name,
    count: data.value,
    cities: []
  }
  
  // 计算提示框位置（在点击位置附近）
  const tipWidth = 280
  const tipHeight = 150
  const offsetX = 20
  const offsetY = -150
  
  let left = clickX + offsetX
  let top = clickY + offsetY
  
  // 确保提示框不超出容器
  const containerRect = mapRef.value.getBoundingClientRect()
  if (left + tipWidth > containerRect.width) {
    left = clickX - tipWidth - offsetX
  }
  if (top + tipHeight > containerRect.height) {
    top = clickY - tipHeight - offsetY
  }
  if (left < 0) left = 20
  if (top < 0) top = 20
  
  tipStyle.value = {
    left: `${left}px`,
    top: `${top}px`
  }
  
  // 显示提示
  showTip.value = true
  
  // 异步获取城市数据
  const cities = await fetchCityData(data.name)
  tipData.value = {
    province: data.name,
    count: data.value,
    cities: cities
  }
  
  // 5秒后自动隐藏（延长显示时间）
  tipTimer = window.setTimeout(() => {
    hideTip()
  }, 5000)
}

// 隐藏提示
const hideTip = () => {
  showTip.value = false
  if (tipTimer) {
    clearTimeout(tipTimer)
    tipTimer = null
  }
}

// 更新地图，应用选中样式
const updateMapWithSelection = () => {
  if (!chart || !mapRef.value) return
  
  const provinceData = props.data || []
  
  // 更新series数据，应用选中样式
  chart.setOption({
    series: [{
      data: provinceData.map(item => {
        const isSelected = selectedProvince.value && (
          item.name === selectedProvince.value || 
          item.name.includes(selectedProvince.value) || 
          selectedProvince.value.includes(item.name)
        )
        
        return {
          name: item.name,
          value: item.value,
          height: Math.max(item.value * 0.5, 3),
          // 选中时的特殊样式 - 醒目的颜色效果
          itemStyle: isSelected ? {
            color: '#00f2fe', // 醒目的青色背景
            borderColor: '#ffff00', // 黄色边框
            borderWidth: 5,
            opacity: 1,
            shadowBlur: 25,
            shadowColor: 'rgba(0, 242, 254, 0.9)'
          } : undefined,
          // 选中时的标签样式
          label: isSelected ? {
            show: true,
            color: '#ffff00',
            fontSize: 18,
            fontWeight: 'bold',
            textShadow: '0 0 20px rgba(255, 255, 0, 1), 0 0 10px rgba(255, 255, 0, 0.8)'
          } : undefined
        }
      })
    }]
  }, { notMerge: false, lazyUpdate: false })
}

// 监听props数据变化，重新渲染地图
watch(() => props.data, () => {
  setTimeout(() => {
    initMap()
  }, 100)
}, { deep: true })

// 窗口resize时自适应
window.addEventListener('resize', () => {
  if (chart) chart.resize()
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  if (tipTimer) {
    clearTimeout(tipTimer)
  }
  if (chart) {
    chart.dispose()
  }
})
</script>

<style scoped>
.china-map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.china-map-container {
  width: 100%;
  height: 100%;
}

/* 省份提示框 - 更大更醒目 */
.province-tip {
  position: absolute;
  z-index: 1000;
  pointer-events: none;
  animation: tipPop 0.4s ease-out;
}

.tip-content {
  background: linear-gradient(135deg, rgba(255, 165, 0, 0.95) 0%, rgba(255, 140, 0, 0.95) 100%);
  border: 3px solid #ffff00;
  border-radius: 16px;
  padding: 24px 32px;
  box-shadow: 0 10px 40px rgba(255, 165, 0, 0.6),
              0 0 30px rgba(255, 255, 0, 0.5),
              inset 0 2px 0 rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(15px);
  min-width: 280px;
  max-width: 350px;
  text-align: center;
  animation: tipPulse 2s ease-in-out infinite;
}

.tip-title {
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 12px;
  text-shadow: 0 3px 6px rgba(0, 0, 0, 0.5),
               0 0 15px rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  letter-spacing: 1px;
}

.tip-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
}

.tip-number {
  color: #ffff00;
  font-size: 56px;
  font-weight: bold;
  line-height: 1;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.6),
               0 0 30px rgba(255, 255, 0, 0.8),
               0 0 20px rgba(255, 255, 0, 0.6);
  font-family: 'Consolas', 'Monaco', monospace;
  letter-spacing: 2px;
}

.tip-unit {
  color: rgba(255, 255, 255, 0.95);
  font-size: 20px;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

/* 城市列表样式 */
.tip-cities {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px solid rgba(255, 255, 255, 0.3);
  max-height: 200px;
  overflow-y: auto;
}

.cities-title {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
  text-align: left;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

.cities-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 150px;
  overflow-y: auto;
}

.city-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;
}

.city-item:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 0, 0.5);
}

.city-name {
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.city-count {
  color: #ffff00;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', monospace;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5),
               0 0 10px rgba(255, 255, 0, 0.5);
}

.tip-arrow {
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-top: 12px solid #ffff00;
  filter: drop-shadow(0 3px 6px rgba(255, 255, 0, 0.5));
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.9);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.9);
}

/* 弹出动画 - 更明显的效果 */
@keyframes tipPop {
  0% {
    opacity: 0;
    transform: translateY(-30px) scale(0.6);
  }
  50% {
    transform: translateY(-8px) scale(1.1);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 持续闪烁效果 */
@keyframes tipPulse {
  0%, 100% {
    box-shadow: 0 10px 40px rgba(255, 165, 0, 0.6),
                0 0 30px rgba(255, 255, 0, 0.5);
  }
  50% {
    box-shadow: 0 10px 50px rgba(255, 165, 0, 0.8),
                0 0 40px rgba(255, 255, 0, 0.7);
  }
}
</style>
