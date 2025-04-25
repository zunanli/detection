const express = require('express');
const whiteScreenDetector = require('../middleware');

const app = express();
app.use(express.json());

// 配置白屏检测中间件
app.use(whiteScreenDetector({
    path: '/api/check-white-screen',  // 检测接口路径
    timeout: 30000,                   // 页面加载超时时间
    waitTime: 2000                    // 等待动态内容加载时间
}));

// 其他路由
app.get('/', (req, res) => {
    res.send('White Screen Detection Service');
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`White screen detection endpoint: http://localhost:${PORT}/api/check-white-screen`);
}); 