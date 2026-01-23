/**
 * 主题混入
 * 在组件中使用，自动响应主题切换
 */
import { getCurrentTheme } from '@/utils/theme.js';

export default {
  data() {
    return {
      theme: getCurrentTheme()
    };
  },
  onShow() {
    // 监听主题变更
    uni.$on('themeChange', this.updateTheme);
    this.updateTheme();
  },
  onHide() {
    uni.$off('themeChange', this.updateTheme);
  },
  methods: {
    updateTheme(theme) {
      this.theme = theme || getCurrentTheme();
      this.$forceUpdate();
    }
  }
};

