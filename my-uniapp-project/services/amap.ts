// 高德地图API服务
const AMAP_KEY = 'aab8394f9ad4c8088514c3a844880440'
const AMAP_POI_SEARCH_URL = 'https://restapi.amap.com/v3/place/text' // POI搜索接口
const AMAP_POI_DETAIL_URL = 'https://restapi.amap.com/v3/place/detail' // POI详情接口

interface AmapPoiResult {
  status: string
  count: string
  info: string
  infocode: string
  pois: Array<{
    id: string
    name: string
    type: string
    typecode: string
    business_area: string
    location: string
    address: string
    tel: string
    website: string
    email: string
    pcode: string
    pname: string
    citycode: string
    cityname: string
    adcode: string
    adname: string
    entr_location: string
    exit_location: string
    poitype: string
    shopinfo: string
    rating: string
    cost: string
    navi_poiid: string
    alias: string
    indoor_map: string
    indoor_data: {
      cpid: string
      floor: string
      truefloor: string
      cid: string
    }
    groupbuy_num: string
    discount_num: string
    order_num: string
    photos: Array<{
      url: string
      title: string
    }>
    children: Array<any>
    distance: string
  }>
  suggestions: {
    keywords: Array<string>
    cities: Array<string>
  }
}

// POI详情响应接口
interface AmapPoiDetailResult {
  status: string
  info: string
  infocode: string
 pois: Array<{
    id: string
    name: string
    type: string
    typecode: string
    address: string
    location: string
    tel: string
    website: string
    email: string
    pcode: string
    pname: string
    citycode: string
    cityname: string
    adcode: string
    adname: string
    business_area: string
    shopinfo: string
    rating: string
    cost: string
    navi_poiid: string
    alias: string
    indoor_map: string
    indoor_data: {
      cpid: string
      floor: string
      truefloor: string
      cid: string
    }
    groupbuy_num: string
    discount_num: string
    order_num: string
    photos: Array<{
      url: string
      title: string
    }>
    children: Array<any>
    entrance_location: string
    exit_location: string
    biz_ext: {
      rating: string
      cost: string
      price: string
      open_time: string
      tag: string
      child_tag: string
      brand: string
      branch_tag: string
      service_tag: string
      facility_tag: string
      indoor_tag: string
    }
    event: string
    poiweight: string
    recommend: string
    timestamp: string
  }>
}

interface Hospital {
  id: number
  name: string
  level: string
  address: string
  distance: string
  isInternet: boolean
  departments: string[]
  image: string
  longitude: string
  latitude: string
  phone: string
  businessArea: string
  rating: string
  cost: string
}

/**
 * 搜索医院（支持模糊搜索）
 * @param city 城市名称
 * @param keywords 关键词
 * @param page 页码
 * @param filters 筛选条件
 * @returns 医院列表
 */
