// 用户在这个组件中输入消息
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input.trim()) return;
  
  // 发送消息到父组件
  onSendMessage(input);
  setInput('');
}; 