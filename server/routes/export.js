const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const { getDatabase } = require('../database/init');

const router = express.Router();

/**
 * 获取导出设置
 * GET /api/export/settings
 */
router.get('/settings', async (req, res) => {
  try {
    const db = getDatabase();

    const settings = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM export_settings WHERE export_format = "pdf" ORDER BY id DESC LIMIT 1',
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!settings) {
      // 返回默认设置
      const defaultSettings = {
        export_format: 'pdf',
        include_theme: true,
        page_size: 'A4',
        margin_top: 20,
        margin_bottom: 20,
        margin_left: 20,
        margin_right: 20,
        font_size: 12
      };

      return res.json({
        success: true,
        data: defaultSettings
      });
    }

    res.json({
      success: true,
      data: {
        export_format: settings.export_format,
        include_theme: Boolean(settings.include_theme),
        page_size: settings.page_size,
        margin_top: settings.margin_top,
        margin_bottom: settings.margin_bottom,
        margin_left: settings.margin_left,
        margin_right: settings.margin_right,
        font_size: settings.font_size
      }
    });
  } catch (error) {
    console.error('获取导出设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取导出设置失败',
      error: error.message
    });
  }
});

/**
 * 更新导出设置
 * PUT /api/export/settings
 */
router.put('/settings', async (req, res) => {
  try {
    const {
      include_theme = true,
      page_size = 'A4',
      margin_top = 20,
      margin_bottom = 20,
      margin_left = 20,
      margin_right = 20,
      font_size = 12
    } = req.body;

    const db = getDatabase();

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO export_settings
         (export_format, include_theme, page_size, margin_top, margin_bottom, margin_left, margin_right, font_size, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          'pdf',
          include_theme ? 1 : 0,
          page_size,
          margin_top,
          margin_bottom,
          margin_left,
          margin_right,
          font_size
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({
      success: true,
      message: '导出设置更新成功',
      data: {
        export_format: 'pdf',
        include_theme,
        page_size,
        margin_top,
        margin_bottom,
        margin_left,
        margin_right,
        font_size
      }
    });
  } catch (error) {
    console.error('更新导出设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新导出设置失败',
      error: error.message
    });
  }
});

/**
 * 生成HTML内容用于PDF导出
 */
function generateExportHTML(content, theme, font, exportSettings) {
  const { marked } = require('marked');
  const DOMPurify = require('dompurify');
  const { JSDOM } = require('jsdom');

  const window = new JSDOM('').window;
  const createDOMPurify = DOMPurify(window);

  // 配置marked选项
  marked.setOptions({
    breaks: true,
    gfm: true
  });

  // 渲染Markdown
  const htmlContent = marked(content);
  const sanitizedHTML = createDOMPurify.sanitize(htmlContent);

  // 构建CSS样式
  const styles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap');

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: ${font?.family || 'Inter, "Noto Sans SC", sans-serif'};
        font-size: ${exportSettings?.font_size || 12}px;
        line-height: 1.6;
        color: ${theme?.text_color || '#1f2937'};
        background-color: ${theme?.background_color || '#ffffff'};
        padding: 20px;
        ${theme?.background_pattern && theme.background_pattern !== 'none'
          ? `background-image: var(--${theme.background_pattern});`
          : ''
        }
      }

      .content {
        max-width: 100%;
        margin: 0 auto;
      }

      /* 标题样式 */
      h1 {
        font-size: 2.25em;
        font-weight: 700;
        margin: 2em 0 1em;
        color: ${theme?.text_color || '#1f2937'};
        border-bottom: 2px solid ${theme?.text_color || '#e5e7eb'};
        padding-bottom: 0.5em;
      }

      h2 {
        font-size: 1.875em;
        font-weight: 600;
        margin: 1.5em 0 0.75em;
        color: ${theme?.text_color || '#1f2937'};
      }

      h3 {
        font-size: 1.5em;
        font-weight: 600;
        margin: 1.25em 0 0.5em;
        color: ${theme?.text_color || '#1f2937'};
      }

      h4 {
        font-size: 1.25em;
        font-weight: 500;
        margin: 1em 0 0.5em;
        color: ${theme?.text_color || '#1f2937'};
      }

      h5, h6 {
        font-size: 1.125em;
        font-weight: 500;
        margin: 0.875em 0 0.5em;
        color: ${theme?.text_color || '#1f2937'};
      }

      /* 段落样式 */
      p {
        margin: 0 0 1.25em;
        text-align: justify;
      }

      /* 列表样式 */
      ul, ol {
        margin: 0 0 1.25em 1.5em;
      }

      li {
        margin: 0.25em 0;
      }

      /* 引用样式 */
      blockquote {
        margin: 1.25em 0;
        padding: 1em 1.5em;
        border-left: 4px solid ${theme?.text_color || '#d1d5db'};
        background-color: ${theme?.background_color === '#ffffff' ? '#f9fafb' : 'rgba(255,255,255,0.05)'};
        font-style: italic;
      }

      /* 代码样式 */
      code {
        background-color: ${theme?.background_color === '#ffffff' ? '#f3f4f6' : 'rgba(255,255,255,0.1)'};
        padding: 0.125em 0.25em;
        border-radius: 0.25em;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.875em;
      }

      pre {
        background-color: ${theme?.background_color === '#ffffff' ? '#1f2937' : '#111827'};
        color: #f9fafb;
        padding: 1em;
        border-radius: 0.5em;
        overflow-x: auto;
        margin: 1.25em 0;
      }

      pre code {
        background-color: transparent;
        padding: 0;
        color: inherit;
      }

      /* 图片样式 */
      img {
        max-width: 100%;
        height: auto;
        margin: 1.25em 0;
        border-radius: 0.5em;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }

      /* 分页样式 */
      @page {
        size: ${exportSettings?.page_size || 'A4'};
        margin: ${exportSettings?.margin_top || 20}mm ${exportSettings?.margin_right || 20}mm ${exportSettings?.margin_bottom || 20}mm ${exportSettings?.margin_left || 20}mm;
      }

      /* 分页控制 */
      h1, h2 {
        page-break-after: avoid;
      }

      h1, h2, h3, h4, h5, h6 {
        page-break-inside: avoid;
      }

      img, pre, blockquote {
        page-break-inside: avoid;
      }

      /* 自定义CSS */
      ${theme?.custom_css || ''}
    </style>
  `;

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TextX Document Export</title>
      ${styles}
    </head>
    <body>
      <div class="content">
        ${sanitizedHTML}
      </div>
    </body>
    </html>
  `;
}

