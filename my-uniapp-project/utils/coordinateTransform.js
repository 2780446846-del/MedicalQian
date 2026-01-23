/**
 * 坐标系转换工具
 * WGS84 (GPS坐标) 转 GCJ02 (高德地图坐标)
 */

const PI = 3.1415926535897932384626;
const a = 6378245.0; // 长半轴
const ee = 0.00669342162296594323; // 偏心率平方

/**
 * WGS84坐标转换为GCJ02坐标
 * @param {number} lng WGS84经度
 * @param {number} lat WGS84纬度
 * @returns {{lng: number, lat: number}} GCJ02坐标
 */
export function wgs84ToGcj02(lng, lat) {
  if (outOfChina(lng, lat)) {
    return { lng, lat };
  }
  
  let dlat = transformLat(lng - 105.0, lat - 35.0);
  let dlng = transformLng(lng - 105.0, lat - 35.0);
  let radlat = lat / 180.0 * PI;
  let magic = Math.sin(radlat);
  magic = 1 - ee * magic * magic;
  let sqrtmagic = Math.sqrt(magic);
  dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);
  dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);
  let mglat = lat + dlat;
  let mglng = lng + dlng;
  
  return { lng: mglng, lat: mglat };
}

/**
 * GCJ02坐标转换为WGS84坐标
 * @param {number} lng GCJ02经度
 * @param {number} lat GCJ02纬度
 * @returns {{lng: number, lat: number}} WGS84坐标
 */
export function gcj02ToWgs84(lng, lat) {
  if (outOfChina(lng, lat)) {
    return { lng, lat };
  }
  
  let dlat = transformLat(lng - 105.0, lat - 35.0);
  let dlng = transformLng(lng - 105.0, lat - 35.0);
  let radlat = lat / 180.0 * PI;
  let magic = Math.sin(radlat);
  magic = 1 - ee * magic * magic;
  let sqrtmagic = Math.sqrt(magic);
  dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);
  dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);
  let mglat = lat + dlat;
  let mglng = lng + dlng;
  
  return { lng: lng * 2 - mglng, lat: lat * 2 - mglat };
}

/**
 * 判断是否在中国范围外
 */
function outOfChina(lng, lat) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

/**
 * 纬度转换
 */
function transformLat(lng, lat) {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lat * PI) + 40.0 * Math.sin(lat / 3.0 * PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(lat / 12.0 * PI) + 320 * Math.sin(lat * PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

/**
 * 经度转换
 */
function transformLng(lng, lat) {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lng * PI) + 40.0 * Math.sin(lng / 3.0 * PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(lng / 12.0 * PI) + 300.0 * Math.sin(lng / 30.0 * PI)) * 2.0 / 3.0;
  return ret;
}

