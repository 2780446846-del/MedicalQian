import { wgs84ToGcj02, gcj02ToWgs84 } from './coordinateTransform.js';
import { AMAP_WEB_KEY } from './amapConfig.js';

/**
 * 位置信息接口
 */
export interface LocationInfo {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  province?: string;
}

/**
 * 获取用户当前位置
 * @returns Promise<LocationInfo>
 */
export function getUserLocation(): Promise<LocationInfo> {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    // H5环境下先获取wgs84坐标，再手动转换为gcj02
    uni.getLocation({
      type: 'wgs84',
      altitude: false,
      success: (res) => {
        // 转换为gcj02坐标
        const gcj02 = wgs84ToGcj02(res.longitude, res.latitude);
        resolve({
          latitude: gcj02.lat,
          longitude: gcj02.lng
        });
      },
      fail: (err) => {
        reject(new Error(`获取位置失败: ${err.errMsg}`));
      }
    });
    // #endif
    // #ifndef H5
    // 非H5环境直接使用gcj02坐标
    uni.getLocation({
      type: 'gcj02', // 返回国测局坐标，适用于高德、腾讯地图
      altitude: false,
      success: (res) => {
        resolve({
          latitude: res.latitude,
          longitude: res.longitude
        });
      },
      fail: (err) => {
        reject(new Error(`获取位置失败: ${err.errMsg}`));
      }
    });
    // #endif
  });
}

/**
 * 打开地图导航
 * @param destination 目的地位置信息
 * @param options 导航选项
 */
export function openMapNavigation(destination: LocationInfo, options?: {
  mode?: 'drive' | 'walk' | 'bike' | 'bus';
  mapType?: string;
  origin?: LocationInfo;
  destinationName?: string;
}) {
  const { origin } = options || {};

  // 如果没有提供起点，使用当前位置
  if (!origin) {
    getUserLocation().then(userLocation => {
      openMapNavigationInternal(destination, {
        ...options,
        origin: userLocation
      });
    }).catch(err => {
      uni.showToast({
        title: '获取位置失败，无法导航',
        icon: 'error'
      });
      console.error('获取位置失败:', err);
    });
    return;
  }

  openMapNavigationInternal(destination, {
    ...options,
    origin: origin
  });
}

/**
 * 打开地图导航内部实现
 */
