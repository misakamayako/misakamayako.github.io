# Misaka Networks Blog (MPA)

基于Astro框架构建的博客系统，使用React作为辅助UI库，通过Markdown文件管理内容。

## 🌟 技术栈

- **框架**: Astro 5 + React 19
- **样式**: TailwindCSS + PostCSS + SCSS模块化
- **语法高亮**: PrismJS
- **构建工具**: Vite 6
- **包管理**: pnpm
- **部署**: Docker容器化

## 🚀 快速开始

### 环境要求
- Node.js >= 21.1
- pnpm >= 8

### 安装依赖
```
bash
pnpm install
```
### 开发模式
```bash
pnpm dev
```
### 生产构建
```bash
pnpm build
```
### Docker部署
```bash
docker-compose -f docker-compose.prod.yml up -d
```
## 📂 项目结构
```

.
├── docker/                # Docker生产环境配置
├── public/                # 静态资源
│   └── css/               # 第三方CSS
├── src/
│   ├── content/           # 博客内容(Markdown)
│   ├── styles/            # 模块化样式
│   └── content.config.ts  # 内容配置
├── astro.config.mjs       # Astro主配置
└── tailwind.config.cjs    # Tailwind配置
```
## 📝 内容管理
博客文章存放在`src/content/blog/`目录，支持以下Frontmatter字段：
```markdown
---
title: 文章标题
date: 2023-01-01
tags: [技术, 前端]
---
```
## 🛠 开发指南
1. **新增文章**：在`src/content/blog/`创建`.md`文件
2. **样式开发**：
   - 全局样式：`src/styles/global.css`
   - 模块化CSS：`*.module.css/scss`
3. **组件开发**：使用React+TypeScript编写

## 📦 核心依赖
| 包名                      | 用途                 |
|---------------------------|----------------------|
| @astrojs/react           | React集成           |
| @astrojs/markdown-remark | Markdown解析        |
| @astrojs/sitemap         | SEO优化             |
| lightningcss             | CSS处理             |
| tailwindcss              | CSS框架             |

## 🔗 相关链接
- [Astro文档](https://docs.astro.build)
- [TailwindCSS文档](https://tailwindcss.com/docs)
```