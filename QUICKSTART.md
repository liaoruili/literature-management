# 项目快速启动指南

## 📋 已完成内容

### ✅ 后端开发 (100%)

#### 1. 数据库设计
- ✅ PostgreSQL Schema 设计（5 个核心表）
- ✅ Alembic 迁移配置
- ✅ SQLAlchemy 模型定义
- ✅ Pydantic Schemas 验证

**文件位置**: `backend/alembic/versions/20260316_0000_initial_schema.py`

#### 2. API 接口
- ✅ Papers API (CRUD + PDF 上传 + BibTeX 导出)
- ✅ Notes API (CRUD)
- ✅ Journals API (CRUD + 抓取触发)
- ✅ Citations API (更新 + 指标)
- ✅ Search API (全文搜索 + 高级搜索)
- ✅ Tasks API (任务管理)

**文件位置**: `backend/app/api/v1/`

#### 3. 后台任务
- ✅ Celery 配置
- ✅ 元数据抓取任务
- ✅ 引用数更新任务
- ✅ 定时任务调度

**文件位置**: `backend/app/tasks/`

#### 4. 部署配置
- ✅ Docker Compose 配置
- ✅ Nginx 配置
- ✅ Systemd 服务配置
- ✅ 部署脚本
- ✅ 备份脚本

**文件位置**: `docker/`, `nginx/`, `scripts/`

---

## 🚀 本地开发环境搭建

### 步骤 1: 安装依赖

```bash
# 进入后端目录
cd /home/liaoruili/lingma_projects/literature_v1/backend

# 使用 UV 安装依赖
uv sync
```

### 步骤 2: 启动数据库和 Redis

**方式 A: 使用 Docker Compose（推荐）**

```bash
cd /home/liaoruili/lingma_projects/literature_v1/docker
docker-compose up -d postgres redis
```

**方式 B: 本地安装**

```bash
# Ubuntu
sudo apt install postgresql postgresql-contrib redis-server

# 创建数据库
createdb literature_db

# 启动服务
sudo systemctl start postgresql
sudo systemctl start redis
```

### 步骤 3: 配置环境变量

```bash
cd /home/liaoruili/lingma_projects/literature_v1/backend
cp .env.example .env
```

编辑 `.env` 文件：

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password_here
POSTGRES_DB=literature_db
SECRET_KEY=your-secret-key-min-32-characters-long
```

### 步骤 4: 运行数据库迁移

```bash
# 确保在 backend 目录
export DATABASE_URL="postgresql://postgres:your_password@localhost:5432/literature_db"

# 运行迁移
alembic upgrade head

# 验证
python scripts/init_db.py
```

### 步骤 5: 启动开发服务器

```bash
# 终端 1 - 启动 FastAPI
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 终端 2 - 启动 Celery Worker
celery -A app.tasks.celery_app worker --loglevel=info

# 终端 3 - 启动 Celery Beat（定时任务）
celery -A app.tasks.celery_app beat --loglevel=info
```

### 步骤 6: 访问 API 文档

打开浏览器访问：http://localhost:8000/docs

---

## 🧪 测试 API

### 创建第一篇文献

```bash
curl -X POST "http://localhost:8000/api/v1/papers" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Economic Growth and Innovation",
    "authors": [{"name": "Smith, John", "affiliation": "Harvard University"}],
    "journal": "American Economic Review",
    "year": 2024,
    "volume": "114",
    "number": "3",
    "pages": "123-456",
    "doi": "10.1257/aer.20240001",
    "abstract": "This paper studies the relationship between growth and innovation.",
    "keywords": ["growth", "innovation", "R&D"],
    "jel_codes": ["O30", "O40"]
  }'
```

### 为文献添加笔记

```bash
curl -X POST "http://localhost:8000/api/v1/papers/{paper_id}/notes" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# 核心观点\n\n这篇文章提出了...",
    "tags": ["growth", "important"]
  }'
```

### 搜索文献

```bash
# 全文搜索
curl "http://localhost:8000/api/v1/search?q=innovation"

# 按 JEL 代码筛选
curl "http://localhost:8000/api/v1/search?jel_code=O30"

