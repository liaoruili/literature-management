#!/bin/bash
# Docker 代理配置脚本

set -e

echo "🔧 配置 Docker 使用代理..."

# 创建 systemd 配置目录
sudo mkdir -p /etc/systemd/system/docker.service.d

# 创建代理配置文件
sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf > /dev/null << 'EOF'
[Service]
Environment="HTTP_PROXY=http://172.10.0.15:7890"
Environment="HTTPS_PROXY=http://172.10.0.15:7890"
Environment="NO_PROXY=localhost,127.0.0.1,::1,172.10.0.0/16"
EOF

echo "✅ 代理配置文件已创建"

# 重新加载 systemd 配置
sudo systemctl daemon-reload

# 重启 Docker 服务
sudo systemctl restart docker

echo "✅ Docker 已重启"

# 验证配置
echo ""
echo "📋 验证 Docker 代理配置："
sudo systemctl show --property=Environment docker | grep PROXY

echo ""
echo "✅ Docker 代理配置完成！"
echo ""
echo "现在可以运行：docker compose up -d postgres redis"
