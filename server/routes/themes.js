const express = require('express');
const { getDatabase } = require('../database/init');

const router = express.Router();

/**
 * 获取所有主题
 * GET /api/themes
 */
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();

    const themes = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM themes ORDER BY is_built_in DESC, name ASC',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      success: true,
      data: themes
    });
  } catch (error) {
    console.error('获取主题列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取主题列表失败',
      error: error.message
    });
  }
});

/**
 * 获取当前激活的主题
 * GET /api/themes/active
 */
router.get('/active', async (req, res) => {
  try {
    const db = getDatabase();

    const activeTheme = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM themes WHERE is_active = 1',
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!activeTheme) {
      // 如果没有激活主题，返回默认主题
      const defaultTheme = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM themes WHERE name = "default"',
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      return res.json({
        success: true,
        data: defaultTheme
      });
    }

    res.json({
      success: true,
      data: activeTheme
    });
  } catch (error) {
    console.error('获取当前主题失败:', error);
    res.status(500).json({
      success: false,
      message: '获取当前主题失败',
      error: error.message
    });
  }
});

/**
 * 获取单个主题
 * GET /api/themes/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const theme = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM themes WHERE id = ? OR name = ?',
        [id, id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!theme) {
      return res.status(404).json({
        success: false,
        message: '主题不存在'
      });
    }

    res.json({
      success: true,
      data: theme
    });
  } catch (error) {
    console.error('获取主题失败:', error);
    res.status(500).json({
      success: false,
      message: '获取主题失败',
      error: error.message
    });
  }
});

/**
 * 创建新主题
 * POST /api/themes
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      display_name,
      background_color,
      text_color,
      background_pattern,
      custom_css
    } = req.body;

    if (!name || !display_name) {
      return res.status(400).json({
        success: false,
        message: '主题名称和显示名称不能为空'
      });
    }

    const db = getDatabase();

    // 检查主题名称是否已存在
    const existingTheme = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM themes WHERE name = ?',
        [name],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingTheme) {
      return res.status(400).json({
        success: false,
        message: '主题名称已存在'
      });
    }

    // 创建新主题
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO themes
         (name, display_name, background_color, text_color, background_pattern, custom_css, is_built_in, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
        [
          name,
          display_name,
          background_color || '#ffffff',
          text_color || '#1f2937',
          background_pattern || 'none',
          custom_css || null
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    // 获取创建的主题
    const newTheme = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM themes WHERE id = ?',
        [result.lastID],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.status(201).json({
      success: true,
      data: newTheme
    });
  } catch (error) {
    console.error('创建主题失败:', error);
    res.status(500).json({
      success: false,
      message: '创建主题失败',
      error: error.message
    });
  }
});

/**
 * 更新主题
 * PUT /api/themes/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      display_name,
      background_color,
      text_color,
      background_pattern,
      custom_css
    } = req.body;

    const db = getDatabase();

    // 检查主题是否存在
    const existingTheme = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM themes WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!existingTheme) {
      return res.status(404).json({
        success: false,
        message: '主题不存在'
      });
    }

    // 不允许修改内置主题的某些属性
    if (existingTheme.is_built_in) {
      return res.status(400).json({
        success: false,
        message: '不能修改内置主题'
      });
    }

    // 更新主题
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE themes SET
         display_name = COALESCE(?, display_name),
         background_color = COALESCE(?, background_color),
         text_color = COALESCE(?, text_color),
         background_pattern = COALESCE(?, background_pattern),
         custom_css = COALESCE(?, custom_css),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          display_name,
          background_color,
          text_color,
          background_pattern,
          custom_css,
          id
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    // 获取更新后的主题
    const updatedTheme = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM themes WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.json({
      success: true,
      data: updatedTheme
    });
  } catch (error) {
    console.error('更新主题失败:', error);
    res.status(500).json({
      success: false,
      message: '更新主题失败',
      error: error.message
    });
  }
});

/**
 * 激活主题
 * POST /api/themes/:id/activate
 */
router.post('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 检查主题是否存在
    const theme = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM themes WHERE id = ? OR name = ?',
        [id, id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!theme) {
      return res.status(404).json({
        success: false,
        message: '主题不存在'
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
      // 取消所有主题的激活状态
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE themes SET is_active = 0',
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });

      // 激活指定主题
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE themes SET is_active = 1 WHERE id = ?',
          [theme.id],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });

      // 更新应用设置中的主题名称
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT OR REPLACE INTO app_settings (key, value, type, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
          ['theme_name', theme.name, 'string'],
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
        message: '主题激活成功',
        data: theme
      });

    } catch (error) {
      // 回滚事务
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve());
      });
      throw error;
    }

  } catch (error) {
    console.error('激活主题失败:', error);
    res.status(500).json({
      success: false,
      message: '激活主题失败',
      error: error.message
    });
  }
});

/**
 * 删除主题
 * DELETE /api/themes/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 检查主题是否存在
    const theme = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM themes WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!theme) {
      return res.status(404).json({
        success: false,
        message: '主题不存在'
      });
    }

    // 不允许删除内置主题
    if (theme.is_built_in) {
      return res.status(400).json({
        success: false,
        message: '不能删除内置主题'
      });
    }

    // 如果是当前激活的主题，先切换到默认主题
    if (theme.is_active) {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE themes SET is_active = 1 WHERE name = "default"',
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    }

    // 删除主题
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM themes WHERE id = ?',
        [id],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({
      success: true,
      message: '主题删除成功'
    });
  } catch (error) {
    console.error('删除主题失败:', error);
    res.status(500).json({
      success: false,
      message: '删除主题失败',
      error: error.message
    });
  }
});

module.exports = router;