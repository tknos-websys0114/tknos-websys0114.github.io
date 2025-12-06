# Service Worker 测试指南

## 一、检查 Service Worker 注册状态

### 1. 打开浏览器开发者工具
- **Chrome/Edge**: `F12` 或 `Ctrl+Shift+I` (Mac: `Cmd+Option+I`)
- **Firefox**: `F12` 或 `Ctrl+Shift+I` (Mac: `Cmd+Option+I`)

### 2. 查看 Service Worker 面板
- **Chrome/Edge**: 
  - 打开 `Application` 标签页
  - 左侧菜单找到 `Service Workers`
  - 查看状态：
    - ✅ **activated and running** (绿色圆点) = 正常工作
    - ⚠️ **waiting** (橙色) = 有新版本等待激活
    - ❌ **stopped** (灰色) = 已停止
    - ❌ 无显示 = 未注册成功

- **Firefox**:
  - 打开 `Application` / `Storage` 标签
  - 左侧找到 `Service Workers`

### 3. 控制台检查
打开 `Console` 标签，查找以下日志：

```
✅ 成功注册：
[SW] Service Worker registered

✅ 成功激活：
[SW] Service Worker activated

❌ 注册失败：
Service Worker registration failed: [错误信息]

⚠️ 降级模式：
[SW] Service Worker not available, using fallback mode
```

## 二、测试后台 AI 调用功能

### 测试步骤：

1. **打开聊天界面**
   - 点击桌面上的聊天应用图标
   - 选择一个角色进入对话

2. **发送测试消息**
   ```
   测试消息：你好
   ```

3. **立即切换到桌面**
   - 发送消息后立即点击返回按钮
   - 或滑动切换到另一个桌面

4. **观察通知行为**
   - ✅ **正常**: 在桌面看到系统通知 + 红点徽章
   - ❌ **异常**: 没有通知或 AI 调用中断

### 查看 Service Worker 日志：

1. 打开 `Application` > `Service Workers`
2. 勾选 `Show events` / `Update on reload`
3. 点击 Service Worker 文件名旁的 `🔍` 图标
4. 会打开一个新的控制台窗口，显示 SW 内部日志

**预期日志输出：**
```
[SW] Received message: AI_TASK_REQUEST
[SW] Starting background AI task for conversationId: xxx
[SW] Task queued, total: 1
[SW] Processing task...
[SW] AI call started
[SW] AI call completed successfully
[SW] Showing notification: 角色名
[SW] Task completed, remaining: 0
```

## 三、验证任务队列系统

### 测试并发调用：

1. **快速连续发送多条消息**
   ```
   消息1：你好
   消息2：今天天气怎么样
   消息3：讲个笑话
   ```

2. **立即切换到桌面**

3. **检查 SW 日志**
   - ✅ 应该看到 3 个任务依次处理
   - ✅ 每个任务有独立的 conversationId
   - ✅ 任务按顺序完成，不会错位

**预期日志：**
```
[SW] Task queued, total: 1
[SW] Task queued, total: 2
[SW] Task queued, total: 3
[SW] Processing task... conversationId: xxx
[SW] Task completed, remaining: 2
[SW] Processing task... conversationId: yyy
[SW] Task completed, remaining: 1
[SW] Processing task... conversationId: zzz
[SW] Task completed, remaining: 0
```

## 四、测试系统通知

### 1. 检查通知权限

**控制台执行：**
```javascript
Notification.permission
```

**结果：**
- ✅ `"granted"` = 已授权
- ❌ `"denied"` = 已拒绝
- ⚠️ `"default"` = 未询问

### 2. 测试通知显示

1. 发送聊天消息
2. 切换到桌面
3. 等待 AI 回复

**预期行为：**
- ✅ 浏览器显示系统通知（右下角或顶部）
- ✅ 通知内容包含角色名和消息预览
- ✅ 点击通知可返回聊天界面

### 3. 查看通知日志

**控制台执行：**
```javascript
// 查看是否有通知权限
console.log('Permission:', Notification.permission);

// 手动触发测试通知
new Notification('测试通知', {
  body: '这是一条测试消息',
  icon: '/icon-192x192.png'
});
```

## 五、测试降级模式

### 测试 SW 不可用情况：

1. **取消 Service Worker 注册**
   - `Application` > `Service Workers`
   - 点击 `Unregister`

2. **刷新页面**
   - 控制台应显示：
     ```
     [SW] Service Worker not available, using fallback mode
     ```

3. **测试聊天功能**
   - ✅ AI 调用仍然正常工作
   - ⚠️ 离开聊天界面后 AI 调用可能中断
   - ⚠️ 无系统通知

