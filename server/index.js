const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const temperatureHandler = require('./scalar/temperatureHandler');
const vectorHandler = require('./vector/vectorHandler');
const util = require('./scalar/util');

const app = express();

// 配置上传临时目录
const uploadDir = path.join(__dirname, 'saved_files');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 配置multer
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 100 * 1024 * 1024 // 限制100MB
  },
  fileFilter: (req, file, cb) => {
    // 验证文件类型
    const isNCFile = file.mimetype === 'application/x-netcdf' ||
      path.extname(file.originalname).toLowerCase() === '.nc';

    if (!isNCFile) {
      const error = new Error('只支持.nc文件上传');
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }

    cb(null, true);
  }
});

// 中间件
app.use(cors());
app.use(express.json());

// 测试路由
app.get('/', (req, res) => {
  res.json({ message: 'Express服务器运行正常' });
});

// 标量场数据路由
app.post('/api/temperatureData', upload.single('file'), temperatureHandler);

// 获取温度数据路由
app.get('/api/getTemperatureData', async (req, res) => {
  try {
    const { filePath, params } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: '缺少filePath参数' });
    }

    // 防止目录遍历攻击
    const safePath = filePath;
    if (!safePath.startsWith(path.join(__dirname, 'scalar/temp_files'))) {
      return res.status(403).json({ error: '非法文件路径' });
    }

    // 解析params参数
    let parsedParams = {};
    try {
      parsedParams = params ? JSON.parse(params) : {};
    } catch (e) {
      return res.status(400).json({ error: 'params参数格式不正确' });
    }

    let data = util.getTemperatureData(safePath, parsedParams);

    res.json({
      status: 'success',
      data
    });

  } catch (error) {
    console.error('获取温度数据时出错:', error);
    res.status(500).json({
      status: 'error',
      error: '获取温度数据时出错: ' + error.message
    });
  }
});

// 矢量场数据路由
app.post('/api/vectorData', upload.single('file'), vectorHandler);

// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