# 组合筛选
curl "http://localhost:8000/api/v1/search?q=growth&year_from=2020&has_pdf=true"
```

### 导出 BibTeX

```bash
curl "http://localhost:8000/api/v1/papers/{paper_id}/bib"
```

---

## 📦 Docker 一键部署

```bash
cd /home/liaoruili/lingma_projects/literature_v1/docker

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

---

## 🗂️ 项目文件结构

```
literature_v1/
├── backend/                    # 后端代码
│   ├── app/
│   │   ├── api/v1/            # API 路由
│   │   │   ├── papers.py      # ✅ 文献 API
│   │   │   ├── notes.py       # ✅ 笔记 API
│   │   │   ├── journals.py    # ✅ 期刊 API
│   │   │   ├── citations.py   # ✅ 引用 API
│   │   │   ├── search.py      # ✅ 搜索 API
│   │   │   └── tasks.py       # ✅ 任务 API
│   │   ├── models/            # SQLAlchemy 模型
│   │   │   ├── paper.py       # ✅ 文献模型
│   │   │   ├── note.py        # ✅ 笔记模型
│   │   │   ├── journal.py     # ✅ 期刊模型
│   │   │   ├── citation.py    # ✅ 引用模型
│   │   │   └── task.py        # ✅ 任务模型
│   │   ├── schemas/           # Pydantic 验证模型
│   │   ├── tasks/             # Celery 任务
│   │   │   ├── celery_app.py  # ✅ Celery 配置
│   │   │   ├── metadata_scraper.py    # ✅ 元数据抓取
│   │   │   ├── citation_updater.py    # ✅ 引用更新
│   │   │   └── scheduled_tasks.py     # ✅ 定时任务
│   │   ├── main.py            # ✅ FastAPI 入口
│   │   ├── config.py          # ✅ 配置管理
│   │   └── database.py        # ✅ 数据库连接
│   ├── alembic/               # ✅ 数据库迁移
│   ├── scripts/               # ✅ 工具脚本
│   ├── pyproject.toml         # ✅ 依赖管理
│   └── README.md              # ✅ 后端文档
├── docker/                    # ✅ Docker 配置
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── nginx/                     # ✅ Nginx 配置
│   └── nginx.conf
├── scripts/                   # ✅ 部署脚本
│   ├── deploy.sh
│   └── backup_db.sh
├── docs/                      # ✅ 文档
│   └── architecture.md
├── .gitignore                 # ✅ Git 忽略文件
└── README.md                  # ✅ 项目总览
```

---

## 📊 数据库 Schema 概览

### 5 个核心表

1. **papers** - 文献元数据
   - UUID 主键，citation_key 唯一标识
   - JSONB 字段：authors, keywords, jel_codes
   - BibTeX 所有字段齐全

2. **notes** - 读书笔记
   - Markdown 格式内容
   - AI 生成标记
   - 标签系统

3. **journals** - 期刊信息
   - 自动更新配置
   - 抓取源配置

4. **citations** - 引用记录
   - 单个引用追踪
   - 来源数据库标记

5. **tasks** - 后台任务
   - 进度追踪
   - 错误记录

---

## 🔧 下一步开发建议

### 立即可做

1. **测试 API** - 使用 curl 或 Postman 测试所有端点
2. **前端开发** - React + TypeScript 实现 UI
3. **爬虫实现** - 针对具体期刊网站编写解析逻辑

### 短期计划

1. **用户认证** - JWT Token 认证系统
2. **批量导入** - BibTeX 文件批量导入
3. **统计面板** - 文献统计图表

### 长期计划

1. **全文搜索** - Elasticsearch 集成
2. **对象存储** - MinIO/S3 存储 PDF
3. **多用户** - 团队协作功能

---

## 🐛 常见问题

### Q: 数据库连接失败？

```bash
# 检查 PostgreSQL 状态
systemctl status postgresql

# 检查端口
netstat -tlnp | grep 5432

# 测试连接
psql -U postgres -d literature_db
```

### Q: Alembic 迁移失败？

```bash
# 清理迁移历史
alembic downgrade base

# 重新应用
alembic upgrade head
```

### Q: Celery 任务不执行？

```bash
# 检查 Redis
redis-cli ping

# 查看 Worker 日志
celery -A app.tasks.celery_app worker --loglevel=debug
```

---

## 📞 技术支持

- API 文档：http://localhost:8000/docs
- 架构文档：`docs/architecture.md`
- 项目 README: `README.md`