/**
 * 导出为PDF
 * POST /api/export/pdf
 */
router.post('/pdf', async (req, res) => {
  let browser = null;

  try {
    const { content, fileName = 'document', includeTheme = true } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '文档内容不能为空'
      });
    }

    const db = getDatabase();

    // 获取导出设置
    const exportSettings = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM export_settings WHERE export_format = "pdf" ORDER BY id DESC LIMIT 1',
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    let theme = null;
    let font = null;

    if (includeTheme) {
      // 获取当前主题
      theme = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM themes WHERE is_active = 1',
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      // 获取当前字体
      font = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM fonts WHERE is_active = 1',
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
    }

    // 生成HTML内容
    const htmlContent = generateExportHTML(content, theme, font, exportSettings);

    // 启动puppeteer
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // 设置页面内容
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: parseInt(process.env.PDF_TIMEOUT) || 30000
    });

    // 生成PDF
    const pdfOptions = {
      format: exportSettings?.page_size || 'A4',
      printBackground: true,
      margin: {
        top: `${exportSettings?.margin_top || 20}mm`,
        right: `${exportSettings?.margin_right || 20}mm`,
        bottom: `${exportSettings?.margin_bottom || 20}mm`,
        left: `${exportSettings?.margin_left || 20}mm`
      }
    };

    const pdfBuffer = await page.pdf(pdfOptions);

    await browser.close();
    browser = null;

    // 设置响应头
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error('导出PDF失败:', error);

    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('关闭浏览器失败:', closeError);
      }
    }

    res.status(500).json({
      success: false,
      message: '导出PDF失败',
      error: error.message
    });
  }
});

/**
 * 预览HTML内容
 * POST /api/export/preview
 */
router.post('/preview', async (req, res) => {
  try {
    const { content, includeTheme = true } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '文档内容不能为空'
      });
    }

    const db = getDatabase();

    // 获取导出设置
    const exportSettings = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM export_settings WHERE export_format = "pdf" ORDER BY id DESC LIMIT 1',
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    let theme = null;
    let font = null;

    if (includeTheme) {
      // 获取当前主题
      theme = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM themes WHERE is_active = 1',
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      // 获取当前字体
      font = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM fonts WHERE is_active = 1',
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
    }

    // 生成HTML内容
    const htmlContent = generateExportHTML(content, theme, font, exportSettings);

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);

  } catch (error) {
    console.error('生成预览失败:', error);
    res.status(500).json({
      success: false,
      message: '生成预览失败',
      error: error.message
    });
  }
});

module.exports = router;