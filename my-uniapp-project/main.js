
// #ifndef VUE3
import Vue from 'vue'
import App from './App'

Vue.config.productionTip = false

App.mpType = 'app'

const app = new Vue({
    ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
import AppComponent from './App.vue'
export function createApp() {
  const app = createSSRApp(AppComponent)
  return {
    app
  }
}
// #endif
