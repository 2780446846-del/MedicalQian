import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useRbacStore } from '../stores/rbac'

import type { Permission, Role } from '../stores/rbac'
import MainLayout from '../layouts/MainLayout.vue'
import HomeView from '../views/HomeView.vue'
import ScheduleView from '../views/ScheduleView.vue'
import PatientsView from '../views/PatientsView.vue'
import AppointmentsView from '../views/AppointmentsView.vue'
import StaffView from '../views/StaffView.vue'
import StaffDetail from '../views/StaffDetail.vue'
import PatientDetailView from '../views/PatientDetailView.vue'
import HelpView from '../views/HelpView.vue'
import AIAssistantView from '../views/AIAssistantView.vue'
import HumanBodyView from '../views/HumanBodyView.vue'
import LoginView from '../views/LoginView.vue'
import ChatView from '../views/ChatView.vue'
import AnalyticsView from '../views/AnalyticsView.vue'
import ProfileView from '../views/ProfileView.vue'
import RBACView from '../views/RBACView.vue'
import DoctorCertView from '../views/DoctorCertView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false },
    },
    {
      path: '/ai-analysis',
      redirect: '/',
    },
    {
      path: '/',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: HomeView,
        },
        {
          path: 'schedule',
          name: 'schedule',
          component: ScheduleView,
        },
        {
          path: 'patients',
          name: 'patients',
          component: PatientsView,
          meta: {
            requiresAuth: true,
            permissions: ['patient:view'] as Permission[],
          },
        },
        {
          path: 'appointments',
          name: 'appointments',
          component: AppointmentsView,
          meta: {
            requiresAuth: true,
            permissions: ['appointment:view'] as Permission[],
          },
        },
        {
          path: 'staff',
          name: 'staff',
          component: StaffView,
          meta: {
            requiresAuth: true,
            permissions: ['staff:view'] as Permission[],
            roles: ['admin'] as Role[],
          },
        },
        {
          path: 'staff/:id',
          name: 'staff-detail',
          component: StaffDetail,
          meta: {
            requiresAuth: true,
            permissions: ['staff:view'] as Permission[],
            roles: ['admin'] as Role[],
          },
        },
        {
          path: 'patients/:id',
          name: 'patient-detail',
          component: PatientDetailView,
        },
        {
          path: 'help',
          name: 'help',
          component: HelpView,
        },
        {
          path: 'ai-assistant',
          name: 'ai-assistant',
          component: AIAssistantView,
          meta: {
            requiresAuth: true,
            permissions: ['ai:assistant'] as Permission[],
          },
        },
        {
          path: 'human-body',
          name: 'human-body',
          component: HumanBodyView,
        },
        {
          path: 'chat',
          name: 'chat',
          component: ChatView,
        },
        {
          path: 'analytics',
          name: 'analytics',
          component: AnalyticsView,
          meta: {
            requiresAuth: true,
            permissions: ['analytics:view'] as Permission[],
            roles: ['admin', 'doctor'] as Role[],
          },
        },
        {
          path: 'profile',
          name: 'profile',
          component: ProfileView,
        },
        {
          path: 'doctor-cert',
          name: 'doctor-cert',
          component: DoctorCertView,
          meta: {
            requiresAuth: true,
          },
        },
        {
          path: 'rbac',
          name: 'rbac',
          component: RBACView,
          meta: { requiresAuth: true, requiresPermission: 'rbac:read' },
        },
      ],
    },
  ],
})

