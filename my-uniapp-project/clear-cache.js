/**
 * 清除缓存脚本
 * 用于解决 socket.io-client 动态导入失败的问题
 */

const fs = require('fs')
const path = require('path')

const dirsToRemove = [
  'unpackage/dist/cache',
  'unpackage/dist',
  'node_modules/.vite',
  'node_modules/.cache'
]

console.log('🧹 开始清除缓存...\n')

let removedCount = 0
dirsToRemove.forEach(dir => {
  const fullPath = path.join(__dirname, dir)
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true })
      console.log(`✅ 已删除: ${dir}`)
      removedCount++
    } catch (error) {
      console.error(`❌ 删除失败: ${dir}`, error.message)
    }
  } else {
    console.log(`ℹ️  不存在: ${dir}`)
  }
})

console.log(`\n✨ 完成！已清除 ${removedCount} 个缓存目录`)
console.log('\n📝 下一步：')
console.log('   1. 重新运行: npm run dev:h5')
console.log('   2. 如果还有问题，尝试: npm install')
