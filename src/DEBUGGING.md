# IndexedDB 调试指南

## 常见问题

### "NotFoundError: One of the specified object stores was not found"

这个错误通常表示IndexedDB数据库的object stores没有被正确创建。

## 解决方案

### 方法1: 使用内置诊断工具

打开浏览器开发者工具的Console（控制台），运行：

```javascript
await diagnoseDatabaseIssues()
```

这个函数会：
1. 检查数据库是否已初始化
2. 列出所有可用的stores
3. 检查是否有缺失的stores
4. 自动重建数据库（如果需要）
5. 测试读写操作

### 方法2: 手动清除数据库

如果诊断工具无法解决问题，可以手动清除数据库：

```javascript
await clearDatabase()
```

然后刷新页面。**注意：这会删除所有数据！**

### 方法3: 浏览器开发者工具

1. 打开开发者工具（F12）
2. 进入 Application（应用）或 Storage（存储）标签
3. 找到 IndexedDB
4. 右键点击 `ToukenRanbuDB` 和 `DesktopImagesDB`
5. 选择 "Delete database"（删除数据库）
6. 刷新页面

## 数据库版本

当前版本：
- ToukenRanbuDB: v2
- DesktopImagesDB: v2

## Object Stores

ToukenRanbuDB 应该包含以下 stores：
- userData - 用户数据
- characters - 角色数据
- chats - 聊天列表
- chatMessages - 聊天消息
- chatSettings - 聊天设置
- worldBooks - 世界书
- apiSettings - API设置
- appearance - 外观设置
- misc - 杂项数据

DesktopImagesDB 应该包含：
- images - 图片存储

## 检查日志

应用启动时会在控制台输出详细的初始化日志：
- "Initializing application..."
- "Initializing database..."
- "Database initialized successfully"
- "Checking for data migration..."
- "Migration check complete"
- "Loading user data..."

如果看到错误，请查看具体的错误信息并使用上述诊断工具。

## 联系支持

如果问题仍然存在，请提供：
1. 浏览器类型和版本
2. 控制台的完整错误日志
3. 运行 `await diagnoseDatabaseIssues()` 的输出
