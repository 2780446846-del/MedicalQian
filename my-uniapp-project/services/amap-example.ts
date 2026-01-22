// 高德地图API服务示例
// 本示例展示如何使用高德地图API获取各个城市的医院数据
import { searchHospitals } from './amap'

/**
 * 示例：获取多个城市的医院数据
 */
export const getHospitalsForMultipleCities = async () => {
  // 要查询的城市列表
  const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安']
  
  // 存储所有城市的医院数据
  const allHospitals: Record<string, any[]> = {}
  
  try {
    // 遍历城市列表，获取每个城市的医院数据
    for (const city of cities) {
      console.log(`正在获取${city}的医院数据...`)
      const hospitals = await searchHospitals(city)
      allHospitals[city] = hospitals
      console.log(`${city}共获取到${hospitals.length}家医院`)
    }
    
    console.log('所有城市的医院数据获取完成：')
    console.log(allHospitals)
    
    return allHospitals
  } catch (error) {
    console.error('获取医院数据失败：', error)
    return allHospitals
  }
}

/**
 * 示例：获取单个城市的医院数据并处理
 */
export const getHospitalsForSingleCity = async (city: string = '北京') => {
  try {
    console.log(`正在获取${city}的医院数据...`)
    const hospitals = await searchHospitals(city)
    
    console.log(`${city}的医院数据：`)
    hospitals.forEach((hospital, index) => {
      console.log(`${index + 1}. ${hospital.name}`)
      console.log(`   等级：${hospital.level}`)
      console.log(`   地址：${hospital.address}`)
      console.log(`   距离：${hospital.distance}`)
      console.log(`   科室：${hospital.departments.join(', ')}`)
      console.log(`   图片：${hospital.image}`)
      console.log('----------------------------------------')
    })
    
    return hospitals
  } catch (error) {
    console.error(`获取${city}医院数据失败：`, error)
    return []
  }
}

/**
 * 示例：根据关键词搜索特定医院
 */
export const searchSpecificHospital = async (keyword: string = '协和医院', city: string = '北京') => {
  try {
    console.log(`正在搜索${city}的${keyword}...`)
    const hospitals = await searchHospitals(city, keyword)
    
    console.log(`搜索结果（共${hospitals.length}家医院）：`)
    hospitals.forEach((hospital, index) => {
      console.log(`${index + 1}. ${hospital.name}`)
      console.log(`   等级：${hospital.level}`)
      console.log(`   地址：${hospital.address}`)
      console.log(`   距离：${hospital.distance}`)
      console.log(`   科室：${hospital.departments.join(', ')}`)
      console.log(`   图片：${hospital.image}`)
      console.log('----------------------------------------')
    })
    
    return hospitals
  } catch (error) {
    console.error(`搜索${keyword}失败：`, error)
    return []
  }
}

/**
 * 示例：获取医院的详细信息
 * 注意：高德地图POI搜索API返回的是医院的基本信息，如果需要更详细的信息，可能需要调用其他API
 */
export const getHospitalDetails = async (hospitalId: string, city: string = '北京') => {
  try {
    console.log(`正在获取医院ID为${hospitalId}的详细信息...`)
    // 由于高德地图POI搜索API返回的信息已经比较详细，这里我们可以直接使用searchHospitals函数
    // 如果需要更详细的信息，可以考虑调用高德地图的其他API，如POI详情API
    const hospitals = await searchHospitals(city)
    const hospital = hospitals.find(h => h.id.toString() === hospitalId)
    
    if (hospital) {
      console.log('医院详细信息：')
      console.log(JSON.stringify(hospital, null, 2))
      return hospital
    } else {
      console.log('未找到该医院')
      return null
    }
  } catch (error) {
    console.error('获取医院详细信息失败：', error)
    return null
  }
}

// 调用示例
// 如果在uni-app环境中，可以在页面的onMounted钩子中调用
// 如果在Node.js环境中，需要修改amap.ts中的uni.request为其他HTTP请求库，如axios

// 示例调用方式：
// getHospitalsForMultipleCities()
// getHospitalsForSingleCity('上海')
// searchSpecificHospital('协和医院', '北京')
// getHospitalDetails('1', '北京')
