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
        // @ts-ignore
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
        // @ts-ignore
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
  showWebOption?: boolean;
}) {
  const { origin } = options || {};

  // 不再自动获取当前位置，而是让地图应用自己定位
  // 这样可以避免定位不准确的问题，让用户使用地图应用自己的定位功能
  // 如果提供了起点，仍然可以使用，但通常不传递起点，让地图应用自己定位更准确
  openMapNavigationInternal(destination, {
    ...options,
    origin: origin // 如果提供了起点就使用，否则不传递起点，让地图应用自己定位
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
    origin?: LocationInfo; // 起点改为可选，如果不提供，让地图应用自己定位
    destinationName?: string;
    showWebOption?: boolean;
  }
) {
  const {
    mode = 'drive',
    mapType = 'auto',
    origin,
    destinationName = '目的地',
    showWebOption = true
  } = options;

  const { latitude: destLat, longitude: destLng } = destination;
  
  // 如果提供了起点，使用起点坐标；否则不传递起点，让地图应用自己定位
  const originLat = origin?.latitude;
  const originLng = origin?.longitude;

  // 坐标转换（仅在有起点时转换）
  const baiduDest = gcj02ToBaidu(destLng, destLat);
  const baiduOrigin = originLat !== undefined && originLng !== undefined 
    ? gcj02ToBaidu(originLng, originLat) 
    : null;

  let navUrl = '';
  let isWebUrl = false;
  let fallbackWebUrl: string | undefined = undefined; // 用于存储备用网页版 URL

  // #ifdef H5
  // H5环境下使用网页版地图，使用经过验证的可靠URL
  switch (mapType) {
    case 'gaode':
      // 高德地图网页版，只传递终点，让浏览器自己定位起点
      navUrl = `https://uri.amap.com/navigation?to=${destLng},${destLat},${encodeURIComponent(destinationName)}&mode=${mode}&src=myapp`;
      isWebUrl = true;
      console.log('高德地图网页版 - 使用浏览器定位，只传递终点:', navUrl);
      break;
    
    case 'baidu':
      // 百度地图网页版，完全省略起点参数，只传递终点，让浏览器自己定位
      const cityName = origin?.city || destination.city || '全国';
      const destLatStr = baiduDest.lat.toFixed(6);
      const destLngStr = baiduDest.lng.toFixed(6);
      navUrl = `http://api.map.baidu.com/direction?destination=latlng:${destLatStr},${destLngStr}|name:${encodeURIComponent(destinationName)}&mode=${modeToBaiduType(mode)}&output=html&coord_type=bd09ll&region=${encodeURIComponent(cityName)}&src=webapp.myapp`;
      isWebUrl = true;
      console.log('百度地图网页版 - 只传递终点，让浏览器自己定位:', navUrl);
      break;
    
    case 'qqmap':
      // 腾讯地图网页版，完全省略起点参数，只传递终点，让浏览器自己定位
      navUrl = `https://apis.map.qq.com/uri/v1/routeplan?type=${modeToQQType(mode)}&to=${encodeURIComponent(destinationName)}&tocoord=${destLat},${destLng}&policy=1&referer=myapp`;
      isWebUrl = true;
      console.log('腾讯地图网页版 - 只传递终点，让浏览器自己定位:', navUrl);
      break;
    
    case 'auto':
    default:
      // 自动选择地图，显示选择菜单
      showMapSelection({
        origin,
        destination,
        destinationName,
        mode,
        showWebOption
      });
      return;
  }
  // #endif
  
  // #ifndef H5
  // 非H5环境
  // 小程序环境直接使用系统地图
  // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO
  openSystemMap(destination, destinationName);
  return;
  // #endif
  
  // App环境使用URL Scheme
  // #ifdef APP-PLUS
  if (mapType === 'gaode') {
    // 高德地图（App端）
    // - gaode: 路线规划页（更像百度：先展示路线方案，再点击开始导航）
    // 只传递终点，让高德自己用 GPS 定位起点（dev=0）
    // @ts-ignore
    const isIOS = typeof plus !== 'undefined' && plus.os && plus.os.name === 'iOS';
    const destLatStr = destLat.toFixed(6);
    const destLngStr = destLng.toFixed(6);

    // route：展示路线规划页面
    // Android: androidamap://route?sourceApplication=appname&dlat=纬度&dlon=经度&dname=目的地&dev=0&t=0
    // iOS:     iosamap://route?sourceApplication=appname&dlat=纬度&dlon=经度&dname=目的地&dev=0&t=0
    const t = modeToGaodeType(mode);
    if (isIOS) {
      navUrl = `iosamap://route?sourceApplication=myapp&dlat=${destLatStr}&dlon=${destLngStr}&dname=${encodeURIComponent(
        destinationName
      )}&dev=0&t=${t}`;
    } else {
      navUrl = `androidamap://route?sourceApplication=myapp&dlat=${destLatStr}&dlon=${destLngStr}&dname=${encodeURIComponent(
        destinationName
      )}&dev=0&t=${t}`;
    }
    console.log('高德地图 - 路线规划页（route，仅终点，GPS定位起点）:', navUrl);

    // 备用网页版（仅终点，由浏览器定位起点）
    fallbackWebUrl = `https://uri.amap.com/navigation?to=${destLngStr},${destLatStr},${encodeURIComponent(
      destinationName
    )}&mode=${mode}&src=myapp`;
  } else if (mapType === 'baidu') {
    // 百度地图导航（App端），只传递终点，让百度地图自己定位起点（使用浏览器/应用定位）
    // 注意：App端需要使用百度坐标（BD09）
    const destLatStr = baiduDest.lat.toFixed(6);
    const destLngStr = baiduDest.lng.toFixed(6);
    
    // 完全省略起点参数，只传递终点，让百度地图自动使用设备GPS定位
    // 百度地图 URL Scheme 格式（简化版，只传递终点）：baidumap://map/direction?destination=name:终点名称|latlng:纬度,经度&mode=导航模式&coord_type=bd09ll
    const destParam = `name:${encodeURIComponent(destinationName)}|latlng:${destLatStr},${destLngStr}`;
    navUrl = `baidumap://map/direction?destination=${destParam}&mode=${modeToBaiduType(mode)}&coord_type=bd09ll`;
    
    // 备用网页版 URL（如果 App 未安装）
    // 网页版也省略起点，让浏览器自己定位
    const cityName = origin?.city || destination.city || '全国';
    fallbackWebUrl = `http://api.map.baidu.com/direction?destination=latlng:${destLatStr},${destLngStr}|name:${encodeURIComponent(destinationName)}&mode=${modeToBaiduType(mode)}&output=html&coord_type=bd09ll&region=${encodeURIComponent(cityName)}&src=webapp.myapp`;
    
    console.log('百度地图导航 - 只传递终点，强制使用GPS定位作为起点:', navUrl);
    console.log('百度地图坐标 - 终点(BD09):', destLatStr, destLngStr);
    console.log('百度地图导航模式:', modeToBaiduType(mode));
    console.log('百度地图网页版 URL (备用):', fallbackWebUrl);
  } else if (mapType === 'qqmap') {
    // 腾讯地图导航 - 完全省略起点参数，只传递终点，强制使用GPS定位
    navUrl = `qqmap://map/routeplan?type=${modeToQQType(mode)}&to=${encodeURIComponent(destinationName)}&tocoord=${destLat},${destLng}&policy=1&referer=myapp`;
    console.log('腾讯地图导航 - 只传递终点，强制使用GPS定位作为起点:', navUrl);
  } else {
    // 自动选择地图，显示选择菜单
    showMapSelection({
      origin,
      destination,
      destinationName,
      mode,
      showWebOption
    });
    return;
  }
  // #endif
  // #endif

  // 打开地图
  // #ifdef H5
  // H5环境下直接使用window.open打开地图网页
  // @ts-ignore
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.open(navUrl, '_blank');
  }
  // #endif
  // #ifdef APP-PLUS
  // App环境使用openMapUrl函数
  // 如果构建了备用网页版 URL，则作为备用（App 未安装/打开失败时使用）
  if (fallbackWebUrl) {
    openMapUrl(navUrl, fallbackWebUrl);
  } else {
    openMapUrl(navUrl);
  }
  // #endif
}

