# 系统架构设计文档

## 1. 概述

本文档描述学术期刊数据库系统的整体架构设计。该系统旨在为经济学研究者提供一个完整的文献管理解决方案，包括元数据抓取、PDF 管理、笔记功能和引用追踪。

## 2. 架构目标

- **高可用性** - 支持 7x24 小时运行，定时任务自动执行
- **可扩展性** - 模块化设计，便于添加新功能
- **性能优化** - 异步 I/O，数据库索引，缓存策略
- **易维护性** - 清晰的代码组织，自动化部署
- **数据安全** - 定期备份，事务保证

## 3. 技术选型

### 3.1 后端技术栈

| 组件 | 技术 | 理由 |
|------|------|------|
| Web 框架 | FastAPI | 异步高性能，自动 API 文档，类型安全 |
| 数据库 | PostgreSQL 15 | JSONB 支持，强大查询能力，稳定性 |
| ORM | SQLAlchemy 2.0 | 成熟稳定，异步支持，类型提示 |
| 迁移 | Alembic | SQLAlchemy 官方迁移工具 |
| 验证 | Pydantic v2 | 快速验证，类型安全 |
| 任务队列 | Celery | 成熟的任务调度系统 |
| 缓存 | Redis | 高性能，Celery 后端 |
| 包管理 | UV | 极速安装，现代化 |

### 3.2 前端技术栈（待开发）

| 组件 | 技术 | 理由 |
|------|------|------|
| 框架 | React 18 + TS | 生态强大，类型安全 |
| 构建 | Vite | 极速开发体验 |
| 样式 | TailwindCSS | 原子化 CSS，高效开发 |
| 状态 | Zustand | 轻量简洁 |
| 数据 | TanStack Query | 缓存、重试机制 |

### 3.3 部署技术栈

| 组件 | 技术 | 理由 |
|------|------|------|
| Web 服务器 | Nginx | 行业标准，反向代理 |
| ASGI 服务器 | Gunicorn + Uvicorn | 生产级性能 |
| 容器化 | Docker | 环境一致性 |
| SSL | Let's Encrypt | 免费证书 |

## 4. 系统架构

### 4.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Web UI     │  │  Mobile App  │  │  AI Assistant│       │
│  │   (React)    │  │   (Future)   │  │  (API Call)  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ HTTPS (443)
┌─────────────────────────────────────────────────────────────┐
│                    Nginx Layer                               │
│  • SSL Termination    • Rate Limiting    • Static Files     │
│  • Reverse Proxy      • Load Balancing   • Compression      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                Application Layer (FastAPI)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  API Routes                           │   │
│  │  /papers  /notes  /journals  /citations  /search     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               Business Logic (Services)               │   │
│  │  • Metadata Scraper  • PDF Processor                 │   │
│  │  • Citation Updater  • BIB Generator                 │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Data Access Layer (ORM)                  │   │
│  │           SQLAlchemy Async Session                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
              │                    │
              ▼                    ▼
┌────────────────────┐  ┌────────────────────┐
│   PostgreSQL DB    │  │     Redis Cache    │
│  • Papers          │  │  • Celery Broker   │
│  • Notes           │  │  • Result Backend  │
│  • Journals        │  │  • Session Cache   │
│  • Citations       │  │                    │
│  • Tasks           │  │                    │
└────────────────────┘  └────────────────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │   Celery Workers   │
                    │  • Metadata Scrap  │
                    │  • Citation Update │
                    │  • PDF Processing  │
                    └────────────────────┘
```

### 4.2 数据流

#### 4.2.1 文献创建流程

```
User → API Request → Validation → Database → Response
                     (Pydantic)  (SQLAlchemy)
```

#### 4.2.2 元数据抓取流程

```
Scheduler → Celery Beat → Celery Worker → Scraper Service
                                              │
                                              ▼
                                        Journal Website
                                              │
                                              ▼
                                          Parse HTML
                                              │
                                              ▼
                                        Save to DB
```

#### 4.2.3 引用更新流程

```
Daily Schedule → Celery Beat → Citation Worker
                                      │
                                      ▼
                                Crossref API
                                      │
                                      ▼
                                  Update Count
                                      │
                                      ▼
                                  Log History
```

## 5. 数据库设计

### 5.1 ER 图

```
┌─────────────┐       ┌─────────────┐
│   papers    │◄──────│   notes     │
└─────────────┘   1:N └─────────────┘
      │ 1:N
      │
      ├──────────────┐
      │              │
      ▼              ▼
┌─────────────┐ ┌─────────────┐
│ citations   │ │   tasks     │
└─────────────┘ └─────────────┘

