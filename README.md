# WebView 白屏检测工具

一个专门用于检测 WebView 中加载离线包后是否出现白屏的监控工具。本工具可以帮助开发者快速定位白屏问题的原因，包括资源加载失败、JavaScript 错误、DOM 渲染异常等。

## 功能特点

- 离线资源检测
  - 检查脚本文件加载状态
  - 检查样式表加载状态
  - 检查图片资源加载状态
  - 详细记录资源加载失败信息

- WebView 环境检测
  - 检查本地存储可用性
  - 验证 DOM 结构完整性
  - 监控页面加载状态
  - 检查视口配置

- 错误监控
  - JavaScript 运行时错误
  - 网络请求失败
  - DOM 异常
  - 控制台错误日志

- 实时监控界面
  - 现代化的用户界面
  - 详细的检测报告
  - 资源加载状态展示
  - 错误信息可视化

## 系统要求

- Node.js >= 14.0.0
- npm >= 6.0.0

## 快速开始

1. 克隆仓库
   ```bash
   git clone [your-repository-url]
   cd webview-monitor
   ```

2. 安装依赖
   ```bash
   npm run install:all
   ```

3. 启动开发服务器
   ```bash
   npm start
   ```

4. 访问应用
   - 前端界面：http://localhost:3000
   - 后端API：http://localhost:5888

## 项目结构

```
webview-monitor/
├── client/                 # React 前端项目
│   ├── public/            # 静态资源
│   ├── src/              # 源代码
│   └── package.json      # 前端依赖
├── server/                # Node.js 后端
│   └── index.js          # 服务器入口
├── package.json          # 项目配置
└── README.md             # 项目说明
```

## 使用方法

1. 在输入框中输入要检测的 WebView URL
2. 点击"开始检测"按钮
3. 等待检测完成，查看结果报告

检测报告包含：
- 白屏状态判断
- 离线资源加载状态
- WebView 环境信息
- 错误信息汇总

## API 说明

### 检测接口

```http
POST /api/check
Content-Type: application/json

{
  "url": "要检测的URL"
}
```

响应示例：
```json
{
  "url": "检测的URL",
  "status": 200,
  "ok": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "check": {
    "basic": {
      "hasBody": true,
      "hasContent": true,
      "height": 1000,
      "title": "页面标题"
    },
    "webview": {
      "hasRoot": true,
      "readyState": "complete",
      "storage": {
        "ok": true
      },
      "resources": {
        "scripts": [],
        "styles": [],
        "images": []
      }
    }
  },
  "isWhiteScreen": false,
  "offlineStatus": {
    "storageAvailable": true,
    "resourcesLoaded": true
  }
}
```

## 开发命令

- `npm start` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm test` - 运行测试
- `npm run clean` - 清理构建文件
- `npm run install:all` - 安装所有依赖

## 注意事项

1. 确保目标页面允许被 Puppeteer 访问
2. 某些 WebView 环境可能需要特殊配置
3. 检测过程可能需要几秒钟
4. 建议在开发环境中使用

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 许可证

MIT License 