function openMapNavigationInternal(
  destination: LocationInfo,
  options: {
    mode?: 'drive' | 'walk' | 'bike' | 'bus';
    mapType?: string;
    origin: LocationInfo;
    destinationName?: string;
  }
) {
  const {
    mode = 'drive',
    mapType = 'auto',
    origin,
    destinationName = '目的地'
  } = options;

  const { latitude: destLat, longitude: destLng } = destination;
  const { latitude: originLat, longitude: originLng } = origin;

  // 坐标转换
  const baiduDest = gcj02ToBaidu(destLng, destLat);
  const baiduOrigin = gcj02ToBaidu(originLng, originLat);

  let navUrl = '';
  let isWebUrl = false;

  // #ifdef H5
  // H5环境下使用网页版地图，使用经过验证的可靠URL
  switch (mapType) {
    case 'gaode':
      // 高德地图网页版，已验证能正常工作
      navUrl = `https://uri.amap.com/navigation?from=${originLng},${originLat},我的位置&to=${destLng},${destLat},${encodeURIComponent(destinationName)}&mode=${mode}&src=myapp`;
      isWebUrl = true;
      break;
    
    case 'baidu':
      // 百度地图网页版，自动填充起点和终点并规划路线
      // 使用百度地图API的direction接口，格式：origin=latlng:纬度,经度|name:名称&destination=latlng:纬度,经度|name:名称&mode=导航模式&output=html
      // 注意：百度地图需要使用BD09坐标系统，必须指定output=html才能显示路线规划页面
      // 添加region参数可以提高路线规划的准确性
      const cityName = origin.city || destination.city || '全国';
      navUrl = `http://api.map.baidu.com/direction?origin=latlng:${baiduOrigin.lat},${baiduOrigin.lng}|name:${encodeURIComponent('我的位置')}&destination=latlng:${baiduDest.lat},${baiduDest.lng}|name:${encodeURIComponent(destinationName)}&mode=${modeToBaiduType(mode)}&output=html&coord_type=bd09ll&region=${encodeURIComponent(cityName)}&src=webapp.myapp`;
      isWebUrl = true;
      break;
    
    case 'qqmap':
      // 腾讯地图，直接进入路线规划页面并自动填充起点和终点
      // 使用腾讯地图API的routeplan接口，格式：from=名称&fromcoord=纬度,经度&to=名称&tocoord=纬度,经度&type=导航模式
      // 注意：腾讯地图使用GCJ02坐标系统，参数顺序为：纬度,经度
      navUrl = `https://apis.map.qq.com/uri/v1/routeplan?type=${modeToQQType(mode)}&from=${encodeURIComponent('我的位置')}&fromcoord=${originLat},${originLng}&to=${encodeURIComponent(destinationName)}&tocoord=${destLat},${destLng}&policy=1&referer=myapp`;
      isWebUrl = true;
      break;
    
    case 'auto':
    default:
      // 自动选择地图，显示选择菜单
      showMapSelection({
        origin,
        destination,
        destinationName,
        mode
      });
      return;
  }
  // #endif
  
  // #ifndef H5
  // 非H5环境使用URL Scheme
  if (mapType === 'gaode') {
    // 高德地图导航
    navUrl = `amapuri://route/plan?sourceApplication=myapp&slat=${originLat}&slon=${originLng}&sname=我的位置&dlat=${destLat}&dlon=${destLng}&dname=${encodeURIComponent(destinationName)}&dev=0&t=${modeToGaodeType(mode)}`;
  } else if (mapType === 'baidu') {
    // 百度地图导航（App端），自动填充起点和终点并规划路线
    // 注意：App端需要使用百度坐标，所以使用baiduDest和baiduOrigin
    navUrl = `baidumap://map/direction?origin=latlng:${baiduOrigin.lat},${baiduOrigin.lng}|name:我的位置&destination=latlng:${baiduDest.lat},${baiduDest.lng}|name:${encodeURIComponent(destinationName)}&mode=${modeToBaiduType(mode)}&coord_type=bd09ll`;
  } else if (mapType === 'qqmap') {
    // 腾讯地图导航
    navUrl = `qqmap://map/routeplan?type=${modeToQQType(mode)}&from=我的位置&fromcoord=${originLat},${originLng}&to=${encodeURIComponent(destinationName)}&tocoord=${destLat},${destLng}&policy=1&referer=myapp`;
  } else {
    // 自动选择地图，显示选择菜单
    showMapSelection({
      origin,
      destination,
      destinationName,
      mode
    });
    return;
  }
  // #endif

  // 打开地图
  // #ifdef H5
  // H5环境下直接使用window.open打开地图网页
  window.open(navUrl, '_blank');
  // #endif
  // #ifndef H5
  // 非H5环境使用openMapUrl函数
  openMapUrl(navUrl);
  // #endif
}

/**
 * 显示地图选择菜单
 */
function showMapSelection(options: {
  origin: LocationInfo;
  destination: LocationInfo;
  destinationName: string;
  mode: 'drive' | 'walk' | 'bike' | 'bus';
}) {
  uni.showActionSheet({
    itemList: ['高德地图', '百度地图', '腾讯地图', '网页版路线'],
    success: (res) => {
      switch (res.tapIndex) {
        case 0:
          openMapNavigationInternal(options.destination, {
            ...options,
            mapType: 'gaode'
          });
          break;
        case 1:
          openMapNavigationInternal(options.destination, {
            ...options,
            mapType: 'baidu'
          });
          break;
        case 2:
          openMapNavigationInternal(options.destination, {
            ...options,
            mapType: 'qqmap'
          });
          break;
        case 3:
          openWebNavigation(options);
          break;
      }
    },
    fail: (err) => {
      console.error('选择地图失败:', err);
    }
  });
}

/**
 * 打开网页版路线导航
 */
