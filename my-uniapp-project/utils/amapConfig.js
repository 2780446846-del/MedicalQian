/**
 * 高德地图配置文件
 * 统一管理高德地图API Key
 */

// 高德地图Web服务API Key（用于逆地理编码、地点搜索等）
export const AMAP_WEB_KEY = '2fc9d976ec3939b4a0ed423bdfeb74e5';

// 高德地图JS API Key（用于地图展示）
export const AMAP_JS_KEY = '2fc9d976ec3939b4a0ed423bdfeb74e5';

// 高德地图API基础URL
export const AMAP_WEB_API_BASE = 'https://restapi.amap.com/v3';

// 逆地理编码API
export const AMAP_GEOCODE_REGEO_URL = `${AMAP_WEB_API_BASE}/geocode/regeo`;

// 地理编码API（地址转坐标）
export const AMAP_GEOCODE_GEO_URL = `${AMAP_WEB_API_BASE}/geocode/geo`;

// 地点搜索API
export const AMAP_POI_SEARCH_URL = `${AMAP_WEB_API_BASE}/place/text`;

// 坐标转换API（WGS84转GCJ02）
export const AMAP_COORD_CONVERT_URL = `${AMAP_WEB_API_BASE}/assistant/coordinate/convert`;

