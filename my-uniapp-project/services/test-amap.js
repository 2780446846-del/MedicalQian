// 测试高德地图API直接调用
const AMAP_KEY = 'aab8394f9ad4c8088514c3a844880440';
const AMAP_POI_SEARCH_URL = 'https://restapi.amap.com/v3/place/text';

// 模拟uni.request函数
async function mockUniRequest(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return {
      statusCode: response.status,
      data: data
    };
  } catch (error) {
    console.error('请求失败:', error);
    throw error;
  }
}

// 测试搜索医院
async function testSearchHospitals() {
  try {
    console.log('=== 开始测试高德API ===');
    
    const url = `${AMAP_POI_SEARCH_URL}?key=${AMAP_KEY}&keywords=医院&city=北京&offset=20&page=1`;
    console.log('请求URL:', url);
    
    const response = await mockUniRequest(url, {
      method: 'GET'
    });
    
    console.log('响应状态码:', response.statusCode);
    console.log('响应数据:', response.data);
    
    if (response.data.status === '1') {
      console.log('返回POI数量:', response.data.pois.length);
      
      // 测试过滤逻辑
      const hospitalPois = response.data.pois.filter(poi => {
        const isHospital = (
          (poi.typecode && poi.typecode.startsWith('08')) ||
          (poi.type && (poi.type.includes('医院') || poi.type.includes('医疗'))) ||
          (poi.name && poi.name.includes('医院'))
        );
        console.log(`POI: ${poi.name}, 类型: ${poi.type}, 类型编码: ${poi.typecode}, 是否医院: ${isHospital}`);
        return isHospital;
      });
      
      console.log('过滤后医院数量:', hospitalPois.length);
      console.log('过滤后医院列表:', hospitalPois);
    } else {
      console.error('API返回失败:', response.data.info);
    }
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 执行测试
testSearchHospitals();