┌─────────────┐
│  journals   │
└─────────────┘
```

### 5.2 表结构详情

见 `backend/alembic/versions/20260316_0000_initial_schema.py`

### 5.3 索引策略

- **主键索引**: UUID 类型，所有表
- **唯一索引**: citation_key, doi, journal name
- **外键索引**: paper_id in notes/citations/tasks
- **GIN 索引**: JSONB 字段 (authors, keywords, jel_codes, tags)
- **复合索引**: year+journal 用于筛选

## 6. API 设计

### 6.1 RESTful 规范

- 资源命名使用复数名词：`/papers`, `/notes`
- HTTP 方法表示操作：GET(查), POST(增), PUT(改), DELETE(删)
- 统一响应格式：`{data, error, pagination}`
- 状态码规范：2xx(成功), 4xx(客户端错误), 5xx(服务端错误)

### 6.2 认证授权

当前版本：无认证（内部使用）

未来扩展：
- JWT Token 认证
- OAuth2 (Google Scholar, ORCID)
- RBAC 权限控制

### 6.3 限流策略

- Nginx 层限流：60 请求/分钟/IP
- API 层限流：可配置
- Celery 任务优先级：重要任务优先

## 7. 部署架构

### 7.1 开发环境

```
Local Machine
├── PostgreSQL (Docker)
├── Redis (Docker)
├── FastAPI (uvicorn --reload)
└── Celery Worker
```

### 7.2 生产环境

```
Server (Ubuntu 22.04)
├── Nginx (SSL, Reverse Proxy)
├── Gunicorn + Uvicorn (4 workers)
├── PostgreSQL 15
├── Redis 7
├── Celery Worker (2 processes)
└── Celery Beat (Scheduler)
```

### 7.3 高可用方案（未来）

```
Load Balancer
    ├── App Server 1 (Active)
    ├── App Server 2 (Standby)
    ├── PostgreSQL Primary → Replica
    └── Redis Sentinel Cluster
```

## 8. 安全设计

### 8.1 应用安全

- SQL 注入防护：ORM 参数化查询
- XSS 防护：输入验证，输出转义
- CSRF 防护：Token 验证
- 文件上传：类型检查，大小限制

### 8.2 数据安全

- 传输加密：HTTPS/TLS
- 密码加密：bcrypt
- 敏感信息：环境变量存储
- 定期备份：每日自动备份

### 8.3 网络安全

- 防火墙：仅开放 80/443
- SSH 密钥登录
- Fail2ban 防暴力破解
- 安全组规则

## 9. 监控与日志

### 9.1 应用监控

- 健康检查端点：`/health`
- 性能指标：请求延迟，QPS
- 错误追踪：异常日志

### 9.2 日志策略

- 访问日志：Nginx access.log
- 应用日志：Gunicorn error.log
- 数据库日志：PostgreSQL log
- 日志轮转：logrotate 每日

### 9.3 告警机制（未来）

- 服务宕机告警
- 磁盘空间告警
- 错误率阈值告警

## 10. 性能优化

### 10.1 数据库优化

- 连接池：10 连接，最大 20 溢出
- 查询优化：避免 N+1，使用 join
- 索引优化：覆盖常用查询
- 慢查询日志：记录>1s 查询

### 10.2 缓存策略

- Redis 缓存：频繁访问数据
- 页面缓存：静态内容
- 浏览器缓存：静态资源 1 年

### 10.3 异步处理

- 后台任务：Celery 异步执行
- 流式响应：大文件分块传输
- 数据库异步：asyncpg 驱动

## 11. 扩展性考虑

### 11.1 垂直扩展

- 增加 CPU/内存
- 升级 SSD 硬盘
- 优化数据库配置

### 11.2 水平扩展

- 负载均衡多实例
- 数据库读写分离
- Redis 集群

### 11.3 功能扩展

- 全文搜索：Elasticsearch
- 对象存储：MinIO/S3 (PDF 存储)
- 用户系统：多用户支持
- API Gateway：微服务架构

## 12. 灾难恢复

### 12.1 备份策略

- 数据库：每日全量备份，保留 30 天
- 文件存储：实时同步到备份服务器
- 配置文件：版本控制 + 定期备份

### 12.2 恢复流程

1. 评估损坏程度
2. 从备份恢复数据库
3. 恢复文件存储
4. 验证数据完整性
5. 重启服务
6. 监控运行状态

## 13. 成本估算

### 13.1 服务器成本（阿里云示例）

- ECS: 2 核 4G - ¥150/月
- RDS PostgreSQL: 基础版 - ¥100/月
- Redis: 社区版 - ¥50/月
- 带宽：1Mbps - ¥20/月
- **总计**: ~¥320/月

### 13.2 自建方案

- 服务器：4 核 8G - ¥300/月
- 自行安装 PostgreSQL/Redis
- **总计**: ~¥300/月

## 14. 项目里程碑

### Phase 1 (已完成)

- ✅ 数据库设计
- ✅ 后端 API 开发
- ✅ Celery 任务框架
- ✅ 部署脚本

### Phase 2 (进行中)

- ⏳ 前端开发
- ⏳ 元数据爬虫实现
- ⏳ 引用更新逻辑

### Phase 3 (计划)

- 用户认证系统
- 批量导入导出
- 统计分析功能
- 移动端适配

## 15. 参考资料

- [FastAPI 官方文档](https://fastapi.tiangolo.com/)
- [SQLAlchemy 文档](https://docs.sqlalchemy.org/)
- [Celery 最佳实践](https://docs.celeryq.dev/)
- [Nginx 配置指南](https://nginx.org/en/docs/)
- [PostgreSQL 性能优化](https://wiki.postgresql.org/wiki/Performance_Optimization)
