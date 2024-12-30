// 处理发送消息的逻辑
const handleSendMessage = async (message: string) => {
  // 添加用户消息到聊天历史
  const userMessage = { role: 'user', content: message };
  setMessages(prevMessages => [...prevMessages, userMessage]);

  try {
    // 调用API发送消息到后端
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [...messages, userMessage] })
    });
    // ...处理响应
  } catch (error) {
    console.error('Error:', error);
  }
}; 