// 路由守卫：未登录不能进入需要认证的页面，并检查权限
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const rbacStore = useRbacStore()

  // 导入权限composable
  const { usePermission } = await import('@/composables/usePermission')
  const permissionComposable = usePermission()
  const { fetchPermissions, hasPermission, hasRole, permissionData, loading, isSuperAdmin: checkIsSuperAdmin } = permissionComposable

  // 检查是否有QQ登录的token参数（QQ登录回调）
  const qqToken = to.query.qq_token as string
  const qqUserStr = to.query.qq_user as string

  if (qqToken) {
    console.log('✅ 检测到QQ登录token，开始处理登录')

    // 保存token
    localStorage.setItem('sso_token', qqToken)

    // 如果有用户信息，保存用户信息
    if (qqUserStr) {
      try {
        const qqUser = JSON.parse(decodeURIComponent(qqUserStr))
        localStorage.setItem('sso_user_info', JSON.stringify(qqUser))
        console.log('✅ QQ用户信息已保存:', qqUser.username)
      } catch (e) {
        console.warn('⚠️ 解析QQ用户信息失败:', e)
      }
    }

    // 重置手动登出标志
    localStorage.removeItem('sso_manual_logout')

    // 同步authStore
    authStore.syncFromLocalStorage()

    // 通知其他窗口token已更新
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('sso_token_channel')
      const userInfo = qqUserStr ? JSON.parse(decodeURIComponent(qqUserStr)) : null
      channel.postMessage({
        type: 'token_updated',
        key: 'sso_token',
        value: qqToken,
        userInfo: userInfo
      })
      channel.close()
    }

    // 清除URL参数并跳转到目标页面（如果没有目标页面则跳转到首页）
    const targetPath = to.path === '/login' ? '/' : to.path
    next({ path: targetPath, replace: true })
    return
  }

  // 每次导航前，同步一次本地存储（确保从 UniApp 或其他页面同步的 token 生效）
  if (authStore.syncFromLocalStorage) {
    authStore.syncFromLocalStorage()
  }

  // 如果已登录，同步用户角色
  if (authStore.isAuthenticated && authStore.userInfo?.role) {
    rbacStore.setRole(authStore.userInfo.role as Role)
  }

  const isAuthenticated = authStore.isAuthenticated
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  // 已登录用户访问登录页，则直接跳到首页
  if (to.path === '/login' && isAuthenticated) {
    next(from.path && from.path !== '/login' ? from.fullPath : '/')
    return
  }

  // 需要登录但当前未登录，跳转到登录页并带上重定向地址
  if (requiresAuth && !isAuthenticated) {
    next({
      path: '/login',
      query: { redirect: to.fullPath },
    })
    return
  }

  // 检查路由权限
  if (isAuthenticated && requiresAuth) {
    // 优化：只在没有权限数据时才获取，避免每次路由跳转都请求
    if ((!permissionData.value.role || permissionData.value.permissions.length === 0) && !loading.value) {
      try {
    await fetchPermissions()
      } catch (error) {
        console.warn('权限获取失败，但继续加载页面:', error)
        // 权限获取失败不阻止页面加载，让页面先显示
      }
    }

    const route = to.matched[to.matched.length - 1]
    if (route) {
      // 超级管理员和admin角色可以访问所有页面
      const userRoleCode = permissionData.value.role?.code ||
                          authStore.userInfo?.roles?.[0]?.code ||
                          (typeof authStore.userInfo?.role === 'string' ? authStore.userInfo.role : authStore.userInfo?.role?.code)
      const isAdmin = userRoleCode === 'admin'

      // 检查用户名是否为admin（超级管理员标识）
      const username = authStore.userInfo?.username
      const isSuperAdminByUsername = username && username.toLowerCase() === 'admin'

      if (checkIsSuperAdmin.value || isAdmin || isSuperAdminByUsername) {
        // 超级管理员和admin可以访问所有页面，直接通过
        next()
        return
      }

      // 检查 requiresPermission（单个权限字符串）
      const requiresPermission = route.meta.requiresPermission as string | undefined
      if (requiresPermission) {
        if (!hasPermission(requiresPermission)) {
          // 没有权限，跳转到首页或显示无权限提示
          next({
            path: '/',
            query: { error: 'no_permission' },
          })
          return
        }
      }

      // 检查 permissions（权限数组）和 roles（角色数组）
      const requiredPermissions = route.meta.permissions as Permission[] | undefined
      const requiredRoles = route.meta.roles as Role[] | undefined

      if (requiredPermissions || requiredRoles) {
        // 检查角色
        if (requiredRoles && requiredRoles.length > 0) {
          const roleCodes = requiredRoles.map(r => {
            if (typeof r === 'string') return r
            if (typeof r === 'object' && r !== null && 'code' in r) return (r as { code: string }).code
            return String(r)
          })
          if (!hasRole(roleCodes)) {
            next({
              path: '/',
              query: { error: 'no_permission' },
            })
            return
          }
        }

        // 检查权限
        if (requiredPermissions && requiredPermissions.length > 0) {
          const permissionCodes = requiredPermissions.map(p => {
            if (typeof p === 'string') return p
            if (typeof p === 'object' && p !== null && 'code' in p) return (p as { code: string }).code
            return String(p)
          })
          if (!hasPermission(permissionCodes, 'any')) {
            next({
              path: '/',
              query: { error: 'no_permission' },
            })
            return
          }
        }
      }
    }
  }

  next()
})

export default router
