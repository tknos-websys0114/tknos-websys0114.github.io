# 完整修复 - 直接复制替换

## 问题说明
`finalUserMessage is not defined` - 因为代码使用了未声明的变量

## 直接替换方案

找到 `/components/PrivateChat.tsx` 文件的第774-807行，将以下代码：

```typescript
        const recognitionData = await recognitionResponse.json();
        imageDescription = recognitionData.choices?.[0]?.message?.content || '无法识别图片内容';
        
        // 清空待识别图片（图片识别结果仅用于prompt，不显示给用户）
        finalUserMessage = `【图片内容识别】：\n${imageDescription}`;
        if (inputText.trim()) {
          finalUserMessage += `\n\n【用户输入】：\n${inputText.trim()}`;
        }
        
        // 清空待识别图片
        setPendingImage(null);
      }
      
      // 如果finalUserMessage为空（既没有图片也没有文本），则不处理
      if (!finalUserMessage) {
        setIsAIReplying(false);
        return;
      }
      
      // 发送用户消息（纯文本，包含图片识别结果）
      const userMessage: Message = {
        id: Date.now().toString(),
        text: finalUserMessage,
        senderId: 'user',
        senderName: userNickname,
        timestamp: new Date(),
      };
      
      allMessagesRef.current = [...allMessagesRef.current, userMessage];
      setMessages([...allMessagesRef.current]);
      
      saveMessages(allMessagesRef.current);
      updateChatList(allMessagesRef.current);
```

完全删除，替换为：

```typescript
        const recognitionData = await recognitionResponse.json();
        imageDescription = recognitionData.choices?.[0]?.message?.content || '无法识别图片内容';
        
        // 清空待识别图片
        setPendingImage(null);
      }
      
      // 2. 如果用户输入了文本，发送文本消息
      if (inputText.trim()) {
        const userMessage: Message = {
          id: Date.now().toString(),
          text: inputText.trim(),
          senderId: 'user',
          senderName: userNickname,
          timestamp: new Date(),
        };
        
        allMessagesRef.current = [...allMessagesRef.current, userMessage];
        setMessages([...allMessagesRef.current]);
        
        await saveMessages(allMessagesRef.current);
        await updateChatList(allMessagesRef.current);
        
        setInputText('');
      }
```

然后找到第1231-1234行左右的代码：

```typescript
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: '请根据以上设定和聊天记录，生成角色的回复。' }
          ],
```

替换为：

```typescript
          messages: [
            { role: 'system', content: systemContent },
            { 
              role: 'user', 
              content: imageDescription 
                ? `【用户发送了一张图片】\n图片内容：${imageDescription}\n\n${inputText.trim() ? `用户同时说：${inputText.trim()}\n\n` : ''}请根据以上设定和聊天记录，以及用户发送的图片内容，生成角色的回复。`
                : '请根据以上设定和聊天记录，生成角色的回复。'
            }
          ],
```

## 详细步骤

### 步骤1：定位第774行
在编辑器中按 Ctrl+G (或 Cmd+G)，输入 774，跳转到该行

### 步骤2：选择删除范围
从第774行开始，选中到第806行的 `updateChatList(allMessagesRef.current);`

### 步骤3：粘贴新代码
粘贴上面"替换为"部分的第一段代码

### 步骤4：定位第1231行
跳转到第1231行（修改后行号可能会变化，搜索 `messages: [`）

### 步骤5：替换AI调用代码
替换 messages 数组的内容

### 步骤6：保存并测试

## 验证
修复后，`finalUserMessage` 变量不再被使用，错误应该消失。
