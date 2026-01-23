<template>
  <div class="permission-example">
    <h1>权限管理使用示例</h1>

    <!-- 示例1：使用权限指令 -->
    <section>
      <h2>示例1：使用 v-permission 指令</h2>
      <button v-permission="'patient:create'" @click="createPatient">
        创建患者（需要 patient:create 权限）
      </button>
      <button v-permission="['patient:read', 'patient:update']" @click="updatePatient">
        更新患者（需要任一权限）
      </button>
      <button v-permission.all="['patient:read', 'patient:export']" @click="exportPatient">
        导出患者（需要所有权限）
      </button>
    </section>

    <!-- 示例2：使用角色指令 -->
    <section>
      <h2>示例2：使用 v-role 指令</h2>
      <div v-role="'admin'">
        <p>这是管理员专用内容</p>
      </div>
      <div v-role="['admin', 'doctor']">
        <p>管理员或医生可以看到这个</p>
      </div>
    </section>

    <!-- 示例3：使用权限组件 -->
    <section>
      <h2>示例3：使用 PermissionGuard 组件</h2>
      <PermissionGuard permission="patient:delete">
        <button @click="deletePatient">删除患者</button>
        <template #no-access>
          <p class="no-access">您没有删除权限</p>
        </template>
      </PermissionGuard>

      <PermissionGuard 
        :permission="['patient:read', 'patient:update']" 
        mode="all"
        :show-fallback="true"
        fallback-text="您需要同时拥有读取和更新权限"
      >
        <button @click="editPatient">编辑患者</button>
      </PermissionGuard>
    </section>

    <!-- 示例4：在脚本中使用 -->
    <section>
      <h2>示例4：在脚本中使用权限检查</h2>
      <button v-if="canCreate" @click="handleCreate">创建（条件渲染）</button>
      <button @click="handleAction">执行操作（方法中检查）</button>
      
      <div v-if="isSuperAdmin" class="super-admin-panel">
        <h3>超级管理员面板</h3>
        <p>只有超级管理员可以看到这个</p>
      </div>
    </section>

    <!-- 示例5：权限信息显示 -->
    <section>
      <h2>示例5：显示当前用户权限信息</h2>
      <div class="permission-info">
        <p><strong>角色：</strong>{{ userRole?.name || '无' }}</p>
        <p><strong>角色代码：</strong>{{ userRole?.code || '无' }}</p>
        <p><strong>是否为超级管理员：</strong>{{ isSuperAdmin ? '是' : '否' }}</p>
        <p><strong>权限列表：</strong></p>
        <ul>
          <li v-for="perm in userPermissions" :key="perm">{{ perm }}</li>
          <li v-if="userPermissions.length === 0">无权限</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePermission } from '@/composables/usePermission'
import PermissionGuard from '@/components/PermissionGuard.vue'

const { 
  hasPermission,
  hasModulePermission,
  hasRole,
  isSuperAdmin,
  getUserRole,
  getUserPermissions,
  fetchPermissions
} = usePermission()

// 登录后获取权限
onMounted(async () => {
  await fetchPermissions()
})

// 计算属性：检查权限
const canCreate = computed(() => {
  return isSuperAdmin.value || hasPermission('patient:create')
})

const userRole = computed(() => getUserRole.value)
const userPermissions = computed(() => getUserPermissions.value)

// 方法中使用权限检查
const createPatient = () => {
  if (!isSuperAdmin.value && !hasPermission('patient:create')) {
    alert('您没有创建患者的权限')
    return
  }
  console.log('创建患者...')
}

const updatePatient = () => {
  if (!isSuperAdmin.value && !hasModulePermission('patient', 'update')) {
    alert('您没有更新患者的权限')
    return
  }
  console.log('更新患者...')
}

const exportPatient = () => {
  if (!isSuperAdmin.value && !hasPermission(['patient:read', 'patient:export'], 'all')) {
    alert('您需要同时拥有读取和导出权限')
    return
  }
  console.log('导出患者...')
}

const deletePatient = () => {
  console.log('删除患者...')
}

const editPatient = () => {
  console.log('编辑患者...')
}

const handleCreate = () => {
  console.log('创建操作...')
}

const handleAction = () => {
  // 在方法中检查权限
  if (!isSuperAdmin.value) {
    if (!hasPermission('patient:read')) {
      alert('您没有读取权限')
      return
    }
    if (!hasRole('doctor')) {
      alert('您不是医生角色')
      return
    }
  }
  
  console.log('执行操作...')
}
</script>

<style scoped>
.permission-example {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

section {
  margin-bottom: 40px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

h2 {
  margin-top: 0;
  color: #333;
}

button {
  margin: 5px;
  padding: 8px 16px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #357abd;
}

.no-access {
  color: #999;
  font-style: italic;
}

.super-admin-panel {
  background: #fff3cd;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #ffc107;
}

.permission-info {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
}

.permission-info ul {
  margin: 10px 0;
  padding-left: 20px;
}
</style>
