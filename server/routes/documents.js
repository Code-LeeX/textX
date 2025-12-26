const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { getDatabase } = require('../database/init');

const router = express.Router();

// 加密工具函数
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'textx_default_encryption_key_32_chars';

/**
 * 加密文本
 */
function encryptText(text, password = ENCRYPTION_KEY) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, password);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag ? cipher.getAuthTag().toString('hex') : null
  };
}

/**
 * 解密文本
 */
function decryptText(encryptedData, password = ENCRYPTION_KEY) {
  try {
    const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, password);

    if (encryptedData.authTag && decipher.setAuthTag) {
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    }

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('解密失败，可能密码不正确');
  }
}

/**
 * 检查文件是否为加密文件
 */
function isEncryptedFile(content) {
  try {
    const parsed = JSON.parse(content);
    return parsed && parsed.encrypted && parsed.iv;
  } catch {
    return false;
  }
}

/**
 * 获取最近文档列表
 * GET /api/documents/recent
 */
router.get('/recent', async (req, res) => {
  try {
    const db = getDatabase();

    const documents = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM recent_documents ORDER BY last_opened DESC LIMIT 20',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('获取最近文档失败:', error);
    res.status(500).json({
      success: false,
      message: '获取最近文档失败',
      error: error.message
    });
  }
});

/**
 * 打开文档
 * POST /api/documents/open
 */
router.post('/open', async (req, res) => {
  try {
    const { filePath, password } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: '文件路径不能为空'
      });
    }

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    // 读取文件内容
    const fileContent = await fs.readFile(filePath, 'utf8');
    const fileStats = await fs.stat(filePath);

    let content = fileContent;
    let isEncrypted = false;

    // 检查是否为加密文件
    if (isEncryptedFile(fileContent)) {
      isEncrypted = true;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: '此文件已加密，请输入密码',
          requiresPassword: true
        });
      }

      try {
        const encryptedData = JSON.parse(fileContent);
        content = decryptText(encryptedData, password);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: '密码错误或文件损坏'
        });
      }
    }

    // 更新最近文档记录
    const db = getDatabase();
    const fileName = path.basename(filePath);
    const previewText = content.substring(0, 200).replace(/\n/g, ' ');

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO recent_documents
         (file_path, file_name, preview_text, file_size, is_encrypted, last_opened)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [filePath, fileName, previewText, fileStats.size, isEncrypted ? 1 : 0],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({
      success: true,
      data: {
        content,
        filePath,
        fileName,
        isEncrypted,
        fileSize: fileStats.size,
        lastModified: fileStats.mtime
      }
    });

  } catch (error) {
    console.error('打开文档失败:', error);
    res.status(500).json({
      success: false,
      message: '打开文档失败',
      error: error.message
    });
  }
});

/**
 * 保存文档
 * POST /api/documents/save
 */
router.post('/save', async (req, res) => {
  try {
    const { filePath, content, encrypted, password } = req.body;

    if (!filePath || content === undefined) {
      return res.status(400).json({
        success: false,
        message: '文件路径和内容不能为空'
      });
    }

    let finalContent = content;

    // 如果需要加密
    if (encrypted) {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: '加密保存需要提供密码'
        });
      }

      const encryptedData = encryptText(content, password);
      finalContent = JSON.stringify(encryptedData, null, 2);
    }

    // 确保目录存在
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // 保存文件
    await fs.writeFile(filePath, finalContent, 'utf8');

    // 更新最近文档记录
    const db = getDatabase();
    const fileName = path.basename(filePath);
    const previewText = content.substring(0, 200).replace(/\n/g, ' ');
    const fileStats = await fs.stat(filePath);

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO recent_documents
         (file_path, file_name, preview_text, file_size, is_encrypted, last_opened)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [filePath, fileName, previewText, fileStats.size, encrypted ? 1 : 0],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({
      success: true,
      data: {
        filePath,
        fileName,
        fileSize: fileStats.size,
        isEncrypted: encrypted || false
      }
    });

  } catch (error) {
    console.error('保存文档失败:', error);
    res.status(500).json({
      success: false,
      message: '保存文档失败',
      error: error.message
    });
  }
});

/**
 * 删除最近文档记录
 * DELETE /api/documents/recent/:id
 */
router.delete('/recent/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM recent_documents WHERE id = ?',
        [id],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除最近文档失败:', error);
    res.status(500).json({
      success: false,
      message: '删除失败',
      error: error.message
    });
  }
});

/**
 * 更新文档元数据
 * POST /api/documents/metadata
 */
router.post('/metadata', async (req, res) => {
  try {
    const { filePath, content } = req.body;

    if (!filePath || !content) {
      return res.status(400).json({
        success: false,
        message: '文件路径和内容不能为空'
      });
    }

    // 计算文档统计信息
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = content.length;
    const lineCount = content.split('\n').length;
    const readingTime = Math.ceil(wordCount / 200); // 假设每分钟阅读200字

    const db = getDatabase();

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO document_metadata
         (file_path, word_count, character_count, line_count, reading_time, last_modified)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [filePath, wordCount, characterCount, lineCount, readingTime],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({
      success: true,
      data: {
        wordCount,
        characterCount,
        lineCount,
        readingTime
      }
    });

  } catch (error) {
    console.error('更新文档元数据失败:', error);
    res.status(500).json({
      success: false,
      message: '更新文档元数据失败',
      error: error.message
    });
  }
});

module.exports = router;