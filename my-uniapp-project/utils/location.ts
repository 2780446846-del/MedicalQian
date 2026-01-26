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
  });
}

/**
 * 打开地图导航
 * @param destination 目的地位置信息
 * @param options 导航选项
 */
export function openMapNavigation(destination: LocationInfo, options?: {
  mode?: 'drive' | 'walk' | 'bike' | 'bus';
  mapType?: 'gaode' | 'baidu' | 'qqmap' | 'auto';
  origin?: LocationInfo;
  destinationName?: string;
}) {
  const {
    mode = 'drive',
    mapType = 'auto',
    origin,
    destinationName = '目的地'
  } = options || {};

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
    mapType?: 'gaode' | 'baidu' | 'qqmap' | 'auto';
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

  switch (mapType) {
    case 'gaode':
      // 高德地图导航
      navUrl = `amapuri://route/plan?sourceApplication=myapp&slat=${originLat}&slon=${originLng}&sname=我的位置&dlat=${destLat}&dlon=${destLng}&dname=${encodeURIComponent(destinationName)}&dev=0&t=${modeToGaodeType(mode)}`;
      break;
    
    case 'baidu':
      // 百度地图导航
      navUrl = `baidumap://map/direction?origin=latlng:${originLat},${originLng}|name:我的位置&destination=latlng:${destLat},${destLng}|name:${encodeURIComponent(destinationName)}&mode=${modeToBaiduType(mode)}&coord_type=gcj02`;
      break;
    
    case 'qqmap':
      // 腾讯地图导航
      navUrl = `qqmap://map/routeplan?type=${modeToQQType(mode)}&from=我的位置&fromcoord=${originLat},${originLng}&to=${encodeURIComponent(destinationName)}&tocoord=${destLat},${destLng}&policy=1&referer=myapp`;
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

  // 打开地图
  openMapUrl(navUrl);
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

  // 使用高德地图网页版
  const webUrl = `https://uri.amap.com/navigation?from=${originLng},${originLat},我的位置&to=${destLng},${destLat},${encodeURIComponent(destinationName)}&mode=${mode}&src=myapp`;

  uni.navigateTo({
    url: `/pages/web-view/index?url=${encodeURIComponent(webUrl)}`
  });
}

/**
 * 打开地图URL
 */
function openMapUrl(url: string) {
  uni.openLocation({
    latitude: 0,
    longitude: 0,
    success: () => {
      // 调用系统地图
    },
    fail: () => {
      // 尝试通过URL Scheme打开
      uni.showToast({
        title: '正在打开地图应用',
        icon: 'none'
      });
      setTimeout(() => {
        // #ifdef APP-PLUS
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
        window.open(url, '_blank');
        // #endif
      }, 500);
    }
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
