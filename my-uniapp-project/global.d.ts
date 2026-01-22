/// <reference types="@dcloudio/types" />

// Vue 模块声明
declare module 'vue' {
  export function ref<T>(value: T): any
  export function onMounted(hook: () => void): void
  export function computed<T>(getter: () => T): any
  export function watch<T>(source: any, callback: (newVal: T, oldVal: T) => void): void
  export function onUnmounted(hook: () => void): void
  export function onUpdated(hook: () => void): void
  export function onBeforeMount(hook: () => void): void
  export function onBeforeUnmount(hook: () => void): void
  export function onBeforeUpdate(hook: () => void): void
  export function reactive<T>(target: T): T
  export function defineComponent(options: any): any
  export type DefineComponent = any
}

declare module '*.vue' {
  const component: any
  export default component
}

// 全局函数声明
declare function getCurrentPages(): any[];
declare function getApp(): any;

// 高德地图AMap类型声明
declare const AMap: any;

declare interface Window {
  AMap: any;
}

// uni-app 全局 API 类型声明
declare namespace uni {
  interface ShowToastOptions {
    title: string
    icon?: 'success' | 'error' | 'loading' | 'none'
    image?: string
    duration?: number
    mask?: boolean
    success?: (res: any) => void
    fail?: (res: any) => void
    complete?: (res: any) => void
  }

