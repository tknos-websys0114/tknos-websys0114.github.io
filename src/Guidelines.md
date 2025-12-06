# 刀剑乱舞手机桌面应用开发规则

## 项目概述
这是一个模拟手机桌面的网页应用，包含登录页面和桌面界面。用户登录后可以管理审神者信息、刀剑男士角色、世界书条目，并与AI进行角色扮演聊天。

## 核心开发规则

### 数据存储
- **强制使用IndexedDB**：所有持久化数据必须存储在IndexedDB中，禁止使用localStorage存储业务数据
- **例外情况**：仅PWA相关的轻量级UI状态（如安装提示是否已关闭）可以使用localStorage
- **数据库工具**：使用`/utils/db.ts`中的工具函数进行数据操作
- **图片存储**：使用`/utils/imageDB.ts`处理图片的存储和检索
- **异步操作**：所有数据库操作都是异步的，必须使用async/await

### 图片分类系统
图片存储采用分类文件夹结构，自动管理不同类型的图片：

**分类结构**：
- `avatars/` - 头像（审神者头像、角色头像、聊天头像）
- `memes/` - 表情包
- `chat_images/` - 聊天图片
- `system/` - 系统图片（壁纸、桌面组件图片等）

**自动分类规则**：
- `avatar`, `chat-avatar`, `character-avatar-*`, `character-*-avatar` → `avatars/`
- `profileBackground`, `desktop-wallpaper`, `chat-background`, `anniversary`, `desktop2_*` → `system/`
- `meme-*` → `memes/`
- `chat-image-*` → `chat_images/`

**向后兼容**：
- 系统会自动迁移旧格式（不带分类前缀）到新格式
- 现有代码无需修改，API保持不变
- 调用 `saveImage(key, file)` 和 `getImage(key)` 时会自动处理分类

**调试工具**：
```typescript
// 查看图片分类统计
import { getImageCategoryStats, listAllImages } from './utils/imageDB';

const stats = await getImageCategoryStats();
console.log(stats); // { avatars: 5, system: 10, memes: 0, chat_images: 0, uncategorized: 0 }

const images = await listAllImages();
console.log(images); // [{ originalKey: 'avatar', storageKey: 'avatars/avatar', category: 'avatars' }, ...]
```

### 数据结构
**用户数据（审神者）字段**：
- 审神者名（saniwaName）
- 属国（country）
- 本丸名（honmaruName）
- 就任日（startDate）
- 生日（birthday）

**角色数据（刀剑男士）字段**：
- 角色名
- 头像
- 性格描述
- 显现日（与审神者的初遇纪念日）
- 其他自定义字段

### AI聊天功能
- 所有用户和角色的资料（包括生日、显现日等）必须同步到AI聊天的prompt中
- AI需要能够识别特殊日子（生日、显现日、就任日等）并主动庆祝
- 世界书条目需要整合到AI的上下文中

### 响应式设计
- 应用需要支持桌面和移动端
- 使用Tailwind CSS进行样式管理
- 禁止使用font-size、font-weight、line-height相关的Tailwind类，除非用户明确要求修改

### 核心功能
1. **双桌面滑动切换**：支持在两个桌面之间滑动切换
2. **深浅色模式**：支持主题切换
3. **PWA功能**：支持离线使用和安装到主屏幕
4. **世界书管理**：管理背景设定和世界观
5. **组织管理**：管理刀剑男士角色
6. **聊天功能**：与AI进行角色扮演对话

### 代码规范
- 使用TypeScript
- 组件放在`/components`目录
- 复用shadcn/ui组件库（位于`/components/ui`）
- 使用Lucide图标库
- 保持文件大小合理，复杂功能拆分为多个组件
- 及时重构代码保持整洁

### 组件文件说明
- `Desktop1.tsx`：第一个桌面（个人信息卡片、时钟、日期）
- `Desktop2.tsx`：第二个桌面（应用图标网格）
- `Desktop.tsx`：桌面容器组件
- `SwipeableDesktop.tsx`：处理滑动切换逻辑
- `ResponsiveDesktop.tsx`：响应式布局适配
- `LoginPage.tsx`：登录页面

### Figma导入代码处理
- 保留所有导入代码的元素和结构
- 保留所有Tailwind类和style属性
- 保留所有背景图片
- 仅在用户要求或添加交互必需时修改

### 第三方库
- 图标：lucide-react
- 图表：recharts
- 动画：motion/react（使用`import { motion } from 'motion/react'`）
- 表单：react-hook-form@7.55.0
- Toast通知：sonner@2.0.3

## 数据存储API使用示例

```typescript
// 导入工具函数
import { getFromDB, saveToDB, deleteFromDB, clearDB } from './utils/db';

// 保存数据
await saveToDB('userProfile', userData);

// 读取数据
const userData = await getFromDB('userProfile');

// 删除数据
await deleteFromDB('userProfile');

// 清空整个数据库
await clearDB();

// 图片操作
import { saveImage, getImage, deleteImage } from './utils/imageDB';

// 保存图片（自动分类）
await saveImage('avatar-123', file); // 自动存储到 avatars/avatar-123

// 读取图片
const imageUrl = await getImage('avatar-123');

// 删除图片
await deleteImage('avatar-123');
```

## 图片分类系统

系统会根据图片的用途自动分类存储，无需手动指定分类。所有图片都使用Blob格式存储在IndexedDB中，优化存储效率和加载性能。

**常用图片keys**：
- `avatar` - 审神者头像（存储在 avatars/）
- `chat-avatar` - 聊天设置中的用户头像（存储在 avatars/）
- `character-avatar-{id}` - 角色头像（存储在 avatars/）
- `profileBackground` - 个人信息卡片背景（存储在 system/）
- `desktop-wallpaper` - 桌面壁纸（存储在 system/）
- `chat-background` - 聊天背景（存储在 system/）
- `anniversary` - 周年纪念小组件图片（存储在 system/）
- `desktop2_timeImage`, `desktop2_card1-4` - 桌面2组件图片（存储在 system/）