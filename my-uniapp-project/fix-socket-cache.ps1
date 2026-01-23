# Socket.IO 缓存清理脚本
# 用于解决 socket.io-client 加载失败的问题

Write-Host "🧹 开始清理缓存..." -ForegroundColor Cyan

# 清理 unpackage/dist/cache
if (Test-Path "unpackage\dist\cache") {
    Remove-Item -Recurse -Force "unpackage\dist\cache"
    Write-Host "✅ 已清除 unpackage/dist/cache" -ForegroundColor Green
} else {
    Write-Host "ℹ️  unpackage/dist/cache 不存在" -ForegroundColor Yellow
}

# 清理 node_modules/.vite (如果存在)
if (Test-Path "node_modules\.vite") {
    Remove-Item -Recurse -Force "node_modules\.vite"
    Write-Host "✅ 已清除 node_modules/.vite" -ForegroundColor Green
} else {
    Write-Host "ℹ️  node_modules/.vite 不存在" -ForegroundColor Yellow
}

# 重新安装 socket.io-client
Write-Host "📦 重新安装 socket.io-client..." -ForegroundColor Cyan
npm install socket.io-client

Write-Host "`n✅ 清理完成！请执行以下操作：" -ForegroundColor Green
Write-Host "1. 清除浏览器缓存（Ctrl+Shift+Delete）" -ForegroundColor Yellow
Write-Host "2. 重启开发服务器" -ForegroundColor Yellow
Write-Host "3. 刷新浏览器页面（Ctrl+F5 强制刷新）" -ForegroundColor Yellow
