# 🚀 完整系统启动指南

## ✅ 准备就绪

你现在拥有一个**完整的 Full-Stack 应用**：
- ✅ 后端 API（FastAPI）- **已完成**
- ✅ 前端界面（React）- **刚刚创建**
- ✅ 数据库 Schema - **已完成**
- ✅ 部署配置 - **已完成**

---

## 📖 启动步骤

### 方式一：Docker Compose（推荐新手）

#### 1. 启动所有服务

```bash
cd /home/liaoruili/lingma_projects/literature_v1/docker
docker-compose up -d
```

这会启动：
- PostgreSQL 数据库
- Redis 缓存
- FastAPI 后端（端口 8000）
- Celery Worker
- Celery Beat

#### 2. 初始化数据库

```bash
cd /home/liaoruili/lingma_projects/literature_v1/backend
docker-compose exec backend alembic upgrade head
```

#### 3. 安装并启动前端

```bash
cd /home/liaoruili/lingma_projects/literature_v1/frontend
npm install
npm run dev
```

#### 4. 访问应用

- **前端界面**: http://localhost:3000
- **API 文档**: http://localhost:8000/docs
- **后端健康检查**: http://localhost:8000/health

---

### 方式二：手动启动（适合开发）

#### 1. 启动数据库和 Redis

**使用 Docker：**
```bash
docker run -d --name literature-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=literature_db \
  -p 5432:5432 \
  postgres:15

docker run -d --name literature-redis \
  -p 6379:6379 \
  redis:7
```

**或本地安装：**
```bash
# Ubuntu
sudo apt install postgresql redis-server
sudo systemctl start postgresql
sudo systemctl start redis

# 创建数据库
createdb literature_db
```

#### 2. 配置后端环境变量

```bash
cd /home/liaoruili/lingma_projects/literature_v1/backend
cp .env.example .env
```

编辑 `.env`：
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=literature_db
SECRET_KEY=your-secret-key-min-32-characters-long-change-this
```

#### 3. 安装后端依赖并启动

```bash
cd /home/liaoruili/lingma_projects/literature_v1/backend

# 安装依赖
uv sync

# 运行数据库迁移
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/literature_db"
alembic upgrade head

# 启动 FastAPI
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

打开新终端，启动 Celery Worker（可选）：
```bash
celery -A app.tasks.celery_app worker --loglevel=info
```

#### 4. 安装并启动前端

```bash
cd /home/liaoruili/lingma_projects/literature_v1/frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 启动开发服务器
npm run dev
```

---

## 🌐 访问地址

启动成功后，打开浏览器访问：

### 🎨 前端界面
```
http://localhost:3000
```

**功能：**
- ✅ 文献列表页面
- ✅ 文献详情页面
- ✅ BibTeX 查看
- ✅ DOI 链接跳转

### 📡 API 文档
```
http://localhost:8000/docs
```

**功能：**
- ✅ 查看所有 API 端点
- ✅ 在线测试 API（Swagger UI）
- ✅ 请求/响应格式说明

### 📄 ReDoc 文档
```
http://localhost:8000/redoc
```

更美观的 API 文档界面

### ❤️ 健康检查
```
http://localhost:8000/health
```

应返回：
```json
{
  "status": "healthy",
  "version": "0.1.0"
}
```

---

## 🧪 测试功能

### 创建第一篇文献

#### 方法 1：通过前端界面（待实现添加功能）

#### 方法 2：通过 API 文档（推荐）

1. 访问 http://localhost:8000/docs
2. 展开 `POST /api/v1/papers`
3. 点击 "Try it out"
4. 填入以下 JSON：

```json
{
  "title": "Economic Growth and Innovation",
  "authors": [{"name": "Smith, John", "affiliation": "Harvard University"}],
  "journal": "American Economic Review",
  "year": 2024,
  "volume": "114",
  "number": "3",
  "pages": "123-456",
  "doi": "10.1257/aer.20240001",
  "abstract": "This paper studies the relationship between economic growth and innovation.",
  "keywords": ["growth", "innovation", "R&D"],
  "jel_codes": ["O30", "O40"]
}
```

5. 点击 "Execute"
6. 看到响应后，刷新前端页面 http://localhost:3000

#### 方法 3：使用 curl

```bash
curl -X POST "http://localhost:8000/api/v1/papers" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Economic Growth and Innovation",
    "authors": [{"name": "Smith, John"}],
    "journal": "American Economic Review",
    "year": 2024,
    "volume": "114",
    "number": "3",
    "pages": "123-456",
    "doi": "10.1257/aer.20240001",
    "keywords": ["growth", "innovation"],
    "jel_codes": ["O30", "O40"]
  }'
```

---

## 🔧 故障排查

### 问题 1：前端显示"加载失败"

**检查后端是否运行：**
```bash
curl http://localhost:8000/health
```

**解决：** 确保后端已启动在 8000 端口

### 问题 2：数据库连接失败

**检查 PostgreSQL：**
```bash
psql -U postgres -d literature_db
```

**解决：** 确保数据库已创建且连接字符串正确

### 问题 3：前端端口被占用

**修改端口：** 编辑 `frontend/vite.config.ts`
```typescript
server: {
  port: 3001, // 改为 3001 或其他
}
```

### 问题 4：CORS 错误

**检查后端 CORS 配置：** 已在 `backend/app/main.py` 中配置

---

## 📱 当前功能清单

### ✅ 已有功能
- [x] 文献列表展示
- [x] 文献详情查看
- [x] BibTeX 引用格式查看
- [x] DOI 链接跳转
- [x] JEL 分类号显示
- [x] 关键词标签
- [x] 引用数显示
- [x] 响应式设计（手机/平板/桌面）

### ⏳ 待开发功能
- [ ] 添加文献表单
- [ ] 编辑文献功能
- [ ] 笔记创建和编辑
- [ ] PDF 上传和查看
- [ ] 搜索功能
- [ ] 文献统计图表
- [ ] 批量导入导出

---

## 🎯 下一步建议

### 立即体验
1. 启动后端和前端
2. 访问 http://localhost:3000
3. 通过 API 文档创建几篇文献
4. 在前端查看文献列表和详情

### 继续开发
我可以帮你实现：
- 📝 笔记编辑器（Markdown）
- ➕ 添加文献表单
- 🔍 搜索功能
- 📄 PDF 上传功能
- 📊 统计面板

需要我继续开发哪个功能？

---

## 📞 快速命令参考

```bash
# 后端启动
cd backend && uvicorn app.main:app --reload

# 前端启动
cd frontend && npm run dev

# 数据库迁移
alembic upgrade head

# Docker 启动
cd docker && docker-compose up -d

# 查看日志
docker-compose logs -f
```