export const searchHospitals = async (city: string = '北京', keywords: string = '医院', page: number = 1, filters?: any): Promise<Hospital[]> => {
  try {
    // 添加详细调试信息
    console.log(`=== 开始调用高德API ===`)
    console.log(`搜索城市: ${city}`)
    console.log(`搜索关键词: ${keywords}`)
    
    // 使用默认城市"北京"，确保能获取到数据
    const cityToSearch = city || '北京'
    console.log(`传递给API的城市: ${cityToSearch}`)
    
    // 添加详细调试信息
    console.log(`筛选条件:`, filters)
    
    // 根据筛选条件构建API参数
    const apiParams: any = {
      key: AMAP_KEY,
      keywords: keywords || '医院', // 使用传入的关键词，如果没有则使用默认值"医院"
      city: cityToSearch,
      page: page,
      offset: 20
    }
    
    // 根据医院类型筛选
    if (filters && filters.hospitalType && filters.hospitalType !== '其他') {
      // 高德地图API的types参数格式：类型1|类型2|类型3
      // 这里根据医院类型设置合适的types参数
      const typeMap: Record<string, string> = {
        '综合医院': '090100',
        '儿童医院': '090101',
        '骨科医院': '090203',
        '妇产医院': '090201',
        '口腔医院': '090202',
        '肿瘤医院': '090204'
      }
      const typeCode = typeMap[filters.hospitalType]
      if (typeCode) {
        apiParams.types = typeCode
      }
    }
    
    // 根据距离筛选
    if (filters && filters.distance) {
      // 高德地图API的radius参数，单位：米
      const distanceMap: Record<string, number> = {
        '5km内': 5000,
        '10km内': 10000,
        '20km内': 20000,
        '50km内': 50000
      }
      const radius = distanceMap[filters.distance]
      if (radius) {
        apiParams.radius = radius
      }
    }
    
    // 调用高德地图API
    const response = await uni.request({
      url: AMAP_POI_SEARCH_URL,
      method: 'GET',
      data: apiParams
    })

    console.log(`API响应状态码: ${(response as any).statusCode}`)
    console.log(`API响应数据:`, (response as any).data)
    
    if ((response as any).statusCode === 200) {
      const data = (response as any).data
      if (data && data.status === '1') {
        console.log(`API返回POI数量: ${data.pois.length}`)
        
        // 打印所有返回的POI，查看具体数据
        console.log(`返回的POI详细数据:`, (response as any).data.pois)
        
        // 使用正确的类型编码，根据测试结果，医院的类型编码是09开头
        const hospitalPois = (response as any).data.pois.filter((poi: any) => {
          const isHospital = (
            // 类型编码以09开头（医疗卫生产业，根据测试结果修正）
            (poi.typecode && poi.typecode.startsWith('09')) ||
            // 类型名称包含医院、医疗等关键词
            (poi.type && (poi.type.includes('医院') || poi.type.includes('医疗'))) ||
            // 名称包含医院关键词
            (poi.name && poi.name.includes('医院'))
          )
          console.log(`POI: ${poi.name}, 类型: ${poi.type}, 类型编码: ${poi.typecode}, 是否医院: ${isHospital}`)
          return isHospital
        })
        
        console.log(`过滤后医院数量: ${hospitalPois.length}`)
        
        // 转换为医院数据结构
        let hospitals = hospitalPois.map((poi, index) => {
          const [longitude, latitude] = poi.location ? poi.location.split(',') : ['', '']
          const level = extractHospitalLevel(poi.name)
          const departments = extractDepartments(poi.type)
          
          // 使用POI的第一张图片，如果有
          const image = poi.photos && poi.photos.length > 0 ? poi.photos[0].url : '/static/hospital/hospital.png'
          
          return {
            id: index + 1,
            name: poi.name || '未知医院',
            level: level,
            address: poi.address || '暂无地址',
            distance: poi.distance ? `${poi.distance}m` : '0m',
            isInternet: false,
            departments: departments,
            image: image,
            longitude: longitude,
            latitude: latitude,
            phone: poi.tel || '',
            businessArea: poi.business_area || '',
            rating: poi.rating || '',
            cost: poi.cost || ''
          }
        })
        
        // 前端二次筛选
        if (filters || keywords) {
          // 服务类型筛选
          if (filters?.serviceType) {
            if (filters.serviceType === '互联网医院') {
              hospitals = hospitals.filter(hospital => hospital.isInternet)
            }
          }
          
          // 医院等级筛选
          if (filters?.hospitalLevel) {
            hospitals = hospitals.filter(hospital => {
              const levelMap: Record<string, string[]> = {
                '三甲医院': ['三甲'],
                '三级医院': ['三甲', '三乙', '三丙'],
                '二级医院': ['二甲', '二乙', '二丙'],
                '一级医院': ['一甲', '一乙', '一丙']
              }
              const levels = levelMap[filters.hospitalLevel] || []
              return levels.includes(hospital.level)
            })
          }
          
          // 关键词模糊搜索（前端二次筛选，提高搜索准确性）
          if (keywords && keywords !== '医院') {
            const keywordLower = keywords.toLowerCase()
            hospitals = hospitals.filter(hospital => {
              // 模糊匹配医院名称
              const nameMatch = hospital.name.toLowerCase().includes(keywordLower)
              // 模糊匹配医院地址
              const addressMatch = hospital.address.toLowerCase().includes(keywordLower)
              // 模糊匹配医院科室
              const departmentMatch = hospital.departments.some(dept => dept.toLowerCase().includes(keywordLower))
              
              return nameMatch || addressMatch || departmentMatch
            })
          }
        }
        
        console.log(`前端筛选后医院数量: ${hospitals.length}`)
        return hospitals
      } else {
        console.error(`API返回失败: ${(response as any).data.info}, 错误码: ${(response as any).data.infocode}`)
        return []
      }
    } else {
      console.error(`HTTP请求失败: ${(response as any).statusCode}`)
      return []
    }
  } catch (error) {
    console.error('搜索医院失败:', error)
    return []
  }
}

