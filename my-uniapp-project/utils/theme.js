/**
 * 主题管理工具
 * 提供亮暗主题切换功能
 */

// 主题配置
const themes = {
  light: {
    name: 'light',
    bgColor: '#f3f5fb',
    cardBg: '#ffffff',
    textColor: '#333333',
    textColorSecondary: '#666666',
    textColorTertiary: '#999999',
    borderColor: '#e5e5e5',
    primaryColor: '#4a90e2',
    shadowColor: 'rgba(0, 0, 0, 0.06)'
  },
  dark: {
    name: 'dark',
    bgColor: '#1a1a1a',
    cardBg: '#2d2d2d',
    textColor: '#ffffff',
    textColorSecondary: '#cccccc',
    textColorTertiary: '#999999',
    borderColor: '#404040',
    primaryColor: '#5ba0f2',
    shadowColor: 'rgba(0, 0, 0, 0.3)'
  }
};

/**
 * 获取当前主题
 */
export function getCurrentTheme() {
  try {
    const theme = uni.getStorageSync('appTheme') || 'light';
    return themes[theme] || themes.light;
  } catch (e) {
    return themes.light;
  }
}

/**
 * 设置主题
 */
export function setTheme(themeName) {
  if (!themes[themeName]) {
    console.warn('无效的主题名称:', themeName);
    return;
  }
  
  try {
    uni.setStorageSync('appTheme', themeName);
    
    // 更新全局数据
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.currentTheme = themeName;
      app.globalData.theme = themes[themeName];
    }
    
    // 设置页面主题属性（H5环境）
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-theme', themeName);
      // 动态设置 CSS 变量，确保样式立即生效
      const theme = themes[themeName];
      const root = document.documentElement;
      root.style.setProperty('--bg-color', theme.bgColor);
      root.style.setProperty('--card-bg', theme.cardBg);
      root.style.setProperty('--text-color', theme.textColor);
      root.style.setProperty('--text-color-secondary', theme.textColorSecondary);
      root.style.setProperty('--text-color-tertiary', theme.textColorTertiary);
      root.style.setProperty('--border-color', theme.borderColor);
      root.style.setProperty('--primary-color', theme.primaryColor);
      root.style.setProperty('--shadow-color', theme.shadowColor);
    }
    
    // 小程序/APP 环境：通过页面实例设置样式
    try {
      const pages = getCurrentPages();
      if (pages && pages.length > 0) {
        const currentPage = pages[pages.length - 1];
        const theme = themes[themeName];
        // 小程序环境中，CSS 变量会在页面重新渲染时应用
        // 这里触发页面更新
        if (currentPage.$vm && currentPage.$vm.$forceUpdate) {
          currentPage.$vm.$forceUpdate();
        }
      }
    } catch (e) {
      // 静默处理
    }
    
    // 更新TabBar样式（小程序/APP环境）
    // 注意：只有在 TabBar 页面才能设置 TabBar 样式
    if (typeof uni !== 'undefined' && uni.setTabBarStyle) {
      try {
        // 检查当前页面是否是 TabBar 页面
        const pages = getCurrentPages();
        if (pages && pages.length > 0) {
          const currentPage = pages[pages.length - 1];
          const tabBarList = ['pages/index/index', 'pages/doctor/doctor', 'pages/yishuo/yishuo', 'pages/mine/mine'];
          const currentRoute = currentPage.route;
          
          if (currentRoute && tabBarList.includes(currentRoute)) {
            const theme = themes[themeName];
            // 使用 Promise 方式处理，避免未捕获的错误
            const result = uni.setTabBarStyle({
              color: '#999999',
              selectedColor: theme.primaryColor,
              backgroundColor: theme.cardBg,
              borderStyle: themeName === 'dark' ? 'white' : 'black'
            });
            // 如果是 Promise，处理可能的错误
            if (result && typeof result.catch === 'function') {
              result.catch(() => {
                // 静默处理错误，这不是关键功能
              });
            }
          }
        }
      } catch (e) {
        // 静默处理，这不是关键功能
      }
    }
    
    // 触发主题变更事件
    uni.$emit('themeChange', themes[themeName]);
    
    return themes[themeName];
  } catch (e) {
    console.error('设置主题失败:', e);
    return themes.light;
  }
}

/**
 * 切换主题（亮/暗）
 */
export function toggleTheme() {
  const current = getCurrentTheme();
  const newTheme = current.name === 'light' ? 'dark' : 'light';
  return setTheme(newTheme);
}

/**
 * 初始化主题
 */
export function initTheme() {
  const app = getApp();
  if (!app.globalData) {
    app.globalData = {};
  }
  
  const theme = getCurrentTheme();
  app.globalData.currentTheme = theme.name;
  app.globalData.theme = theme;
  
  // 设置页面主题属性（H5环境）
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('data-theme', theme.name);
    // 动态设置 CSS 变量，确保样式立即生效
    const root = document.documentElement;
    root.style.setProperty('--bg-color', theme.bgColor);
    root.style.setProperty('--card-bg', theme.cardBg);
    root.style.setProperty('--text-color', theme.textColor);
    root.style.setProperty('--text-color-secondary', theme.textColorSecondary);
    root.style.setProperty('--text-color-tertiary', theme.textColorTertiary);
    root.style.setProperty('--border-color', theme.borderColor);
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--shadow-color', theme.shadowColor);
  }
  
  // 小程序/APP环境设置TabBar样式
  // 注意：只有在 TabBar 页面才能设置 TabBar 样式
  if (typeof uni !== 'undefined' && uni.setTabBarStyle) {
    try {
      // 检查当前页面是否是 TabBar 页面
      const pages = getCurrentPages();
      if (pages && pages.length > 0) {
        const currentPage = pages[pages.length - 1];
        const tabBarList = ['pages/index/index', 'pages/doctor/doctor', 'pages/yishuo/yishuo', 'pages/mine/mine'];
        const currentRoute = currentPage.route;
        
        if (currentRoute && tabBarList.includes(currentRoute)) {
          // 使用 Promise 方式处理，避免未捕获的错误
          const result = uni.setTabBarStyle({
            color: '#999999',
            selectedColor: theme.primaryColor,
            backgroundColor: theme.cardBg,
            borderStyle: theme.name === 'dark' ? 'white' : 'black'
          });
          // 如果是 Promise，处理可能的错误
          if (result && typeof result.catch === 'function') {
            result.catch(() => {
              // 静默处理错误，这不是关键功能
            });
          }
        }
      }
    } catch (e) {
      // 静默处理，这不是关键功能
    }
  }
  
  return theme;
}

export default {
  themes,
  getCurrentTheme,
  setTheme,
  toggleTheme,
  initTheme
};