/**
 * 显示地图选择菜单
 */
function showMapSelection(options: {
  origin?: LocationInfo; // 起点改为可选，如果不提供，让地图应用自己定位
  destination: LocationInfo;
  destinationName: string;
  mode: 'drive' | 'walk' | 'bike' | 'bus';
  showWebOption?: boolean;
}) {
  const showWebOption = options.showWebOption ?? true;
  const itemList = showWebOption
    ? ['高德地图', '百度地图', '腾讯地图', '网页版路线']
    : ['高德地图', '百度地图', '腾讯地图'];

  uni.showActionSheet({
    itemList,
    success: (res) => {
      const selectedMap = itemList[res.tapIndex];
      console.log('用户选择地图:', selectedMap, '索引:', res.tapIndex);
      // 关键：ActionSheet 关闭动画期间立刻调起外部 App，部分安卓机型/模拟器会出现“闪屏/白屏/回跳”
      // 这里统一延迟一小段时间再打开外部应用，提高稳定性
      const openAfterSheetClose = (fn: () => void) => {
        setTimeout(() => {
          try {
            fn();
          } catch (e) {
            // @ts-ignore
            console.error('打开地图异常:', e);
            uni.showToast({ title: '打开地图失败，请重试', icon: 'error' });
          }
        }, 350);
      };

      switch (res.tapIndex) {
        case 0:
          console.log('准备打开高德地图导航');
          openAfterSheetClose(() =>
            openMapNavigationInternal(options.destination, { ...options, mapType: 'gaode' })
          );
          break;
        case 1:
          console.log('准备打开百度地图导航');
          console.log('目的地信息:', options.destination);
          console.log('起点信息:', options.origin);
          openAfterSheetClose(() =>
            openMapNavigationInternal(options.destination, { ...options, mapType: 'baidu' })
          );
          break;
        case 2:
          console.log('准备打开腾讯地图导航');
          openAfterSheetClose(() =>
            openMapNavigationInternal(options.destination, { ...options, mapType: 'qqmap' })
          );
          break;
        case 3:
          if (showWebOption) {
            console.log('准备打开网页版导航');
            openAfterSheetClose(() => openWebNavigation(options));
          }
          break;
      }
    },
    fail: (err) => {
      // @ts-ignore
      console.error('选择地图失败:', err);
    }
  });
}

