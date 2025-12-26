const express = require('express');
const { getDatabase } = require('../database/init');

const router = express.Router();

/**
 * 获取所有设置
 * GET /api/settings
 */
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();

    const settings = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM app_settings ORDER BY key', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // 转换为键值对对象
    const settingsObject = {};
    settings.forEach(setting => {
      let value = setting.value;

      // 根据类型转换值
      switch (setting.type) {
        case 'boolean':
          value = value === 'true';
          break;
        case 'number':
          value = Number(value);
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch {
            value = null;
          }
          break;
        default:
          // string类型保持原样
          break;
      }

      settingsObject[setting.key] = {
        value,
        type: setting.type,
        description: setting.description
      };
    });

    res.json({
      success: true,
      data: settingsObject
    });
  } catch (error) {
    console.error('获取设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取设置失败',
      error: error.message
    });
  }
});

/**
 * 获取单个设置
 * GET /api/settings/:key
 */
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const db = getDatabase();

    const setting = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM app_settings WHERE key = ?',
        [key],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: '设置项不存在'
      });
    }

    let value = setting.value;

    // 根据类型转换值
    switch (setting.type) {
      case 'boolean':
        value = value === 'true';
        break;
      case 'number':
        value = Number(value);
        break;
      case 'json':
        try {
          value = JSON.parse(value);
        } catch {
          value = null;
        }
        break;
    }

    res.json({
      success: true,
      data: {
        key: setting.key,
        value,
        type: setting.type,
        description: setting.description
      }
    });
  } catch (error) {
    console.error('获取设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取设置失败',
      error: error.message
    });
  }
});

/**
 * 更新设置
 * PUT /api/settings/:key
 */
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, type } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: '设置值不能为空'
      });
    }

    const db = getDatabase();

    // 转换值为字符串存储
    let stringValue;
    const settingType = type || 'string';

    switch (settingType) {
      case 'boolean':
        stringValue = String(Boolean(value));
        break;
      case 'number':
        stringValue = String(Number(value));
        break;
      case 'json':
        stringValue = JSON.stringify(value);
        break;
      default:
        stringValue = String(value);
        break;
    }

    // 更新或插入设置
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO app_settings
         (key, value, type, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [key, stringValue, settingType],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({
      success: true,
      data: {
        key,
        value,
        type: settingType
      }
    });
  } catch (error) {
    console.error('更新设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新设置失败',
      error: error.message
    });
  }
});

/**
 * 批量更新设置
 * PUT /api/settings
 */
router.put('/', async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: '设置数据格式不正确'
      });
    }

    const db = getDatabase();

    // 开始事务
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    try {
      // 逐个更新设置
      for (const [key, settingData] of Object.entries(settings)) {
        const { value, type = 'string' } = settingData;

        // 转换值为字符串存储
        let stringValue;
        switch (type) {
          case 'boolean':
            stringValue = String(Boolean(value));
            break;
          case 'number':
            stringValue = String(Number(value));
            break;
          case 'json':
            stringValue = JSON.stringify(value);
            break;
          default:
            stringValue = String(value);
            break;
        }

        await new Promise((resolve, reject) => {
          db.run(
            `INSERT OR REPLACE INTO app_settings
             (key, value, type, updated_at)
             VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
            [key, stringValue, type],
            function(err) {
              if (err) reject(err);
              else resolve(this);
            }
          );
        });
      }

      // 提交事务
      await new Promise((resolve, reject) => {
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({
        success: true,
        message: '设置更新成功',
        data: settings
      });

    } catch (error) {
      // 回滚事务
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve());
      });
      throw error;
    }

  } catch (error) {
    console.error('批量更新设置失败:', error);
    res.status(500).json({
      success: false,
      message: '批量更新设置失败',
      error: error.message
    });
  }
});

/**
 * 删除设置
 * DELETE /api/settings/:key
 */
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const db = getDatabase();

    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM app_settings WHERE key = ?',
        [key],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({
      success: true,
      message: '设置删除成功'
    });
  } catch (error) {
    console.error('删除设置失败:', error);
    res.status(500).json({
      success: false,
      message: '删除设置失败',
      error: error.message
    });
  }
});

/**
 * 重置设置为默认值
 * POST /api/settings/reset
 */
router.post('/reset', async (req, res) => {
  try {
    const { keys } = req.body;
    const db = getDatabase();

    if (keys && Array.isArray(keys)) {
      // 重置指定设置
      for (const key of keys) {
        await new Promise((resolve, reject) => {
          db.run(
            'DELETE FROM app_settings WHERE key = ?',
            [key],
            function(err) {
              if (err) reject(err);
              else resolve(this);
            }
          );
        });
      }
    } else {
      // 重置所有设置
      await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM app_settings',
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    }

    // 重新插入默认设置
    const { insertDefaultData } = require('../database/init');
    await insertDefaultData();

    res.json({
      success: true,
      message: '设置重置成功'
    });
  } catch (error) {
    console.error('重置设置失败:', error);
    res.status(500).json({
      success: false,
      message: '重置设置失败',
      error: error.message
    });
  }
});

module.exports = router;