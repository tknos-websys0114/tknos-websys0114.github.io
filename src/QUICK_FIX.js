// 🚀 一键修复 IndexedDB 版本冲突
// 复制整个脚本到浏览器控制台运行

(async () => {
  console.log('🔧 开始修复 IndexedDB 版本冲突...\n');
  
  try {
    // 1. 检查当前数据库状态
    console.log('1️⃣ 检查数据库状态...');
    const databases = await indexedDB.databases();
    const toukenDB = databases.find(db => db.name === 'ToukenRanbuDB');
    
    if (toukenDB) {
      console.log(`   当前版本: ${toukenDB.version}`);
      console.log(`   代码版本: 6`);
      
      if (toukenDB.version < 6) {
        console.log('   ⚠️  版本过低，需要升级');
      } else if (toukenDB.version > 6) {
        console.log('   ⚠️  版本过高，需要降级（删除并重建）');
      } else {
        console.log('   ✅ 版本匹配');
      }
    } else {
      console.log('   ℹ️  数据库不存在，将创建新数据库');
    }
    
    // 2. 删除旧数据库
    console.log('\n2️⃣ 删除旧数据库...');
    const dbNames = ['ToukenRanbuDB', 'ToukenRanbuImages', 'ToukenOSConversations'];
    
    for (const dbName of dbNames) {
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbName);
        
        request.onsuccess = () => {
          console.log(`   ✅ 已删除: ${dbName}`);
          resolve();
        };
        
        request.onerror = () => {
          console.log(`   ⚠️  删除失败 (可能不存在): ${dbName}`);
          resolve(); // 继续执行
        };
        
        request.onblocked = () => {
          console.log(`   ⚠️  ${dbName} 被阻塞，请关闭其他标签页`);
          reject(new Error('Database blocked'));
        };
      });
    }
    
    // 3. 清除缓存
    console.log('\n3️⃣ 清除缓存...');
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map(key => caches.delete(key)));
    console.log(`   ✅ 已清除 ${cacheKeys.length} 个缓存`);
    
    // 4. 清除 localStorage（可选）
    console.log('\n4️⃣ 清除 localStorage...');
    const localStorageKeys = Object.keys(localStorage);
    // 保留一些重要的设置
    const keysToKeep = ['theme', 'language'];
    const backup = {};
    keysToKeep.forEach(key => {
      if (localStorage.getItem(key)) {
        backup[key] = localStorage.getItem(key);
      }
    });
    
    localStorage.clear();
    
    // 恢复保留的设置
    Object.entries(backup).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    
    console.log(`   ✅ 已清除 ${localStorageKeys.length} 个项目`);
    if (Object.keys(backup).length > 0) {
      console.log(`   ℹ️  已保留: ${Object.keys(backup).join(', ')}`);
    }
    
    // 5. 完成
    console.log('\n✅ 修复完成！');
    console.log('\n📋 已执行的操作:');
    console.log('   • 删除所有 IndexedDB 数据库');
    console.log('   • 清除所有缓存');
    console.log('   • 清除 localStorage (保留主题设置)');
    console.log('\n⚠️  注意: 所有数据已清除，需要重新登录和设置');
    console.log('\n🔄 3秒后自动刷新页面...');
    
    setTimeout(() => {
      location.reload();
    }, 3000);
    
  } catch (error) {
    console.error('\n❌ 修复失败:', error);
    console.log('\n💡 建议:');
    console.log('   1. 关闭所有其他打开的应用标签页');
    console.log('   2. 重新运行此脚本');
    console.log('   3. 如果还是失败，请重启浏览器');
  }
})();
