# RBAC 权限控制系统使用指南

## 概述

本项目实现了完整的基于角色的访问控制（RBAC）系统，支持角色管理和权限控制。

## 角色定义

系统定义了以下角色：

- **admin** - 管理员：拥有所有权限
- **doctor** - 医生：可以管理预约、查看患者、使用AI功能
- **nurse** - 护士：可以查看预约、患者，管理提醒
- **receptionist** - 前台：可以管理预约、患者信息
- **patient** - 患者：只能查看自己的信息

## 权限定义

### 预约管理权限
- `appointment:view` - 查看预约
- `appointment:create` - 创建预约
- `appointment:edit` - 编辑预约
- `appointment:delete` - 删除预约
- `appointment:accept` - 接受预约
- `appointment:cancel` - 取消预约

### 患者管理权限
- `patient:view` - 查看患者
- `patient:create` - 创建患者
- `patient:edit` - 编辑患者
- `patient:delete` - 删除患者

### 员工管理权限
- `staff:view` - 查看员工
- `staff:create` - 创建员工
- `staff:edit` - 编辑员工
- `staff:delete` - 删除员工

### 日程管理权限
- `schedule:view` - 查看日程
- `schedule:create` - 创建日程
- `schedule:edit` - 编辑日程
- `schedule:delete` - 删除日程

### 数据分析权限
- `analytics:view` - 查看分析
- `analytics:export` - 导出数据

### AI功能权限
- `ai:analysis` - AI分析
- `ai:assistant` - AI助手
- `ai:chat` - AI聊天

### 系统管理权限
- `system:settings` - 系统设置
- `system:users` - 用户管理
- `system:roles` - 角色管理

### 提醒管理权限
- `reminder:view` - 查看提醒
- `reminder:send` - 发送提醒
- `reminder:manage` - 管理提醒

### 个人资料权限
- `profile:view` - 查看资料
- `profile:edit` - 编辑资料

## 使用方法

### 1. 在组件中使用 RBAC Store

```vue
<script setup lang="ts">
import { useRbacStore } from '@/stores/rbac'

const rbacStore = useRbacStore()

// 检查权限
if (rbacStore.hasPermission('appointment:create')) {
  // 有权限，执行操作
}

// 检查角色
if (rbacStore.hasRole('admin')) {
  // 是管理员
}

// 检查多个权限（任意一个）
if (rbacStore.hasAnyPermission(['appointment:view', 'appointment:edit'])) {
  // 有任意一个权限
}

// 检查多个权限（全部）
if (rbacStore.hasAllPermissions(['appointment:view', 'appointment:edit'])) {
  // 有所有权限
}
</script>
```

### 2. 使用权限指令 v-permission

#### 基于权限控制元素显示

```vue
<template>
  <!-- 简单权限检查 -->
  <button v-permission="'appointment:create'">
    创建预约
  </button>

  <!-- 多个权限（任意一个） -->
  <button v-permission="['appointment:view', 'appointment:edit']">
    查看或编辑预约
  </button>

  <!-- 基于角色 -->
  <button v-permission="'admin'">
    管理员功能
  </button>

  <!-- 多个角色（任意一个） -->
  <button v-permission="['admin', 'doctor']">
    管理员或医生功能
  </button>

  <!-- 复杂配置：需要所有权限 -->
  <button v-permission="{ permission: ['appointment:view', 'appointment:edit'], mode: 'all' }">
    需要查看和编辑权限
  </button>

  <!-- 复杂配置：需要任意权限 -->
  <button v-permission="{ permission: ['appointment:view', 'appointment:edit'], mode: 'any' }">
    需要查看或编辑权限
  </button>
</template>
```

### 3. 在路由中使用权限守卫

```typescript
// router/index.ts
{
  path: 'appointments',
  name: 'appointments',
  component: AppointmentsView,
  meta: {
    requiresAuth: true,
    permissions: ['appointment:view'], // 需要此权限
    roles: ['admin', 'doctor'], // 或者需要这些角色之一
  },
}
```

路由守卫会自动检查权限，没有权限的用户会被重定向到首页。

### 4. 使用权限工具函数

```typescript
import { checkPermission, checkRole, checkRoutePermission } from '@/utils/permissions'

// 检查权限
if (checkPermission('appointment:create')) {
  // 有权限
}

// 检查角色
if (checkRole('admin')) {
  // 是管理员
}

// 检查路由权限（用于路由守卫）
const hasAccess = checkRoutePermission(
  ['appointment:view'], // 需要的权限
  ['admin', 'doctor']   // 或者需要的角色
)
```

### 5. 设置用户角色

用户登录后，系统会自动从用户信息中读取角色。也可以手动设置：

```typescript
import { useRbacStore } from '@/stores/rbac'

const rbacStore = useRbacStore()
rbacStore.setRole('admin') // 设置为管理员
```

## 角色权限映射

### 管理员 (admin)
拥有所有权限

### 医生 (doctor)
- 预约：查看、创建、编辑、接受、取消
- 患者：查看、创建、编辑
- 日程：查看、创建、编辑
- 分析：查看
- AI：分析、助手、聊天
- 提醒：查看、发送
- 个人资料：查看、编辑

### 护士 (nurse)
- 预约：查看、创建、编辑
- 患者：查看、创建、编辑
- 日程：查看
- 提醒：查看、发送、管理
- 个人资料：查看、编辑

### 前台 (receptionist)
- 预约：查看、创建、编辑、接受、取消
- 患者：查看、创建、编辑
- 日程：查看
- 提醒：查看、发送、管理
- 个人资料：查看、编辑

### 患者 (patient)
- 预约：查看、创建
- 患者：查看（仅自己）
- 日程：查看
- 个人资料：查看、编辑（仅自己）

## 最佳实践

1. **路由级权限**：在路由配置中使用 `meta.permissions` 和 `meta.roles` 控制页面访问
2. **组件级权限**：使用 `v-permission` 指令控制按钮、菜单等元素的显示
3. **功能级权限**：在方法中使用 `hasPermission` 检查权限后再执行操作
4. **API级权限**：后端也应该实现权限验证，前端权限控制只是第一道防线

## 权限管理页面

访问 `/roles` 路由可以查看和测试权限系统（需要管理员权限）。

## 注意事项

1. 权限检查是基于当前用户角色的，确保用户登录后角色已正确设置
2. 权限指令会自动隐藏没有权限的元素
3. 路由守卫会在导航前检查权限，没有权限会自动重定向
4. 所有权限定义都在 `src/stores/rbac.ts` 中，修改权限映射需要更新该文件





