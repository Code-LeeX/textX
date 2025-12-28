const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { getDatabase } = require('../database/init');

const router = express.Router();

// 配置multer用于字体文件上传
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    // 允许的字体文件格式
    const allowedTypes = [
      'font/ttf',
      'font/otf',
      'font/woff',
      'font/woff2',
      'application/font-sfnt',
      'application/font-woff',
      'application/x-font-ttf',
      'application/x-font-otf'
    ];

    const allowedExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的字体文件格式'), false);
    }
  }
});

/**
 * 获取所有字体
 * GET /api/fonts
 */
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();

    const fonts = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM fonts ORDER BY is_system_font DESC, name ASC',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // 不返回字体文件数据，只返回基本信息
    const fontsInfo = fonts.map(font => ({
      id: font.id,
      name: font.name,
      family: font.family,
      size: font.size,
      is_system_font: Boolean(font.is_system_font),
      is_active: Boolean(font.is_active),
      created_at: font.created_at,
      updated_at: font.updated_at,
      has_file: Boolean(font.file_data || font.file_path)
    })).filter(font=>{
      if(['Inter', 'Mono', 'Noto'].some(lj=>font.name.includes(lj))) return false;
      return true;
    });

    res.json({
      success: true,
      data: fontsInfo
    });
  } catch (error) {
    console.error('获取字体列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取字体列表失败',
      error: error.message
    });
  }
});

/**
 * 获取当前激活的字体
 * GET /api/fonts/active
 */
router.get('/active', async (req, res) => {
  try {
    const db = getDatabase();

    const activeFont = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM fonts WHERE is_active = 1',
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!activeFont) {
      // 如果没有激活字体，返回默认字体
      const defaultFont = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM fonts WHERE name = "Inter"',
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      return res.json({
        success: true,
        data: defaultFont ? {
          id: defaultFont.id,
          name: defaultFont.name,
          family: defaultFont.family,
          size: defaultFont.size,
          is_system_font: Boolean(defaultFont.is_system_font),
          is_active: Boolean(defaultFont.is_active)
        } : null
      });
    }

    res.json({
      success: true,
      data: {
        id: activeFont.id,
        name: activeFont.name,
        family: activeFont.family,
        size: activeFont.size,
        is_system_font: Boolean(activeFont.is_system_font),
        is_active: Boolean(activeFont.is_active)
      }
    });
  } catch (error) {
    console.error('获取当前字体失败:', error);
    res.status(500).json({
      success: false,
      message: '获取当前字体失败',
      error: error.message
    });
  }
});

/**
 * 获取字体文件
 * GET /api/fonts/:id/file
 */
router.get('/:id/file', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const font = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM fonts WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!font) {
      return res.status(404).json({
        success: false,
        message: '字体不存在'
      });
    }

    if (font.is_system_font) {
      return res.status(400).json({
        success: false,
        message: '系统字体无需下载'
      });
    }

    if (font.file_data) {
      // 从数据库返回字体文件
      const fileExtension = font.file_path ? path.extname(font.file_path) : '.ttf';
      res.set({
        'Content-Type': 'application/font-sfnt',
        'Content-Disposition': `attachment; filename="${font.name}${fileExtension}"`
      });
      res.send(font.file_data);
    } else if (font.file_path) {
      // 从文件系统返回字体文件
      try {
        const fileData = await fs.readFile(font.file_path);
        const fileExtension = path.extname(font.file_path);
        res.set({
          'Content-Type': 'application/font-sfnt',
          'Content-Disposition': `attachment; filename="${font.name}${fileExtension}"`
        });
        res.send(fileData);
      } catch (error) {
        res.status(404).json({
          success: false,
          message: '字体文件不存在'
        });
      }
    } else {
      res.status(404).json({
        success: false,
        message: '字体文件不存在'
      });
    }
  } catch (error) {
    console.error('获取字体文件失败:', error);
    res.status(500).json({
      success: false,
      message: '获取字体文件失败',
      error: error.message
    });
  }
});

/**
 * 上传字体文件
 * POST /api/fonts/upload
 */
