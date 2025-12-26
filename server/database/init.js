const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 确保数据库目录存在
const dbDir = path.dirname(process.env.DATABASE_PATH || './database/textx.db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'textx.db');

let db = null;

/**
 * 获取数据库连接
 */
function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('数据库连接错误:', err.message);
      } else {
        console.log('已连接到SQLite数据库');
      }
    });
  }
  return db;
}

/**
 * 创建数据库表
 */
async function createTables() {
  const database = getDatabase();

  const tables = [
    // 应用设置表
    {
      name: 'app_settings',
      sql: `
        CREATE TABLE IF NOT EXISTS app_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT,
          type TEXT DEFAULT 'string',
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    },

    // 主题配置表
    {
      name: 'themes',
      sql: `
        CREATE TABLE IF NOT EXISTS themes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          background_color TEXT DEFAULT '#ffffff',
          text_color TEXT DEFAULT '#1f2937',
          background_pattern TEXT DEFAULT 'none',
          custom_css TEXT,
          is_built_in BOOLEAN DEFAULT 0,
          is_active BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    },

    // 字体管理表
    {
      name: 'fonts',
      sql: `
        CREATE TABLE IF NOT EXISTS fonts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          family TEXT NOT NULL,
          file_path TEXT,
          file_data BLOB,
          size INTEGER DEFAULT 14,
          is_system_font BOOLEAN DEFAULT 0,
          is_active BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    },

    // 最近文档表
    {
      name: 'recent_documents',
      sql: `
        CREATE TABLE IF NOT EXISTS recent_documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_path TEXT UNIQUE NOT NULL,
          file_name TEXT NOT NULL,
          preview_text TEXT,
          file_size INTEGER DEFAULT 0,
          is_encrypted BOOLEAN DEFAULT 0,
          last_opened DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    },

    // 导出设置表
    {
      name: 'export_settings',
      sql: `
        CREATE TABLE IF NOT EXISTS export_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          export_format TEXT NOT NULL,
          include_theme BOOLEAN DEFAULT 1,
          page_size TEXT DEFAULT 'A4',
          margin_top INTEGER DEFAULT 20,
          margin_bottom INTEGER DEFAULT 20,
          margin_left INTEGER DEFAULT 20,
          margin_right INTEGER DEFAULT 20,
          font_size INTEGER DEFAULT 12,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    },

    // 快捷键配置表
    {
      name: 'shortcuts',
      sql: `
        CREATE TABLE IF NOT EXISTS shortcuts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action_name TEXT UNIQUE NOT NULL,
          action_description TEXT,
          key_combination TEXT NOT NULL,
          is_enabled BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    },

    // 文档元数据表（可选，用于存储文档统计等信息）
    {
      name: 'document_metadata',
      sql: `
        CREATE TABLE IF NOT EXISTS document_metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_path TEXT UNIQUE NOT NULL,
          word_count INTEGER DEFAULT 0,
          character_count INTEGER DEFAULT 0,
          line_count INTEGER DEFAULT 0,
          reading_time INTEGER DEFAULT 0,
          last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    }
  ];

  // 逐个创建表
  for (const table of tables) {
    try {
      await new Promise((resolve, reject) => {
        database.run(table.sql, (err) => {
          if (err) {
            console.error(`创建表 ${table.name} 失败:`, err.message);
            reject(err);
          } else {
            console.log(`表 ${table.name} 创建成功`);
            resolve();
          }
        });
      });
    } catch (error) {
      throw new Error(`创建表 ${table.name} 时出错: ${error.message}`);
    }
  }
}

/**
 * 插入默认数据
 */
async function insertDefaultData() {
  const database = getDatabase();

  // 默认应用设置
  const defaultSettings = [
    { key: 'theme_name', value: 'default', type: 'string', description: '当前主题名称' },
    { key: 'font_family', value: 'Inter', type: 'string', description: '当前字体' },
    { key: 'font_size', value: '14', type: 'number', description: '字体大小' },
    { key: 'encryption_display_duration', value: '3', type: 'number', description: '加密模式下明文显示时长(秒)' },
    { key: 'default_view_mode', value: 'split', type: 'string', description: '默认显示模式' },
    { key: 'auto_save', value: 'true', type: 'boolean', description: '是否自动保存' },
    { key: 'language', value: 'zh-CN', type: 'string', description: '界面语言' },
    { key: 'show_line_numbers', value: 'true', type: 'boolean', description: '是否显示行号' },
    { key: 'word_wrap', value: 'true', type: 'boolean', description: '是否自动换行' },
    { key: 'sync_scroll', value: 'true', type: 'boolean', description: '是否同步滚动' }
  ];

  // 默认主题
  const defaultThemes = [
    {
      name: 'default',
      display_name: '默认主题',
      background_color: '#ffffff',
      text_color: '#1f2937',
      background_pattern: 'none',
      is_built_in: 1,
      is_active: 1
    },
    {
      name: 'grid',
      display_name: '方格背景',
      background_color: '#ffffff',
      text_color: '#1f2937',
      background_pattern: 'grid-pattern',
      is_built_in: 1,
      is_active: 0
    },
    {
      name: 'dark',
      display_name: '黑夜主题',
      background_color: '#1f2937',
      text_color: '#f9fafb',
      background_pattern: 'none',
      is_built_in: 1,
      is_active: 0
    },
    {
      name: 'sepia',
      display_name: '护眼主题',
      background_color: '#f7f3e9',
      text_color: '#5d4037',
      background_pattern: 'none',
      is_built_in: 1,
      is_active: 0
    }
  ];

  // 默认字体
  const defaultFonts = [
    { name: 'Inter', family: 'Inter, sans-serif', size: 14, is_system_font: 1, is_active: 1 },
    { name: 'JetBrains Mono', family: 'JetBrains Mono, monospace', size: 14, is_system_font: 1, is_active: 0 },
    { name: 'Noto Sans SC', family: 'Noto Sans SC, sans-serif', size: 14, is_system_font: 1, is_active: 0 }
  ];

  // 默认快捷键
  const defaultShortcuts = [
    { action_name: 'toggle_encryption', action_description: '切换加密模式', key_combination: 'Ctrl+Shift+E', is_enabled: 1 },
    { action_name: 'toggle_view_mode', action_description: '切换显示模式', key_combination: 'Ctrl+\\', is_enabled: 1 },
    { action_name: 'new_document', action_description: '新建文档', key_combination: 'Ctrl+N', is_enabled: 1 },
    { action_name: 'open_document', action_description: '打开文档', key_combination: 'Ctrl+O', is_enabled: 1 },
    { action_name: 'save_document', action_description: '保存文档', key_combination: 'Ctrl+S', is_enabled: 1 },
    { action_name: 'export_pdf', action_description: '导出PDF', key_combination: 'Ctrl+Shift+P', is_enabled: 1 },
    { action_name: 'toggle_settings', action_description: '打开设置', key_combination: 'Ctrl+,', is_enabled: 1 }
  ];

  // 默认导出设置
  const defaultExportSettings = [
    {
      export_format: 'pdf',
      include_theme: 1,
      page_size: 'A4',
      margin_top: 20,
      margin_bottom: 20,
      margin_left: 20,
      margin_right: 20,
      font_size: 12
    }
  ];

  try {
    // 插入默认设置
    for (const setting of defaultSettings) {
      await new Promise((resolve, reject) => {
        database.run(
          'INSERT OR IGNORE INTO app_settings (key, value, type, description) VALUES (?, ?, ?, ?)',
          [setting.key, setting.value, setting.type, setting.description],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    }

    // 插入默认主题
    for (const theme of defaultThemes) {
      await new Promise((resolve, reject) => {
        database.run(
          'INSERT OR IGNORE INTO themes (name, display_name, background_color, text_color, background_pattern, is_built_in, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [theme.name, theme.display_name, theme.background_color, theme.text_color, theme.background_pattern, theme.is_built_in, theme.is_active],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    }

    // 插入默认字体
    for (const font of defaultFonts) {
      await new Promise((resolve, reject) => {
        database.run(
          'INSERT OR IGNORE INTO fonts (name, family, size, is_system_font, is_active) VALUES (?, ?, ?, ?, ?)',
          [font.name, font.family, font.size, font.is_system_font, font.is_active],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    }

    // 插入默认快捷键
    for (const shortcut of defaultShortcuts) {
      await new Promise((resolve, reject) => {
        database.run(
          'INSERT OR IGNORE INTO shortcuts (action_name, action_description, key_combination, is_enabled) VALUES (?, ?, ?, ?)',
          [shortcut.action_name, shortcut.action_description, shortcut.key_combination, shortcut.is_enabled],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    }

    // 插入默认导出设置
    for (const exportSetting of defaultExportSettings) {
      await new Promise((resolve, reject) => {
        database.run(
          'INSERT OR IGNORE INTO export_settings (export_format, include_theme, page_size, margin_top, margin_bottom, margin_left, margin_right, font_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [exportSetting.export_format, exportSetting.include_theme, exportSetting.page_size, exportSetting.margin_top, exportSetting.margin_bottom, exportSetting.margin_left, exportSetting.margin_right, exportSetting.font_size],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    }

    console.log('默认数据插入完成');
  } catch (error) {
    console.error('插入默认数据时出错:', error.message);
    throw error;
  }
}

/**
 * 初始化数据库
 */
async function initDatabase() {
  try {
    await createTables();
    await insertDefaultData();
    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    throw error;
  }
}

/**
 * 关闭数据库连接
 */
function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('关闭数据库连接时出错:', err.message);
      } else {
        console.log('数据库连接已关闭');
      }
    });
  }
}

module.exports = {
  getDatabase,
  initDatabase,
  closeDatabase,
  DB_PATH
};