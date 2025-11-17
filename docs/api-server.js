// api-server.js - PRODUCTION BACKEND API
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS - mamela requests avy GitHub Pages
app.use(cors({
  origin: [
    'https://your-username.github.io',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// =====================================
// ROOT - Health check
// =====================================
app.get('/', (req, res) => {
  res.json({ 
    status: '✅ Mijoro Backend API running!',
    service: 'Mijoro Boutique Backend',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      groqChat: 'POST /api/groq-chat',
      huggingfaceChat: 'POST /api/hf-chat'
    }
  });
});

// =====================================
// HEALTH CHECK
// =====================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// =====================================
// GROQ AI CHAT
// =====================================
app.post('/api/groq-chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ 
      success: false,
      error: 'Message ilaina' 
    });
  }

  if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY tsy misy!');
    return res.status(500).json({ 
      success: false,
      error: 'Server configuration error' 
    });
  }

  try {
    console.log('📤 Groq request:', message.substring(0, 50) + '...');

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { 
              role: 'system', 
              content: 'You are Miora, a helpful AI assistant for Mijoro Boutique.' 
            },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 512
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Groq API Error:', response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    console.log('✅ Groq reply:', reply.substring(0, 100) + '...');

    res.json({
      success: true,
      message: reply,
      model: 'llama-3.1-8b-instant'
    });

  } catch (error) {
    console.error('❌ Groq error:', error.message);
    res.status(500).json({
      success: false,
      error: 'AI service error',
      details: error.message
    });
  }
});

// =====================================
// HUGGING FACE CHAT (backup)
// =====================================
app.post('/api/hf-chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ 
      success: false,
      error: 'Message ilaina' 
    });
  }

  if (!process.env.HUGGINGFACE_API_KEY) {
    return res.status(500).json({ 
      success: false,
      error: 'Server configuration error' 
    });
  }

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: message,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7
          },
          options: {
            wait_for_model: true
          }
        })
      }
    );

    const data = await response.json();
    const reply = data[0]?.generated_text || 'No response';

    res.json({
      success: true,
      message: reply,
      model: 'mistral-7b'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================
// PUSH NOTIFICATIONS
// =====================================
app.post('/api/subscribe-push', async (req, res) => {
  const subscription = req.body;
  
  // TODO: Save subscription any Supabase
  console.log('📱 New push subscription:', subscription.endpoint);
  
  res.json({ 
    success: true,
    message: 'Subscription saved' 
  });
});

// =====================================
// 404 Handler
// =====================================
app.use((req, res) => {
  res.status(404).json({
    error: '404 - Endpoint tsy hita',
    path: req.path,
    method: req.method
  });
});

// =====================================
// START SERVER
// =====================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Mijoro Backend API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 Groq Key: ${process.env.GROQ_API_KEY ? 'YES ✅' : 'NO ❌'}`);
  console.log(`🔑 HF Key: ${process.env.HUGGINGFACE_API_KEY ? 'YES ✅' : 'NO ❌'}`);
});

module.exports = app;
