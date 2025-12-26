import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import useAppStore from '@store/useAppStore'

const MarkdownPreview = ({
  content,
  onScroll,
  scrollTop
}) => {
  const previewRef = useRef(null)
  const { settings } = useAppStore()

  // 配置marked
  useMemo(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
      highlight: (code, language) => {
        if (language && hljs.getLanguage(language)) {
          try {
            return hljs.highlight(code, { language }).value
          } catch (error) {
            console.warn('代码高亮失败:', error)
          }
        }
        return hljs.highlightAuto(code).value
      }
    })

    // 自定义渲染器
    const renderer = new marked.Renderer()

    // 自定义标题渲染（添加锚点）
    renderer.heading = (text, level) => {
      const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-')
      return `<h${level} id="${id}" class="heading-anchor">${text}</h${level}>`
    }

    // 自定义图片渲染（支持并排显示）
    renderer.image = (href, title, text) => {
      // 检查是否是内联图片组（用空格分隔的多个图片）
      const imageGroup = text?.match(/!\[([^\]]*)\]\(([^)]+)\)/g)
      if (imageGroup && imageGroup.length > 1) {
        const images = imageGroup.map(img => {
          const match = img.match(/!\[([^\]]*)\]\(([^)]+)\)/)
          if (match) {
            return `<img src="${match[2]}" alt="${match[1]}" class="inline-image" />`
          }
          return ''
        }).join('')
        return `<div class="image-group">${images}</div>`
      }

      // 单个图片
      let imgClass = 'markdown-image'
      if (title?.includes('small')) imgClass += ' small'
      if (title?.includes('inline')) imgClass += ' inline'

      return `<img src="${href}" alt="${text}" title="${title || ''}" class="${imgClass}" />`
    }

    // 自定义列表渲染
    renderer.list = (body, ordered, start) => {
      const type = ordered ? 'ol' : 'ul'
      const startAttr = ordered && start !== 1 ? ` start="${start}"` : ''
      return `<${type}${startAttr} class="markdown-list">${body}</${type}>`
    }

    // 自定义引用渲染
    renderer.blockquote = (quote) => {
      return `<blockquote class="markdown-blockquote">${quote}</blockquote>`
    }

    // 自定义代码块渲染
    renderer.code = (code, language, escaped) => {
      const validLanguage = language && hljs.getLanguage(language) ? language : 'plaintext'
      const highlighted = hljs.highlight(code, { language: validLanguage }).value

      return `
        <div class="code-block">
          <div class="code-header">
            <span class="code-language">${validLanguage}</span>
          </div>
          <pre><code class="hljs language-${validLanguage}">${highlighted}</code></pre>
        </div>
      `
    }

    marked.use({ renderer })
  }, [])

  // 渲染Markdown为HTML
  const htmlContent = useMemo(() => {
    if (!content.trim()) {
      return '<div class="empty-state">开始输入内容...</div>'
    }

    try {
      const rawHtml = marked(content)
      return DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: ['iframe'],
        ADD_ATTR: ['target', 'rel']
      })
    } catch (error) {
      console.error('Markdown渲染失败:', error)
      return '<div class="error-state">内容渲染失败</div>'
    }
  }, [content])

  // 同步滚动位置
  useEffect(() => {
    if (previewRef.current && scrollTop !== undefined) {
      previewRef.current.scrollTop = scrollTop
    }
  }, [scrollTop])

  // 处理滚动
  const handleScroll = useCallback((e) => {
    if (onScroll) {
      onScroll(e.target.scrollTop)
    }
  }, [onScroll])

  // 处理链接点击
  const handleClick = useCallback((e) => {
    const target = e.target.closest('a')
    if (target && target.href) {
      e.preventDefault()
      // 如果是锚点链接，滚动到对应位置
      if (target.href.startsWith('#')) {
        const id = target.href.substring(1)
        const element = document.getElementById(id)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      } else {
        // 外部链接在新窗口打开
        window.open(target.href, '_blank', 'noopener,noreferrer')
      }
    }
  }, [])

  // 生成目录
  const generateTOC = useCallback(() => {
    if (!previewRef.current) return []

    const headings = previewRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6')
    return Array.from(headings).map((heading, index) => ({
      id: heading.id || `heading-${index}`,
      level: parseInt(heading.tagName.charAt(1)),
      text: heading.textContent,
      element: heading
    }))
  }, [htmlContent])

  return (
    <div className="editor-preview">
      <div
        ref={previewRef}
        className="markdown-body h-full overflow-y-auto p-4"
        style={{
          fontFamily: settings.font_family || 'Inter, sans-serif',
          fontSize: `${settings.font_size || 14}px`
        }}
        onScroll={settings.sync_scroll ? handleScroll : undefined}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      <style jsx>{`
        .markdown-body {
          color: var(--theme-text-color, #1f2937);
        }

        .markdown-body .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #9ca3af;
          font-style: italic;
        }

        .markdown-body .error-state {
          color: #ef4444;
          background-color: #fef2f2;
          padding: 1rem;
          border-radius: 0.5rem;
          border: 1px solid #fecaca;
        }


        .markdown-body .heading-anchor {
          position: relative;
        }

        .markdown-body .heading-anchor:hover::before {
          content: '#';
          position: absolute;
          left: -1.5rem;
          color: #6b7280;
          font-weight: normal;
        }

        .markdown-body .image-group {
          display: flex;
          gap: 0.5rem;
          align-items: flex-start;
          flex-wrap: wrap;
          margin: 1rem 0;
        }

        .markdown-body .inline-image {
          max-width: 300px;
          max-height: 200px;
          object-fit: cover;
          border-radius: 0.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .markdown-body .markdown-image {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          margin: 1rem 0;
        }

        .markdown-body .markdown-image.small {
          max-width: 300px;
        }

        .markdown-body .markdown-image.inline {
          display: inline-block;
          margin: 0 0.5rem;
          vertical-align: middle;
        }

        .markdown-body .markdown-list {
          padding-left: 1.5rem;
        }

        .markdown-body .markdown-blockquote {
          border-left: 4px solid #e5e7eb;
          padding: 0.5rem 1rem;
          margin: 1rem 0;
          background-color: #f9fafb;
          border-radius: 0 0.5rem 0.5rem 0;
        }

        .markdown-body .code-block {
          margin: 1rem 0;
          border-radius: 0.5rem;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .markdown-body .code-header {
          background-color: #374151;
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .markdown-body .code-language {
          text-transform: uppercase;
          font-weight: 500;
        }

        .markdown-body pre {
          margin: 0;
          background-color: #1f2937 !important;
        }

        .markdown-body code {
          font-family: 'JetBrains Mono', monospace;
        }

        /* 暗色主题适配 */
        .dark .markdown-body .markdown-blockquote {
          background-color: rgba(255, 255, 255, 0.05);
          border-left-color: #4b5563;
        }

        .dark .markdown-body .error-state {
          background-color: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
        }
      `}</style>
    </div>
  )
}

export default MarkdownPreview