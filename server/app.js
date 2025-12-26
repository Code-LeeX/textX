const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// 路由模块
const documentsRouter = require('./routes/documents');
const settingsRouter = require('./routes/settings');
const themesRouter = require('./routes/themes');
const fontsRouter = require('./routes/fonts');
const exportRouter = require('./routes/export');

// 数据库初始化
const { initDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
}));

// 限流配置
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 限制每个IP在15分钟内最多1000次请求
  message: '请求过于频繁，请稍后再试',
});
app.use(limiter);

// 中间件配置
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_URL || 'http://localhost:5173'
    : 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' })); // 支持大文件上传（图片base64）
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API路由
app.use('/api/documents', documentsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/themes', themesRouter);
app.use('/api/fonts', fontsRouter);
app.use('/api/export', exportRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: require('./package.json').version
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Server error:', err);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: '文件过大',
      message: '上传文件不能超过10MB'
    });
  }

  res.status(err.status || 500).json({
    error: '服务器错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '内部服务器错误'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ error: 'API端点不存在' });
});

// 启动数据库和服务器
async function startServer() {
  try {
    await initDatabase();
    console.log('数据库初始化成功');

    app.listen(PORT, () => {
      console.log(`TextX Server运行在端口 ${PORT}`);
      console.log(`健康检查: http://localhost:${PORT}/api/health`);
      console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

startServer();

module.exports = app;