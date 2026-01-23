// 简单的Express服务器，作为OpenAI API的代理，解决CORS问题
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;

// 启用CORS
app.use(cors());
// 解析JSON请求体
app.use(express.json());

// OpenAI API代理路由
app.post('/api/openai/chat', async (req, res) => {
  try {
    // 从请求头获取API密钥
    const apiKey = req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API密钥未提供' });
    }
    
    console.log('接收到API请求:', req.body.messages[req.body.messages.length - 1].content);
    console.log('使用的API密钥:', apiKey.substring(0, 10) + '...');
    
    // 设置超时时间为30秒
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    // 构建OpenAI API请求
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
      signal: controller.signal, // 添加超时信号
    });
    
    // 清除超时定时器
    clearTimeout(timeoutId);
    
    console.log('OpenAI API响应状态:', openaiResponse.status);
    
    // 获取响应数据
    const responseData = await openaiResponse.json();
    console.log('OpenAI API响应数据:', JSON.stringify(responseData, null, 2));
    
    // 将响应返回给客户端
    res.status(openaiResponse.status).json(responseData);
  } catch (error) {
    console.error('代理服务器错误:', error);
    console.error('错误详情:', error.stack);
    
    // 提供更详细的错误信息
    let errorMessage = '服务器内部错误';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage, 
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      stack: error.stack 
    });
  }
});

// DeepSeek API代理路由
app.post('/api/deepseek/chat', async (req, res) => {
  try {
    // 从请求头获取API密钥
    const apiKey = req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API密钥未提供' });
    }
    
    console.log('接收到DeepSeek API请求');
    console.log('最后一条消息内容:', req.body.messages[req.body.messages.length - 1].content);
    console.log('消息总数:', req.body.messages.length);
    console.log('完整的请求体:', JSON.stringify(req.body, null, 2));
    console.log('使用的DeepSeek API密钥:', apiKey.substring(0, 10) + '...');
    
    // 设置超时时间为30秒
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    // 构建DeepSeek API请求
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
      signal: controller.signal, // 添加超时信号
    });
    
    // 清除超时定时器
    clearTimeout(timeoutId);
    
    console.log('DeepSeek API响应状态:', deepseekResponse.status);
    
    // 获取响应数据
    const responseData = await deepseekResponse.json();
    console.log('DeepSeek API响应数据:', JSON.stringify(responseData, null, 2));
    
    // 将响应返回给客户端
    res.status(deepseekResponse.status).json(responseData);
  } catch (error) {
    console.error('DeepSeek代理服务器错误:', error);
    console.error('错误详情:', error.stack);
    
    // 提供更详细的错误信息
    let errorMessage = '服务器内部错误';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage, 
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      stack: error.stack 
    });
  }
});

// 健康检查路由
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '代理服务器运行正常' });
});

app.listen(PORT, () => {
  console.log(`代理服务器运行在 http://localhost:${PORT}`);
  console.log(`OpenAI API代理地址: http://localhost:${PORT}/api/openai/chat`);
  console.log(`DeepSeek API代理地址: http://localhost:${PORT}/api/deepseek/chat`);
});