function openWebNavigation(options: {
  origin: LocationInfo;
  destination: LocationInfo;
  destinationName: string;
  mode: 'drive' | 'walk' | 'bike' | 'bus';
}) {
  const {
    origin,
    destination,
    destinationName,
    mode
  } = options;

  const { latitude: originLat, longitude: originLng } = origin;
  const { latitude: destLat, longitude: destLng } = destination;
  
  // 坐标转换
  const baiduDest = gcj02ToBaidu(destLng, destLat);
  const baiduOrigin = gcj02ToBaidu(originLng, originLat);

  // 显示地图选择菜单
  uni.showActionSheet({
    itemList: ['高德地图网页版', '百度地图网页版', '腾讯地图网页版'],
    success: (res) => {
      let webUrl = '';
      switch (res.tapIndex) {
        case 0:
          // 高德地图网页版
          webUrl = `https://uri.amap.com/navigation?from=${originLng},${originLat},我的位置&to=${destLng},${destLat},${encodeURIComponent(destinationName)}&mode=${mode}&src=myapp`;
          break;
        case 1:
          // 百度地图网页版，自动填充起点和终点并规划路线
          // 使用百度地图API的direction接口，格式：origin=latlng:纬度,经度|name:名称&destination=latlng:纬度,经度|name:名称&mode=导航模式&output=html
          // 注意：百度地图需要使用BD09坐标系统，必须指定output=html才能显示路线规划页面
          webUrl = `http://api.map.baidu.com/direction?origin=latlng:${baiduOrigin.lat},${baiduOrigin.lng}|name:${encodeURIComponent('我的位置')}&destination=latlng:${baiduDest.lat},${baiduDest.lng}|name:${encodeURIComponent(destinationName)}&mode=${modeToBaiduType(mode)}&output=html&coord_type=bd09ll&src=webapp.myapp`;
          break;
        case 2:
          // 腾讯地图网页版，自动填充起点和终点并规划路线
          // 使用腾讯地图API的routeplan接口，格式：from=名称&fromcoord=纬度,经度&to=名称&tocoord=纬度,经度&type=导航模式
          webUrl = `https://apis.map.qq.com/uri/v1/routeplan?type=${modeToQQType(mode)}&from=${encodeURIComponent('我的位置')}&fromcoord=${originLat},${originLng}&to=${encodeURIComponent(destinationName)}&tocoord=${destLat},${destLng}&policy=1&referer=myapp`;
          break;
      }
      
      if (webUrl) {
        uni.navigateTo({
          url: `/pages/web-view/index?url=${encodeURIComponent(webUrl)}`
        });
      }
    },
    fail: (err) => {
      console.error('选择地图失败:', err);
    }
  });
}

/**
 * 打开地图URL
 */
function openMapUrl(url: string) {
  // #ifdef APP-PLUS
  // 直接通过URL Scheme打开
  plus.runtime.openURL(url, (result) => {
    if (result && result.code) {
      console.error('打开地图失败:', result);
      uni.showToast({
        title: '未检测到地图应用',
        icon: 'error'
      });
    }
  });
  // #endif
  // #ifdef H5
  // H5端直接打开URL
  window.open(url, '_blank');
  // #endif
  // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO
  // 小程序端使用系统地图
  uni.showToast({
    title: '正在打开地图',
    icon: 'none'
  });
  // #endif
}

/**
 * 获取用户当前位置，添加更详细的错误处理
 * @returns Promise<LocationInfo>
 */
export function getUserLocationWithErrorHandling(): Promise<LocationInfo> {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    // H5环境下先获取wgs84坐标，再手动转换为gcj02
    uni.getLocation({
      type: 'wgs84',
      altitude: false,
      success: (res) => {
        // 转换为gcj02坐标
        const gcj02 = wgs84ToGcj02(res.longitude, res.latitude);
        resolve({
          latitude: gcj02.lat,
          longitude: gcj02.lng
        });
      },
      fail: (err) => {
        console.error('获取位置失败:', err);
        
        // 根据错误码提供更详细的错误信息
        let errorMsg = '获取位置失败';
        switch (err.errCode) {
          case 1:
            errorMsg = '未授权获取位置，请在设置中开启位置权限';
            break;
          case 2:
            errorMsg = '位置获取失败，无法获取当前位置';
            break;
          case 3:
            errorMsg = '位置获取超时，请稍后重试';
            break;
          default:
            errorMsg = `获取位置失败: ${err.errMsg}`;
        }
        
        reject(new Error(errorMsg));
      }
    });
    // #endif
    // #ifndef H5
    // 非H5环境直接使用gcj02坐标
    uni.getLocation({
      type: 'gcj02', // 返回国测局坐标，适用于高德、腾讯地图
      altitude: false,
      success: (res) => {
        resolve({
          latitude: res.latitude,
          longitude: res.longitude
        });
      },
      fail: (err) => {
        console.error('获取位置失败:', err);
        
        // 根据错误码提供更详细的错误信息
        let errorMsg = '获取位置失败';
        switch (err.errCode) {
          case 1:
            errorMsg = '未授权获取位置，请在设置中开启位置权限';
            break;
          case 2:
            errorMsg = '位置获取失败，无法获取当前位置';
            break;
          case 3:
            errorMsg = '位置获取超时，请稍后重试';
            break;
          default:
            errorMsg = `获取位置失败: ${err.errMsg}`;
        }
        
        reject(new Error(errorMsg));
      }
    });
    // #endif
  });
}

