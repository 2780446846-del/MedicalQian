import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { permission, role } from './directives/permission'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 注册权限指令
app.directive('permission', permission)
app.directive('role', role)

app.mount('#app')