/**
 * 打开网页版路线导航
 */
function openWebNavigation(options: {
  origin?: LocationInfo; // 起点改为可选，如果不提供，让地图应用自己定位
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

  const { latitude: destLat, longitude: destLng } = destination;
  
  // 如果提供了起点，使用起点坐标；否则不传递起点，让地图应用自己定位
  const originLat = origin?.latitude;
  const originLng = origin?.longitude;
  
  // 坐标转换（仅在有起点时转换）
  const baiduDest = gcj02ToBaidu(destLng, destLat);
  const baiduOrigin = originLat !== undefined && originLng !== undefined 
    ? gcj02ToBaidu(originLng, originLat) 
    : null;

  // 显示地图选择菜单
  uni.showActionSheet({
    itemList: ['高德地图网页版', '百度地图网页版', '腾讯地图网页版'],
    success: (res) => {
      let webUrl = '';
      switch (res.tapIndex) {
        case 0:
          // 高德地图网页版，只传递终点，让浏览器自己定位起点
          webUrl = `https://uri.amap.com/navigation?to=${destLng},${destLat},${encodeURIComponent(destinationName)}&mode=${mode}&src=myapp`;
          break;
        case 1:
          // 百度地图网页版，只传递终点，让浏览器自己定位起点
          const cityName = origin?.city || destination.city || '全国';
          const destLatStr = baiduDest.lat.toFixed(6);
          const destLngStr = baiduDest.lng.toFixed(6);
          webUrl = `http://api.map.baidu.com/direction?destination=latlng:${destLatStr},${destLngStr}|name:${encodeURIComponent(destinationName)}&mode=${modeToBaiduType(mode)}&output=html&coord_type=bd09ll&region=${encodeURIComponent(cityName)}&src=webapp.myapp`;
          break;
        case 2:
          // 腾讯地图网页版，只传递终点，让浏览器自己定位起点
          webUrl = `https://apis.map.qq.com/uri/v1/routeplan?type=${modeToQQType(mode)}&to=${encodeURIComponent(destinationName)}&tocoord=${destLat},${destLng}&policy=1&referer=myapp`;
          break;
      }
      
      if (webUrl) {
        uni.navigateTo({
          url: `/pages/web-view/index?url=${encodeURIComponent(webUrl)}`
        });
      }
    },
    fail: (err) => {
      // @ts-ignore
      console.error('选择地图失败:', err);
    }
  });
}

/**
 * 打开地图URL
 */
function openMapUrl(url: string, fallbackUrl?: string) {
  // 如果是百度地图，且提供了 fallbackUrl，优先使用 fallbackUrl（因为它是完整构建的，更可靠）
  // 但首先尝试打开 App，如果 App 未安装，再使用 fallbackUrl
  // #ifdef APP-PLUS
  // 检查 plus 对象是否存在
  // @ts-ignore
  if (typeof plus === 'undefined' || !plus.runtime) {
    console.error('plus.runtime 不可用');
    if (fallbackUrl) {
      // 如果 fallbackUrl 是网页URL，使用系统浏览器打开
      // @ts-ignore
      if (typeof window !== 'undefined' && window.open) {
        // @ts-ignore
        window.open(fallbackUrl, '_blank');
      }
    }
    return;
  }
  
  // 验证 URL 格式
  if (!url || url.trim() === '') {
    console.error('URL Scheme 为空');
    if (fallbackUrl) {
      // @ts-ignore
      plus.runtime.openURL(fallbackUrl);
    }
    return;
  }
  
  console.log('准备打开 URL Scheme:', url);
  
  // 验证 URL Scheme 格式是否正确
  // 支持高德地图、百度地图、腾讯地图和网页 URL
  const isValidUrlScheme = 
    url.startsWith('androidamap://') || 
    url.startsWith('iosamap://') || 
    url.startsWith('baidumap://') || 
    url.startsWith('qqmap://') || 
    url.startsWith('http://') || 
    url.startsWith('https://');
  
  if (!isValidUrlScheme) {
    console.error('URL Scheme 格式不正确:', url);
    if (fallbackUrl) {
      console.log('使用 fallback URL:', fallbackUrl);
      // @ts-ignore
      plus.runtime.openURL(fallbackUrl);
    }
    return;
  }
  
  // 优先用 Android Intent 打开（比 openURL 更稳，且不容易出现“打开后立刻返回”）
  try {
    // @ts-ignore
    const osName = plus.os && plus.os.name;
    if (osName === 'Android') {
      try {
        // @ts-ignore
        const main = plus.android.runtimeMainActivity();
        // @ts-ignore
        const Intent = plus.android.importClass('android.content.Intent');
        // @ts-ignore
        const Uri = plus.android.importClass('android.net.Uri');
        // @ts-ignore
        const intent = new Intent(Intent.ACTION_VIEW);
        // @ts-ignore
        intent.setData(Uri.parse(url));
        // @ts-ignore
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        
        // 检查是否有应用可以处理这个 Intent
        // @ts-ignore
        const PackageManager = plus.android.importClass('android.content.pm.PackageManager');
        // @ts-ignore
        const pm = main.getPackageManager();
        // @ts-ignore
        const resolveInfo = pm.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY);
        
        if (resolveInfo === null) {
          // 没有应用可以处理这个 Intent，可能是百度地图未安装
          console.warn('没有应用可以处理此 URL Scheme，可能未安装对应的地图应用');
          if (url.startsWith('baidumap://')) {
            // 百度地图未安装，尝试使用网页版
            // 优先使用提供的 fallbackUrl（如果存在），因为它已经完整构建好了，更可靠
            if (fallbackUrl) {
              console.log('百度地图 App 未安装，使用 fallback URL (网页版):', fallbackUrl);
              // @ts-ignore
              plus.runtime.openURL(fallbackUrl);
              return;
            }
            
            // 如果没有 fallbackUrl，尝试从 URL Scheme 中提取坐标信息（备用方案）
            const originMatch = url.match(/origin=latlng:([^|]+)/);
            const destMatch = url.match(/destination=latlng:([^|]+)/);
            const modeMatch = url.match(/mode=([^&]+)/);
            
            if (originMatch && destMatch) {
              // 使用百度地图 API 的 direction 接口，格式正确且稳定
              const webUrl = `http://api.map.baidu.com/direction?origin=latlng:${originMatch[1]}|name:${encodeURIComponent('我的位置')}&destination=latlng:${destMatch[1]}|name:${encodeURIComponent('目的地')}&mode=${modeMatch ? modeMatch[1] : 'driving'}&output=html&coord_type=bd09ll&src=webapp.myapp`;
              console.log('百度地图 App 未安装，使用网页版 (从 URL Scheme 提取):', webUrl);
              // @ts-ignore
              plus.runtime.openURL(webUrl);
              return;
            } else {
              console.warn('无法从 URL Scheme 中提取坐标信息，无法打开百度地图网页版');
            }
          }
          // 其他地图应用未安装，显示提示
          setTimeout(() => {
            let mapName = '地图应用';
            if (url.startsWith('androidamap://') || url.startsWith('iosamap://')) {
              mapName = '高德地图';
            } else if (url.startsWith('baidumap://')) {
              mapName = '百度地图';
            } else if (url.startsWith('qqmap://')) {
              mapName = '腾讯地图';
            }
            uni.showModal({
              title: '无法打开地图',
              content: `未检测到${mapName}应用。请先安装${mapName}应用，或使用其他地图应用。`,
              showCancel: false,
              confirmText: '确定'
            });
          }, 500);
          return;
        }
        
        // @ts-ignore
        main.startActivity(intent);
        console.log('已通过 Android Intent 打开外部地图应用');
        
        // 不需要延迟检查，直接返回，让系统正常处理应用切换
        
        return;
      } catch (androidErr) {
        // @ts-ignore
        console.warn('Android Intent 打开失败，回退到 plus.runtime.openURL:', androidErr);
        // 如果是百度地图，且提供了 fallbackUrl，直接使用网页版
        if (url.startsWith('baidumap://') && fallbackUrl) {
          console.log('百度地图 Intent 失败，直接使用网页版:', fallbackUrl);
          try {
            // @ts-ignore
            plus.runtime.openURL(fallbackUrl);
            return;
          } catch (fallbackErr) {
            // @ts-ignore
            console.error('打开百度地图网页版失败:', fallbackErr);
          }
        }
      }
    }

    console.log('准备打开外部地图应用:', url);
    console.log('URL Scheme 类型:', 
      url.startsWith('androidamap://') ? '高德地图(Android)' :
      url.startsWith('iosamap://') ? '高德地图(iOS)' :
      url.startsWith('baidumap://') ? '百度地图' :
      url.startsWith('qqmap://') ? '腾讯地图' : '未知'
    );
    // @ts-ignore
    plus.runtime.openURL(url, (res) => {
      console.log('plus.runtime.openURL 调用结果:', res);
      // 这里不需要做任何处理，让系统正常处理应用切换
    });
    console.log('已调用 plus.runtime.openURL，应用将被挂起到后台');
    return;
  } catch (err) {
    // @ts-ignore
    console.error('调用 plus.runtime.openURL 异常:', err);
    // 如果 URL Scheme 失败，尝试使用 fallback
    if (fallbackUrl) {
      try {
        console.log('URL Scheme 调用异常，使用系统浏览器打开网页版导航:', fallbackUrl);
        // @ts-ignore
        plus.runtime.openURL(fallbackUrl);
      } catch (fallbackErr) {
        // @ts-ignore
        console.error('打开 fallback URL 失败:', fallbackErr);
        // 延迟显示错误提示，避免在打开外部应用的过程中显示模态框导致闪屏
        setTimeout(() => {
          // 根据 URL Scheme 判断是哪个地图应用
          let mapName = '地图应用'
          if (url.startsWith('androidamap://') || url.startsWith('iosamap://')) {
            mapName = '高德地图'
          } else if (url.startsWith('baidumap://')) {
            mapName = '百度地图'
          } else if (url.startsWith('qqmap://')) {
            mapName = '腾讯地图'
          }
          
          uni.showModal({
            title: '无法打开地图',
            content: `无法打开${mapName}应用或网页版导航。请检查是否已安装${mapName}应用，或检查网络连接。`,
            showCancel: false,
            confirmText: '确定'
          });
        }, 500);
      }
    } else {
      // 延迟显示错误提示
      setTimeout(() => {
        // 根据 URL Scheme 判断是哪个地图应用
        let mapName = '地图应用'
        if (url.startsWith('androidamap://') || url.startsWith('iosamap://')) {
          mapName = '高德地图'
        } else if (url.startsWith('baidumap://')) {
          mapName = '百度地图'
        } else if (url.startsWith('qqmap://')) {
          mapName = '腾讯地图'
        }
        
        uni.showModal({
          title: '无法打开地图',
          content: `无法打开${mapName}应用。请先安装${mapName}应用。`,
          showCancel: false,
          confirmText: '确定'
        });
      }, 500);
    }
  }
  // #endif
  
  // #ifdef H5
  // H5端直接打开URL
  // @ts-ignore
  if (typeof window !== 'undefined') {
    try {
      // @ts-ignore
      window.open(url, '_blank');
    } catch (err) {
      // @ts-ignore
      console.error('H5 打开 URL 失败:', err);
      uni.showModal({
        title: '无法打开地图',
        content: '无法在新窗口中打开地图。请检查浏览器设置或手动打开高德地图。',
        showCancel: false,
        confirmText: '确定'
      });
    }
  }
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
 * 处理打开 URL 的结果
 */
function handleOpenURLResult(result: any, fallbackUrl?: string) {
  try {
    // 当外部应用打开后，当前应用会被挂起到后台
    // 用户从外部应用返回时，应用会自动恢复
    if (result && result.code) {
      // @ts-ignore
      console.error('打开地图应用失败:', result);
      if (fallbackUrl) {
        // 如果没有安装对应App，使用系统浏览器打开网页版导航
        // 注意：在 App-Plus 环境下，使用 plus.runtime.openURL 打开网页URL会在系统浏览器中打开
        // @ts-ignore
        if (typeof plus !== 'undefined' && plus.runtime) {
          console.log('使用系统浏览器打开网页版导航:', fallbackUrl);
          // @ts-ignore
          plus.runtime.openURL(fallbackUrl, (fallbackResult) => {
            // @ts-ignore
            if (fallbackResult && fallbackResult.code) {
              // 如果网页也打不开，提示用户
              uni.showModal({
                title: '无法打开地图',
                content: '未检测到高德地图应用，且无法打开网页版导航。请检查网络连接或手动打开高德地图。',
                showCancel: false,
                confirmText: '确定'
              });
            } else {
              console.log('成功在系统浏览器中打开网页版导航');
            }
          });
        } else {
          // 如果 plus 不可用，尝试使用系统浏览器
          // @ts-ignore
          if (typeof window !== 'undefined' && window.open) {
            // @ts-ignore
            window.open(fallbackUrl, '_blank');
          }
        }
        return;
      }
      uni.showModal({
        title: '未检测到地图应用',
        content: '请先安装高德地图应用，或使用网页版导航。',
        showCancel: false,
        confirmText: '确定'
      });
    } else {
      // 成功打开外部应用，应用会被挂起到后台
      // 这是正常的系统行为，用户可以从任务管理器切换回来
      console.log('成功打开外部地图应用，应用已挂起到后台');
    }
  } catch (err) {
    // @ts-ignore
    console.error('处理打开地图回调失败:', err);
    // 如果回调处理失败，尝试使用 fallback
    if (fallbackUrl) {
      // @ts-ignore
      if (typeof plus !== 'undefined' && plus.runtime) {
        // @ts-ignore
        plus.runtime.openURL(fallbackUrl);
      }
    }
  }
}

/**
 * 打开系统地图
 * @param destination 目的地位置信息
 * @param destinationName 目的地名称
 */
function openSystemMap(destination: LocationInfo, destinationName: string) {
  // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO
  // 小程序端使用uni.openLocation
  uni.openLocation({
    latitude: destination.latitude,
    longitude: destination.longitude,
    name: destinationName,
    address: destination.address || '',
    success: () => {
      console.log('打开系统地图成功');
    },
    fail: (err) => {
      // @ts-ignore
      console.error('打开系统地图失败:', err);
      uni.showToast({
        title: '打开地图失败，请检查权限设置',
        icon: 'error'
      });
    }
  });
  // #endif
  // #ifdef APP-PLUS
  // App端使用plus.maps.openSysMap
  // 使用正确的参数顺序：longitude, latitude, name
  // 使用类型断言解决TypeScript类型不匹配问题
  const openSysMap = (plus.maps.openSysMap as any);
  openSysMap(
    destination.longitude,
    destination.latitude,
    destinationName
  );
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
        // @ts-ignore
        console.error('获取位置失败:', err);
        
        // 根据错误码提供更详细的错误信息
        let errorMsg = '获取位置失败';
        // @ts-ignore
        switch (err.errCode) {
          case 1:
            errorMsg = '未授权获取位置，请在浏览器设置中开启位置权限';
            break;
          case 2:
            errorMsg = '位置获取失败，无法获取当前位置';
            break;
          case 3:
            errorMsg = '位置获取超时，请稍后重试';
            break;
          default:
            // @ts-ignore
            errorMsg = `获取位置失败: ${err.errMsg}`;
        }
        
        // @ts-ignore
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
        // @ts-ignore
        console.error('获取位置失败:', err);
        
        // 根据错误码提供更详细的错误信息
        let errorMsg = '获取位置失败';
        // @ts-ignore
        switch (err.errCode) {
          case 1:
            errorMsg = '未授权获取位置，请在手机设置中开启位置权限';
            break;
          case 2:
            errorMsg = '位置获取失败，无法获取当前位置';
            break;
          case 3:
            errorMsg = '位置获取超时，请稍后重试';
            break;
          default:
            // @ts-ignore
            errorMsg = `获取位置失败: ${err.errMsg}`;
        }
        
        // @ts-ignore
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
  showWebOption?: boolean;
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
      // @ts-ignore
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
 * 直接使用高德地图网页版打开导航（从当前位置到目的地）
 * - APP端：用内置 `web-view` 打开高德网页版
 * - H5端：同样使用 `web-view`（保持体验一致）
 */
export function openGaodeWebNavigation(destination: LocationInfo, options?: {
  mode?: 'drive' | 'walk' | 'bike' | 'bus';
  origin?: LocationInfo;
  destinationName?: string;
}) {
  const { origin, destinationName = '目的地', mode = 'drive' } = options || {};

  const openWithOrigin = (o: LocationInfo) => {
    const { latitude: originLat, longitude: originLng } = o;
    const { latitude: destLat, longitude: destLng } = destination;

    const webUrl = `https://uri.amap.com/navigation?from=${originLng},${originLat},我的位置&to=${destLng},${destLat},${encodeURIComponent(destinationName)}&mode=${mode}&src=myapp`;

    // App 内嵌 web-view 容易触发高德风控“验证失败”，这里改为系统浏览器打开
    // #ifdef APP-PLUS
    openMapUrl(webUrl);
    // #endif
    // #ifndef APP-PLUS
    uni.navigateTo({
      url: `/pages/web-view/index?url=${encodeURIComponent(webUrl)}`
    });
    // #endif
  };

  if (origin) {
    openWithOrigin(origin);
    return;
  }

  getUserLocationWithErrorHandling()
    .then(openWithOrigin)
    .catch((err) => {
      // 获取定位失败时，仍然使用高德默认“我的位置”为起点
      // @ts-ignore
      console.error('获取位置失败，改为仅使用目的地导航:', err);
      openWithOrigin({
        latitude: destination.latitude,
        longitude: destination.longitude
      });
    });
}

/**
 * 仅指定目的地，直接调起高德地图 App（起点由高德自己取"我的位置"）
 * 尝试获取当前位置作为起点，如果获取失败则让高德自动使用"我的位置"
 */
export function openGaodeAppNavigation(destination: LocationInfo, options?: {
  mode?: 'drive' | 'walk' | 'bike' | 'bus';
  destinationName?: string;
}) {
  const { destinationName = '目的地', mode = 'drive' } = options || {};
  const { latitude: destLat, longitude: destLng } = destination;

  // 验证目的地坐标是否有效
  if (isNaN(destLat) || isNaN(destLng) || destLat === 0 || destLng === 0) {
    uni.showModal({
      title: '导航失败',
      content: '目的地坐标无效，无法导航。',
      showCancel: false,
      confirmText: '确定'
    });
    return;
  }

  // 尝试获取当前位置作为起点，确保能自动规划路线
  getUserLocationWithErrorHandling()
    .then((userLocation) => {
      // 成功获取当前位置，使用完整的起点和终点信息
      const { latitude: originLat, longitude: originLng } = userLocation;
      
      // 验证起点坐标是否有效
      if (isNaN(originLat) || isNaN(originLng) || originLat === 0 || originLng === 0) {
        // 起点坐标无效，只使用终点
        throw new Error('起点坐标无效');
      }
      
      // 使用 route 接口显示路线规划（更稳定，不会闪退）
      // route 接口会显示路线规划页面，用户可以查看路线后再决定是否开始导航
      // 参数说明：
      // - sourceApplication: 应用名称
      // - dlat/dlon: 终点经纬度
      // - dname: 终点名称
      // - dev: 是否偏移（0=不偏移，1=偏移）
      // - t: 导航类型（0=驾车，1=公交，2=步行，3=骑行）
      // 注意：不传递起点参数，让高德地图自动使用"我的位置"作为起点，更稳定
      const destLatStr = destLat.toFixed(6);
      const destLngStr = destLng.toFixed(6);
      
      // 使用 route 接口显示路线规划（比 navi 接口更稳定）
      // Android 格式：androidamap://route?sourceApplication=appname&dlat=纬度&dlon=经度&dname=目的地&dev=0&t=0
      const appUrl = `androidamap://route?sourceApplication=myapp&dlat=${destLatStr}&dlon=${destLngStr}&dname=${encodeURIComponent(
        destinationName
      )}&dev=0&t=${modeToGaodeType(mode)}`;
      
      // iOS 平台使用 iosamap:// 格式
      // @ts-ignore
      const isIOS = typeof plus !== 'undefined' && plus.os && plus.os.name === 'iOS';
      const iosAppUrl = isIOS ? `iosamap://route?sourceApplication=myapp&dlat=${destLatStr}&dlon=${destLngStr}&dname=${encodeURIComponent(
        destinationName
      )}&dev=0&t=${modeToGaodeType(mode)}` : appUrl;
      
      console.log('高德地图 URL Scheme (路线规划版):', isIOS ? iosAppUrl : appUrl);

      // 备用网页版导航 URL
      const webUrl = `https://uri.amap.com/navigation?to=${destLngStr},${destLatStr},${encodeURIComponent(
        destinationName
      )}&mode=${mode}&src=myapp`;

      // #ifdef APP-PLUS
      // iOS 使用 iosamap://，Android 使用 androidamap://
      // @ts-ignore
      const finalAppUrl = (typeof plus !== 'undefined' && plus.os && plus.os.name === 'iOS') ? iosAppUrl : appUrl;
      
      // 直接调用，不使用延迟，避免时序问题
      openMapUrl(finalAppUrl, webUrl);
      // #endif
      // #ifndef APP-PLUS
      openMapUrl(webUrl);
      // #endif
    })
    .catch((err) => {
      // 获取位置失败，只指定终点，让高德自动使用"我的位置"作为起点
      // @ts-ignore
      console.warn('获取当前位置失败，使用默认起点:', err);
      
      // 使用 route 接口显示路线规划（更稳定，不会闪退）
      // 只传递终点信息，让高德地图自动使用"我的位置"作为起点
      const destLatStr = destLat.toFixed(6);
      const destLngStr = destLng.toFixed(6);
      
      // Android 格式：androidamap://route?sourceApplication=appname&dlat=纬度&dlon=经度&dname=目的地&dev=0&t=0
      const appUrl = `androidamap://route?sourceApplication=myapp&dlat=${destLatStr}&dlon=${destLngStr}&dname=${encodeURIComponent(
        destinationName
      )}&dev=0&t=${modeToGaodeType(mode)}`;

      // iOS 平台使用 iosamap:// 格式
      // @ts-ignore
      const isIOS = typeof plus !== 'undefined' && plus.os && plus.os.name === 'iOS';
      const iosAppUrl = isIOS ? `iosamap://route?sourceApplication=myapp&dlat=${destLatStr}&dlon=${destLngStr}&dname=${encodeURIComponent(
        destinationName
      )}&dev=0&t=${modeToGaodeType(mode)}` : appUrl;
      
      // 备用网页版导航 URL
      const webUrl = `https://uri.amap.com/navigation?to=${destLngStr},${destLatStr},${encodeURIComponent(
        destinationName
      )}&mode=${mode}&src=myapp`;

      // #ifdef APP-PLUS
      // iOS 使用 iosamap://，Android 使用 androidamap://
      // @ts-ignore
      const finalAppUrl = (typeof plus !== 'undefined' && plus.os && plus.os.name === 'iOS') ? iosAppUrl : appUrl;
      openMapUrl(finalAppUrl, webUrl);
      // #endif
      // #ifndef APP-PLUS
      openMapUrl(webUrl);
      // #endif
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
  // @ts-ignore
  const x_pi = Math.PI * 3000.0 / 180.0;
  const x = lng;
  const y = lat;
  // @ts-ignore
  const z = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin(y * x_pi);
  // @ts-ignore
  const theta = Math.atan2(y, x) + 0.000003 * Math.cos(x * x_pi);
  return {
    // @ts-ignore
    lng: z * Math.cos(theta) + 0.0065,
    // @ts-ignore
    lat: z * Math.sin(theta) + 0.006
  };
}

/**
 * 百度坐标转换为GCJ02坐标
 */
function baiduToGcj02(lng: number, lat: number): { lng: number; lat: number } {
  // @ts-ignore
  const x_pi = Math.PI * 3000.0 / 180.0;
  const x = lng - 0.0065;
  const y = lat - 0.006;
  // @ts-ignore
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_pi);
  // @ts-ignore
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_pi);
  return {
    // @ts-ignore
    lng: z * Math.cos(theta),
    // @ts-ignore
    lat: z * Math.sin(theta)
  };
}