## 六、常见问题排查

### 问题 1: Service Worker 无法注册

**检查：**
```javascript
// 控制台执行
console.log('Is secure context:', window.isSecureContext);
console.log('ServiceWorker API:', 'serviceWorker' in navigator);
```

**解决方案：**
- ❌ `isSecureContext: false` → 需要 HTTPS 或 localhost
- ❌ `ServiceWorker API: false` → 浏览器不支持（很罕见）

### 问题 2: Service Worker 注册但不激活

**检查：**
1. `Application` > `Service Workers`
2. 查看是否有多个 SW 版本

**解决方案：**
- 点击 `skipWaiting` 强制激活
- 勾选 `Update on reload`
- 或关闭所有页面标签重新打开

### 问题 3: 消息发送到 SW 失败

**检查 SW 控制器：**
```javascript
// 控制台执行
console.log('Controller:', navigator.serviceWorker.controller);
```

**结果：**
- ✅ 显示 ServiceWorker 对象 = 正常
- ❌ `null` = SW 未控制页面

**解决方案：**
- 刷新页面
- 或等待 SW 激活后刷新

### 问题 4: 通知不显示

**排查步骤：**

1. **检查权限：**
   ```javascript
   console.log(Notification.permission);
   ```

2. **检查焦点状态：**
   - 通知通常只在页面失去焦点时显示
   - 尝试切换到其他标签页或窗口

3. **检查浏览器设置：**
   - Chrome: `设置` > `隐私和安全` > `网站设置` > `通知`
   - 确保网站未被阻止

### 问题 5: AI 调用在后台中断

**检查 SW 日志：**
1. 查看是否有错误日志
2. 检查 fetch 请求是否成功

**常见原因：**
- ❌ API 密钥无效
- ❌ 网络错误
- ❌ CORS 问题

## 七、完整测试流程

### 完整测试清单：

```
□ 1. 打开应用，检查 SW 注册状态
□ 2. 查看控制台，确认无错误
□ 3. 打开聊天，发送测试消息
□ 4. 切换到桌面
□ 5. 确认收到系统通知
□ 6. 确认红点徽章显示
□ 7. 返回聊天，确认 AI 回复正确
□ 8. 快速发送 3 条消息测试并发
□ 9. 切换到桌面观察通知
□ 10. 检查 SW 日志确认任务队列正常
```

## 八、高级调试技巧

### 1. 查看 IndexedDB 数据

**Chrome/Edge:**
1. `Application` > `Storage` > `IndexedDB`
2. 展开数据库查看 `conversations`、`messages` 等表

### 2. 模拟离线环境

**Chrome/Edge:**
1. `Network` 标签
2. 选择 `Offline` 或 `Slow 3G`
3. 测试 PWA 离线功能

### 3. 清除所有数据重新测试

**控制台执行：**
```javascript
// 清除 Service Worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(r => r.unregister());
});

// 清除 IndexedDB（应用内置功能）
// 在设置页面点击"清除所有数据"

// 清除缓存
caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
```

### 4. 强制更新 Service Worker

**控制台执行：**
```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  if (reg) reg.update();
});
```

## 九、预期正常行为总结

### ✅ Service Worker 正常工作的标志：

1. **注册阶段**
   - Console 显示 `[SW] Service Worker registered`
   - Application 面板显示绿色 `activated and running`

2. **聊天阶段**
   - 发送消息后立即切换桌面，AI 仍在后台处理
   - SW 日志显示任务入队和处理过程

3. **通知阶段**
   - AI 回复后显示系统通知
   - 通知内容正确（角色名 + 消息预览）
   - 桌面图标显示红点徽章

4. **多任务阶段**
   - 连续发送多条消息
   - 任务按顺序处理，不会错位
   - 每条消息都有对应的通知

5. **降级模式**
   - SW 不可用时应用仍能正常使用
   - Console 显示降级提示
   - AI 调用正常，但离开聊天可能中断

---

## 快速测试命令

复制到浏览器控制台执行：

```javascript
// 检查 SW 状态
console.log('SW 注册状态:', await navigator.serviceWorker.getRegistration());
console.log('SW 控制器:', navigator.serviceWorker.controller);
console.log('通知权限:', Notification.permission);

// 查看所有对话
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open('ToukenRanbuDB', 1);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const tx = db.transaction(['conversations'], 'readonly');
const store = tx.objectStore('conversations');
const conversations = await new Promise(resolve => {
  const req = store.getAll();
  req.onsuccess = () => resolve(req.result);
});
console.log('所有对话:', conversations);
```

---

如果测试中遇到任何问题，请查看对应的问题排查章节！