  function showToast(options: ShowToastOptions): void
  function showModal(options: any): void
  function showLoading(options: any): void
  function hideLoading(): void
  function request(options: any): Promise<any>
  function navigateTo(options: any): void
  function redirectTo(options: any): void
  function switchTab(options: any): void
  function navigateBack(options?: any): void
  function getStorageSync(key: string): any
  function setStorageSync(key: string, data: any): void
  function removeStorageSync(key: string): void
  function getSystemInfoSync(): any
  function getLocation(options: any): void
  function chooseImage(options: any): void
  function previewImage(options: any): void
  function uploadFile(options: any): void
  function downloadFile(options: any): void
  function login(options: any): void
  function getUserInfo(options: any): void
  function getSetting(options: any): void
  function authorize(options: any): void
  function openLocation(options: any): void
  function makePhoneCall(options: any): void
  function scanCode(options: any): void
  function setNavigationBarTitle(options: any): void
  function setNavigationBarColor(options: any): void
  function showNavigationBarLoading(): void
  function hideNavigationBarLoading(): void
  function setTabBarBadge(options: any): void
  function removeTabBarBadge(options: any): void
  function showTabBarRedDot(options: any): void
  function hideTabBarRedDot(options: any): void
  function setTabBarStyle(options: any): void
  function setTabBarItem(options: any): void
  function showTabBar(options: any): void
  function hideTabBar(options: any): void
  function pageScrollTo(options: any): void
  function createAnimation(options: any): any
  function createCanvasContext(canvasId: string, componentInstance?: any): any
  function createSelectorQuery(): any
  function createIntersectionObserver(options?: any): any
  function onPageScroll(callback: (res: { scrollTop: number }) => void): void
  function onReachBottom(callback: () => void): void
  function onPullDownRefresh(callback: () => void): void
  function startPullDownRefresh(options?: any): void
  function stopPullDownRefresh(): void
  function createVideoContext(videoId: string, componentInstance?: any): any
  function createAudioContext(audioId: string): any
  function createInnerAudioContext(): any
  function createLivePlayerContext(id: string, componentInstance?: any): any
  function createLivePusherContext(id: string, componentInstance?: any): any
  function createMapContext(mapId: string, componentInstance?: any): any
  function createCameraContext(): any
  function createRecorderManager(): any
  function getBackgroundAudioManager(): any
  function getFileSystemManager(): any
  function getImageInfo(options: any): void
  function saveImageToPhotosAlbum(options: any): void
  function compressImage(options: any): void
  function chooseVideo(options: any): void
  function saveVideoToPhotosAlbum(options: any): void
  function createWebSocket(options: any): any
  function connectSocket(options: any): void
  function onSocketOpen(callback: (res: any) => void): void
  function onSocketError(callback: (res: any) => void): void
  function sendSocketMessage(options: any): void
  function onSocketMessage(callback: (res: any) => void): void
  function closeSocket(options?: any): void
  function onSocketClose(callback: (res: any) => void): void
  function setEnableDebug(options: any): void
  function getNetworkType(options: any): void
  function onNetworkStatusChange(callback: (res: any) => void): void
  function onAccelerometerChange(callback: (res: any) => void): void
  function startAccelerometer(options: any): void
  function stopAccelerometer(options: any): void
  function onCompassChange(callback: (res: any) => void): void
  function startCompass(options: any): void
  function stopCompass(options: any): void
  function onGyroscopeChange(callback: (res: any) => void): void
  function startGyroscope(options: any): void
  function stopGyroscope(options: any): void
  function onBluetoothAdapterStateChange(callback: (res: any) => void): void
  function onBluetoothDeviceFound(callback: (res: any) => void): void
  function startBluetoothDevicesDiscovery(options: any): void
  function stopBluetoothDevicesDiscovery(options: any): void
  function getBluetoothDevices(options: any): void
  function getConnectedBluetoothDevices(options: any): void
  function createBLEConnection(options: any): void
  function closeBLEConnection(options: any): void
  function getBLEDeviceServices(options: any): void
  function getBLEDeviceCharacteristics(options: any): void
  function readBLECharacteristicValue(options: any): void
  function writeBLECharacteristicValue(options: any): void
  function notifyBLECharacteristicValueChange(options: any): void
  function onBLEConnectionStateChange(callback: (res: any) => void): void
  function onBLECharacteristicValueChange(callback: (res: any) => void): void
  function startBeaconDiscovery(options: any): void
  function stopBeaconDiscovery(options: any): void
  function getBeacons(options: any): void
  function onBeaconUpdate(callback: (res: any) => void): void
  function onBeaconServiceChange(callback: (res: any) => void): void
  function getHCEState(options: any): void
  function startHCE(options: any): void
  function stopHCE(options: any): void
  function onHCEMessage(callback: (res: any) => void): void
  function sendHCEMessage(options: any): void
  function startWifi(options: any): void
  function stopWifi(options: any): void
  function connectWifi(options: any): void
  function getWifiList(options: any): void
  function setWifiList(options: any): void
  function onGetWifiList(callback: (res: any) => void): void
  function onWifiConnected(callback: (res: any) => void): void
  function getConnectedWifi(options: any): void
  function setClipboardData(options: any): void
  function getClipboardData(options: any): void
  function setScreenBrightness(options: any): void
  function getScreenBrightness(options: any): void
  function setKeepScreenOn(options: any): void
  function onUserCaptureScreen(callback: (res: any) => void): void
  function vibrateShort(options?: any): void
  function vibrateLong(options?: any): void
  function addPhoneContact(options: any): void
  function getExtConfig(options: any): void
  function getExtConfigSync(): any
  function checkIsSoterEnrolledInDevice(options: any): void
  function checkIsSupportSoterAuthentication(options: any): void
  function startSoterAuthentication(options: any): void
  function checkIsSupportFacialRecognition(options: any): void
  function startFacialRecognitionVerify(options: any): void
  function startFacialRecognitionVerifyAndUploadVideo(options: any): void
  function faceVerifyForPay(options: any): void
  function loadFontFace(options: any): void
  function getAccountInfoSync(): any
  function reportMonitor(name: string, value: number): void
  function reportAnalytics(eventName: string, data: any): void
  function getUpdateManager(): any
  function createWorker(scriptPath: string): any
  function getEnterOptionsSync(): any
  function getLaunchOptionsSync(): any
  function exitMiniProgram(options?: any): void
  function switchTab(options: any): void
  function reLaunch(options: any): void
  function redirectTo(options: any): void
  function navigateTo(options: any): void
  function navigateBack(options?: { delta?: number }): void
  function getStorageInfo(options: any): void
  function getStorageInfoSync(): any
  function getStorage(options: any): void
  function getStorageSync(key: string): any
  function setStorage(options: any): void
  function setStorageSync(key: string, data: any): void
  function removeStorage(options: any): void
  function removeStorageSync(key: string): void
  function clearStorage(options?: any): void
  function clearStorageSync(): void
  function getSystemInfo(options: any): void
  function getSystemInfoSync(): {
    brand: string
    model: string
    pixelRatio: number
    screenWidth: number
    screenHeight: number
    windowWidth: number
    windowHeight: number
    statusBarHeight: number
    language: string
    version: string
    system: string
    platform: string
    fontSizeSetting: number
    SDKVersion: string
    benchmarkLevel: number
    albumAuthorized: boolean
    cameraAuthorized: boolean
    locationAuthorized: boolean
    microphoneAuthorized: boolean
    notificationAuthorized: boolean
    notificationAlertAuthorized: boolean
    notificationBadgeAuthorized: boolean
    notificationSoundAuthorized: boolean
    bluetoothEnabled: boolean
    locationEnabled: boolean
    wifiEnabled: boolean
    safeArea: {
      bottom: number
      height: number
      left: number
      right: number
      top: number
      width: number
    }
    safeAreaInsets: {
      bottom: number
      left: number
      right: number
      top: number
    }
  }
  function canIUse(api: string): boolean
  function base64ToArrayBuffer(base64: string): ArrayBuffer
  function arrayBufferToBase64(buffer: ArrayBuffer): string
}

// 全局声明
declare const uni: typeof uni;