router.post('/upload', upload.single('font'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择字体文件'
      });
    }
    console.log(req.body)

    const { name, family, size = 14 } = req.body;

    if (!name || !family) {
      return res.status(400).json({
        success: false,
        message: '字体名称和字体族不能为空'
      });
    }

    const db = getDatabase();

    // 检查字体名称是否已存在
    const existingFont = await new Promise((resolve, reject) => {
      db.get(
      'SELECT id, file_path FROM fonts WHERE name = ?',
      [name],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
      );
    });

    if (existingFont) {
      // 删除已存在的字体记录
      await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM fonts WHERE id = ?',
        [existingFont.id],
        function(err) {
        if (err) reject(err);
        else resolve(this);
        }
      );
      });

      // 删除字体文件（如果存在）
      if (existingFont.file_path) {
      try {
        await fs.unlink(existingFont.file_path);
      } catch (error) {
        console.warn('删除字体文件失败:', error.message);
      }
      }
    }

    // 保存字体到数据库
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO fonts
         (name, family, size, file_data, is_system_font, is_active)
         VALUES (?, ?, ?, ?, 0, 0)`,
        [name, family, parseInt(size), req.file.buffer],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    // 获取创建的字体信息
    const newFont = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, name, family, size, is_system_font, is_active, created_at FROM fonts WHERE id = ?',
        [result.lastID],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    console.log(newFont)

    res.status(201).json({
      success: true,
      message: '字体上传成功',
      data: {
        ...newFont,
        is_system_font: Boolean(newFont.is_system_font),
        is_active: Boolean(newFont.is_active)
      }
    });
  } catch (error) {
    console.error('上传字体失败:', error);
    res.status(500).json({
      success: false,
      message: '上传字体失败',
      error: error.message
    });
  }
});

/**
 * 更新字体信息
 * PUT /api/fonts/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, family, size } = req.body;

    const db = getDatabase();

    // 检查字体是否存在
    const existingFont = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM fonts WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!existingFont) {
      return res.status(404).json({
        success: false,
        message: '字体不存在'
      });
    }

    // 不允许修改系统字体的某些属性
    if (existingFont.is_system_font && (name || family)) {
      return res.status(400).json({
        success: false,
        message: '不能修改系统字体的名称和字体族'
      });
    }

    // 更新字体
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE fonts SET
         name = COALESCE(?, name),
         family = COALESCE(?, family),
         size = COALESCE(?, size),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, family, size ? parseInt(size) : null, id],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    // 获取更新后的字体
    const updatedFont = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, name, family, size, is_system_font, is_active, updated_at FROM fonts WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.json({
      success: true,
      data: {
        ...updatedFont,
        is_system_font: Boolean(updatedFont.is_system_font),
        is_active: Boolean(updatedFont.is_active)
      }
    });
  } catch (error) {
    console.error('更新字体失败:', error);
    res.status(500).json({
      success: false,
      message: '更新字体失败',
      error: error.message
    });
  }
});

/**
 * 激活字体
 * POST /api/fonts/:id/activate
 */
router.post('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const { size } = req.body;
    const db = getDatabase();

    // 检查字体是否存在
    const font = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM fonts WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!font) {
      return res.status(404).json({
        success: false,
        message: '字体不存在'
      });
    }

    // 开始事务
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    try {
      // 取消所有字体的激活状态
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE fonts SET is_active = 0',
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });

      // 激活指定字体，同时更新字体大小
      const fontSize = size ? parseInt(size) : font.size;
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE fonts SET is_active = 1, size = ? WHERE id = ?',
          [fontSize, font.id],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });

      // 更新应用设置中的字体信息
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT OR REPLACE INTO app_settings (key, value, type, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
          ['font_family', font.family, 'string'],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });

      await new Promise((resolve, reject) => {
        db.run(
          'INSERT OR REPLACE INTO app_settings (key, value, type, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
          ['font_size', String(fontSize), 'number'],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });

      // 提交事务
      await new Promise((resolve, reject) => {
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({
        success: true,
        message: '字体激活成功',
        data: {
          id: font.id,
          name: font.name,
          family: font.family,
          size: fontSize,
          is_system_font: Boolean(font.is_system_font),
          is_active: true
        }
      });

    } catch (error) {
      // 回滚事务
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve());
      });
      throw error;
    }

  } catch (error) {
    console.error('激活字体失败:', error);
    res.status(500).json({
      success: false,
      message: '激活字体失败',
      error: error.message
    });
  }
});

/**
 * 删除字体
 * DELETE /api/fonts/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 检查字体是否存在
    const font = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM fonts WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!font) {
      return res.status(404).json({
        success: false,
        message: '字体不存在'
      });
    }

    // 不允许删除系统字体
    if (font.is_system_font) {
      return res.status(400).json({
        success: false,
        message: '不能删除系统字体'
      });
    }

    // 如果是当前激活的字体，先切换到默认字体
    if (font.is_active) {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE fonts SET is_active = 1 WHERE name = "Inter"',
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    }

    // 删除字体文件（如果存在）
    if (font.file_path) {
      try {
        await fs.unlink(font.file_path);
      } catch (error) {
        // 文件不存在或删除失败，继续执行
        console.warn('删除字体文件失败:', error.message);
      }
    }

    // 删除字体记录
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM fonts WHERE id = ?',
        [id],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({
      success: true,
      message: '字体删除成功'
    });
  } catch (error) {
    console.error('删除字体失败:', error);
    res.status(500).json({
      success: false,
      message: '删除字体失败',
      error: error.message
    });
  }
});

module.exports = router;