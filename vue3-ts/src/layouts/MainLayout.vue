<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useRbacStore } from '../stores/rbac'
import { usePermission } from '../composables/usePermission'
import { computed } from 'vue'

const rbacStore = useRbacStore()
const { hasPermission: checkPermission, hasRole: checkRole, isSuperAdmin } = usePermission()

// 菜单项配置
const menuItems = computed(() => {
  const items = [
    {
      path: '/',
      icon: '🏠',
      label: '首页',
      permission: null, // 所有用户都可以访问
    },
    {
      path: '/schedule',
      icon: '📅',
      label: '日程安排',
      permission: 'schedule:view' as const,
    },
    {
      path: '/patients',
      icon: '🧾',
      label: '患者列表',
      permission: 'patient:view' as const,
    },
    {
      path: '/appointments',
      icon: '📋',
      label: '预约列表',
      permission: 'appointment:view' as const,
    },
    {
      path: '/staff',
      icon: '🩺',
      label: '员工列表',
      permission: 'staff:view' as const,
      role: 'admin' as const,
    },
    {
      path: '/help',
      icon: '❓',
      label: '帮助中心',
      permission: null,
    },
    {
      path: '/chat',
      icon: '💬',
      label: '在线咨询',
      permission: null,
    },
    {
      path: '/ai-analysis',
      icon: '📊',
      label: 'AI数据分析',
      permission: 'ai:analysis' as const,
    },
    {
      path: '/ai-assistant',
      icon: '🤖',
      label: 'AI医疗助手',
      permission: 'ai:assistant' as const,
    },
    {
      path: '/human-body',
      icon: '👤',
      label: '3D人体模型',
      permission: null,
    },
    {
      path: '/analytics',
      icon: '📈',
      label: '数据统计',
      permission: 'analytics:view' as const,
    },
    {
      path: '/roles',
      icon: '🔐',
      label: '角色权限管理',
      permission: 'system:roles' as const,
      role: 'admin' as const,
    },
  ]

  // 过滤菜单项：只显示有权限的
  return items.filter(item => {
    // 超级管理员可以看到所有菜单
    if (isSuperAdmin.value) {
      return true
    }
    
    // admin 角色也可以看到所有菜单（临时方案，确保admin有完整功能）
    if (checkRole('admin')) {
      return true
    }
    
    // 检查角色限制
    if (item.role && !checkRole(item.role)) {
      return false
    }
    
    // 检查权限限制
    if (item.permission && !checkPermission(item.permission)) {
      return false
    }
    
    return true
  })
})
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="logo">✔</div>
        <div class="brand-text">
          <div class="name">Heal.Care</div>
          <div class="subtitle">健康</div>
        </div>
      </div>

      <nav class="nav">
        <RouterLink
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          active-class="active"
          :exact-active-class="item.path === '/' ? 'active' : undefined"
        >
          <span class="icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="version">v1.8.5.0 版权所有 2024 ShenDu</div>
      </div>
    </aside>

    <section class="main">
      <RouterView />
    </section>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  position: relative;
}

.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  width: 220px;
  height: 100vh;
  background: #f5f7f4;
  border-right: 1px solid #e4e8e1;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 1000;
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f5f7f4;
}

.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
}

.logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #46c266;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 18px;
}

.brand-text .name {
  font-size: 18px;
}

.brand-text .subtitle {
  font-size: 13px;
  color: #6e736c;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  color: #4b5148;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.nav-item.active,
.nav-item:hover {
  background: #e8f4eb;
  color: #2f9b52;
}

.icon {
  width: 22px;
  text-align: center;
}

.sidebar-footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}


.version {
  font-size: 12px;
  color: #99a29b;
  text-align: center;
}

.main {
  margin-left: 220px;
  min-height: 100vh;
  background: transparent;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 暗色模式下的侧边栏样式 */
:global(.dark) .sidebar {
  background: #16202d !important;
  border-right-color: #1e2a3a !important;
  scrollbar-color: #4a5568 #16202d;
}

:global(.dark) .sidebar::-webkit-scrollbar-thumb {
  background: #4a5568;
}

:global(.dark) .sidebar::-webkit-scrollbar-thumb:hover {
  background: #5a6578;
}

:global(.dark) .brand-text .name,
:global(.dark) .brand-text .subtitle {
  color: #ffffff !important;
}

:global(.dark) .nav-item {
  color: #e0e6ed !important;
}

:global(.dark) .nav-item.active,
:global(.dark) .nav-item:hover {
  background: #1e2a3a !important;
  color: #4fc3f7 !important;
}


:global(.dark) .version {
  color: #9eb3c7 !important;
}

@media (max-width: 1100px) {
  .sidebar {
    width: 200px;
  }

  .main {
    margin-left: 200px;
  }
}

@media (max-width: 820px) {
  .sidebar {
    position: fixed;
    left: -220px;
    width: 220px;
    transition: left 0.3s ease;
    z-index: 2000;
  }

  .sidebar.open {
    left: 0;
  }

  .main {
    margin-left: 0;
  }

  /* 移动端可以添加一个菜单按钮来切换侧边栏 */
}
</style>