/**
 * 获取医院详细数据
 * @param poiId POI ID
 * @returns 医院详细数据
 */
export const getHospitalDetail = async (poiId: string): Promise<any> => {
  try {
    console.log(`=== 获取医院详情 ===`)
    console.log(`POI ID: ${poiId}`)
    
    const response = await uni.request({
      url: AMAP_POI_DETAIL_URL,
      method: 'GET',
      data: {
        key: AMAP_KEY,
        id: poiId, // POI ID
        extensions: 'all' // 获取完整信息
      }
    })
    
    console.log(`API响应状态码: ${(response as any).statusCode}`)
    console.log(`API响应数据:`, (response as any).data)
    
    if ((response as any).statusCode === 200 && (response as any).data.status === '1') {
      if ((response as any).data && (response as any).data.pois && (response as any).data.pois.length > 0) {
        console.log(`成功获取医院详情: ${(response as any).data.pois[0].name}`)
        return (response as any).data.pois[0]
      } else {
        console.log(`未找到医院详情`)
        return null
      }
    } else {
      console.error(`获取医院详情失败: ${(response as any).data.info}`)
      return null
    }
  } catch (error) {
    console.error('获取医院详情异常:', error)
    return null
  }
}

/**
 * 从医院名称中提取医院等级
 * @param hospitalName 医院名称
 * @returns 医院等级
 */
const extractHospitalLevel = (hospitalName: string): string => {
  if (hospitalName.includes('三甲') || hospitalName.includes('三级甲等')) {
    return '三甲'
  } else if (hospitalName.includes('三乙') || hospitalName.includes('三级乙等')) {
    return '三乙'
  } else if (hospitalName.includes('二甲') || hospitalName.includes('二级甲等')) {
    return '二甲'
  } else if (hospitalName.includes('二乙') || hospitalName.includes('二级乙等')) {
    return '二乙'
  } else if (hospitalName.includes('一甲') || hospitalName.includes('一级甲等')) {
    return '一甲'
  } else if (hospitalName.includes('一乙') || hospitalName.includes('一级乙等')) {
    return '一乙'
  } else {
    return '未知'
  }
}

/**
 * 从POI类型中提取科室信息
 * @param poiType POI类型
 * @returns 科室列表
 */
const extractDepartments = (poiType: string): string[] => {
  // 高德API的type字段格式：类型1;类型2;类型3
  const types = poiType.split(';')
  const departments: string[] = []
  
  // 根据类型提取科室
  types.forEach(type => {
    if (type.includes('综合医院')) {
      departments.push('综合医院')
    } else if (type.includes('专科医院')) {
      departments.push('专科医院')
    } else if (type.includes('内科')) {
      departments.push('内科')
    } else if (type.includes('外科')) {
      departments.push('外科')
    } else if (type.includes('儿科')) {
      departments.push('儿科')
    } else if (type.includes('妇产科')) {
      departments.push('妇产科')
    } else if (type.includes('眼科')) {
      departments.push('眼科')
    } else if (type.includes('口腔科')) {
      departments.push('口腔科')
    } else if (type.includes('耳鼻喉科')) {
      departments.push('耳鼻喉科')
    } else if (type.includes('皮肤科')) {
      departments.push('皮肤科')
    } else if (type.includes('神经科')) {
      departments.push('神经科')
    } else if (type.includes('骨科')) {
      departments.push('骨科')
    } else if (type.includes('心血管科')) {
      departments.push('心血管科')
    } else if (type.includes('呼吸科')) {
      departments.push('呼吸科')
    }
  })
  
  // 如果没有提取到科室，默认添加内科和外科
  if (departments.length === 0) {
    departments.push('内科', '外科')
  }
  
  return departments
}
