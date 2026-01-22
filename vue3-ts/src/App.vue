<script setup lang="ts">
</script>

<template>
  <router-view />
</template>

<style scoped>
:global(body) {
  margin: 0;
  font-family: 'Inter', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background: linear-gradient(135deg, #f7f9f6, #f1f4f0);
  color: #2d2f31;
}

:global(*),
:global(*::before),
:global(*::after) {
  box-sizing: border-box;
}

:global(a) {
  color: inherit;
  text-decoration: none;
}

:global(#app) {
  min-height: 100vh;
}

.app-shell {
  min-height: 100vh;
}
</style>
