# 🔧 修复 IndexedDB 版本冲突

## ❌ 错误信息
```
Failed to open IndexedDB: VersionError: The requested version (4) is less than the existing version (5).
```

## 📋 原因
你恢复到了旧版本的应用，但浏览器中还保留着新版本的数据库（版本 5），而旧代码要求版本 4。

## ✅ 已完成的修复

数据库版本已升级到 **版本 6**，可以兼容之前的版本。

## 🚀 快速修复方案

### 方案 A: 清除数据库（最简单，但会丢失数据）

**在浏览器控制台运行：**

```javascript
// 一键清除并重启
(async () => {
  console.log('🔧 清除数据库...');
  
  // 删除数据库
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('ToukenRanbuDB');
    request.onsuccess = () => {
      console.log('✅ 数据库已删除');
      resolve();
    };
    request.onerror = () => {
      console.error('❌ 删除失败:', request.error);
      reject(request.error);
    };
  });
  
  // 清除图片数据库
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase('ToukenRanbuImages');
    request.onsuccess = () => {
      console.log('✅ 图片数据库已删除');
      resolve();
    };
    request.onerror = () => resolve(); // 忽略错误
  });
  
  console.log('✅ 清除完成！');
  console.log('🔄 3秒后自动刷新...');
  
  setTimeout(() => {
    location.reload();
  }, 3000);
})();
```

### 方案 B: 保留数据并升级（推荐）

代码已经更新到版本 6，直接刷新页面即可：

```javascript
// 1. 强制刷新页面
location.reload(true);

// 或按 Ctrl+Shift+R (Mac: Cmd+Shift+R)
```

刷新后，数据库会自动升级到版本 6，保留所有现有数据。

## 🔍 验证修复

刷新后，在控制台运行：

```javascript
// 检查数据库版本
(async () => {
  const databases = await indexedDB.databases();
  const toukenDB = databases.find(db => db.name === 'ToukenRanbuDB');
  
  console.log('=== IndexedDB 状态 ===');
  console.log('数据库名称:', toukenDB?.name);
  console.log('当前版本:', toukenDB?.version);
  console.log('预期版本: 6');
  
  if (toukenDB?.version === 6) {
    console.log('✅ 版本正确！');
  } else {
    console.log('❌ 版本不匹配，请重新执行修复方案');
  }
})();
```

## 🛠️ 手动诊断

如果自动修复不工作，尝试手动操作：

### 1. 查看所有数据库

```javascript
indexedDB.databases().then(dbs => {
  console.log('所有 IndexedDB 数据库:');
  dbs.forEach(db => {
    console.log(`- ${db.name} (版本 ${db.version})`);
  });
});
```

### 2. 手动删除特定数据库

```javascript
// 删除主数据库
indexedDB.deleteDatabase('ToukenRanbuDB');

// 删除图片数据库
indexedDB.deleteDatabase('ToukenRanbuImages');

// 删除对话数据库（如果存在）
indexedDB.deleteDatabase('ToukenOSConversations');

console.log('✅ 已请求删除所有数据库');
console.log('🔄 请刷新页面');
```

### 3. 检查数据库内容

```javascript
(async () => {
  const request = indexedDB.open('ToukenRanbuDB');
  
  request.onsuccess = () => {
    const db = request.result;
    console.log('=== 数据库信息 ===');
    console.log('版本:', db.version);
    console.log('Object Stores:', Array.from(db.objectStoreNames));
    db.close();
  };
  
  request.onerror = () => {
    console.error('❌ 无法打开数据库:', request.error);
  };
})();
```

## 🚨 常见问题

### 问题 1: "Failed to open database" 持续出现

**原因**: 数据库可能被锁定或损坏

**解决方案**:
```javascript
// 完全重置
(async () => {
  // 1. 关闭所有标签页中的数据库连接
  console.log('请关闭所有其他打开的应用标签页');
  
  // 2. 删除所有相关数据库
  const dbNames = ['ToukenRanbuDB', 'ToukenRanbuImages', 'ToukenOSConversations'];
  for (const name of dbNames) {
    await new Promise(resolve => {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = req.onerror = () => resolve();
    });
  }
  
  // 3. 清除所有缓存
  await caches.keys().then(keys => 
    Promise.all(keys.map(key => caches.delete(key)))
  );
  
  // 4. 清除 localStorage
  localStorage.clear();
  
  console.log('✅ 完全重置完成');
  console.log('🔄 刷新页面...');
  
  setTimeout(() => location.reload(), 2000);
})();
```

### 问题 2: 升级后数据丢失

这不应该发生，因为 onupgradeneeded 只创建缺失的 stores，不会删除现有数据。

**检查数据**:
```javascript
(async () => {
  const { db, STORES } = await import('./utils/db');
  
  // 检查用户数据
  const userData = await db.get(STORES.USER_DATA, 'user_profile');
  console.log('用户数据:', userData);
  
  // 检查角色列表
  const characters = await db.get(STORES.CHARACTERS, 'character_list');
  console.log('角色列表:', characters);
  
  // 检查聊天列表
  const chats = await db.get(STORES.CHATS, 'chat_list');
  console.log('聊天列表:', chats);
})();
```

### 问题 3: Chrome DevTools 中无法查看数据库

1. 打开 DevTools
2. 进入 **Application** 标签
3. 左侧找到 **Storage** > **IndexedDB**
4. 展开 `ToukenRanbuDB`
5. 查看各个 Object Stores

如果看不到，尝试：
- 点击 **Clear storage** 按钮
- 勾选 **IndexedDB**
- 点击 **Clear site data**
- 刷新页面

## 📊 版本历史

| 版本 | 说明 |
|------|------|
| 1 | 初始版本 |
| 2 | 添加世界书支持 |
| 3 | 添加 API 设置和外观设置 |
| 4 | 添加表情包和气泡预设 |
| 5 | (丢失的版本) |
| 6 | **当前版本** - 修复版本冲突 |

## ✅ 成功标志

修复成功后，你应该看到：

```
✅ IndexedDB initialized successfully with stores: [
  "userData",
  "characters", 
  "chats",
  "chatMessages",
  "chatSettings",
  "worldBooks",
  "apiSettings",
  "appearance",
  "misc",
  "stickers",
  "bubblePresets"
]
```

而不是：
```
❌ Failed to open IndexedDB: VersionError: The requested version (4) is less than the existing version (5).
```

## 🎉 完成

现在你可以正常使用应用了！

如果还有问题，请提供：
1. 浏览器类型和版本
2. 控制台的完整错误日志
3. `indexedDB.databases()` 的输出