/**
 * 打开地图导航，添加容错处理
 * @param destination 目的地位置信息
 * @param options 导航选项
 */
export function openMapNavigationWithFallback(destination: LocationInfo, options?: {
  mode?: 'drive' | 'walk' | 'bike' | 'bus';
  mapType?: string;
  origin?: LocationInfo;
  destinationName?: string;
}) {
  const { origin, destinationName = '目的地' } = options || {};

  // 如果没有提供起点，使用当前位置
  if (!origin) {
    getUserLocationWithErrorHandling().then(userLocation => {
      openMapNavigationInternal(destination, {
        ...options,
        origin: userLocation
      });
    }).catch(err => {
      console.error('获取位置失败:', err);
      
      // 显示错误提示，并询问用户是否继续导航（使用默认起点）
      uni.showModal({
        title: '位置获取失败',
        content: `${err.message}，是否继续导航到${destinationName}？`,
        cancelText: '取消',
        confirmText: '继续导航',
        success: (res) => {
          if (res.confirm) {
            // 使用默认起点（目的地附近）继续导航
            const defaultOrigin = {
              latitude: destination.latitude + 0.01,
              longitude: destination.longitude + 0.01
            };
            
            openMapNavigationInternal(destination, {
              ...options,
              origin: defaultOrigin
            });
          }
        }
      });
    });
    return;
  }

  openMapNavigationInternal(destination, {
    ...options,
    origin: origin
  });
}

/**
 * 导航模式转换为高德地图类型
 */
function modeToGaodeType(mode: string): number {
  switch (mode) {
    case 'drive':
      return 0; // 驾车
    case 'walk':
      return 2; // 步行
    case 'bike':
      return 3; // 骑行
    case 'bus':
      return 1; // 公交
    default:
      return 0;
  }
}

/**
 * 导航模式转换为百度地图类型
 */
function modeToBaiduType(mode: string): string {
  switch (mode) {
    case 'drive':
      return 'driving'; // 驾车
    case 'walk':
      return 'walking'; // 步行
    case 'bike':
      return 'riding'; // 骑行
    case 'bus':
      return 'transit'; // 公交
    default:
      return 'driving';
  }
}

/**
 * 导航模式转换为腾讯地图类型
 */
function modeToQQType(mode: string): string {
  switch (mode) {
    case 'drive':
      return 'drive'; // 驾车
    case 'walk':
      return 'walk'; // 步行
    case 'bike':
      return 'bike'; // 骑行
    case 'bus':
      return 'bus'; // 公交
    default:
      return 'drive';
  }
}

/**
 * GCJ02坐标转换为百度坐标
 */
function gcj02ToBaidu(lng: number, lat: number): { lng: number; lat: number } {
  const x_pi = Math.PI * 3000.0 / 180.0;
  const x = lng;
  const y = lat;
  const z = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin(y * x_pi);
  const theta = Math.atan2(y, x) + 0.000003 * Math.cos(x * x_pi);
  return {
    lng: z * Math.cos(theta) + 0.0065,
    lat: z * Math.sin(theta) + 0.006
  };
}

/**
 * 百度坐标转换为GCJ02坐标
 */
function baiduToGcj02(lng: number, lat: number): { lng: number; lat: number } {
  const x_pi = Math.PI * 3000.0 / 180.0;
  const x = lng - 0.0065;
  const y = lat - 0.006;
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_pi);
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_pi);
  return {
    lng: z * Math.cos(theta),
    lat: z * Math.sin(theta)
  };
}
