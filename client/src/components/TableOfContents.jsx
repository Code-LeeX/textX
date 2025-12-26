import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  ChevronRightIcon,
  ChevronDownIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'

const TableOfContents = ({
  content,
  isVisible = true,
  onToggleVisibility,
  position = 'right', // 'left', 'right', 'floating'
  className = ''
}) => {
  const [headings, setHeadings] = useState([])
  const [activeHeading, setActiveHeading] = useState(null)
  const [expandedSections, setExpandedSections] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const tocRef = useRef(null)
  const scrollTimeoutRef = useRef(null)

  // 提取标题
  const extractHeadings = useCallback((markdownContent) => {
    if (!markdownContent) return []

    const lines = markdownContent.split('\n')
    const headingsList = []
    let headingCounter = 0

    lines.forEach((line, lineIndex) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        const level = match[1].length
        const title = match[2].trim()
        const id = `heading-${headingCounter++}`

        // 生成锚点ID
        const anchor = title
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')

        headingsList.push({
          id,
          anchor,
          level,
          title,
          lineIndex,
          children: []
        })
      }
    })

    // 构建层级结构
    const buildHierarchy = (flatList) => {
      const result = []
      const stack = []

      flatList.forEach(heading => {
        // 清理栈，移除比当前标题级别高的项
        while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
          stack.pop()
        }

        // 如果栈不为空，将当前标题作为栈顶标题的子项
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(heading)
        } else {
          result.push(heading)
        }

        // 将当前标题推入栈
        stack.push(heading)
      })

      return result
    }

    return buildHierarchy(headingsList)
  }, [])

  // 更新标题列表
  useEffect(() => {
    const newHeadings = extractHeadings(content)
    setHeadings(newHeadings)

    // 默认展开所有一级和二级标题
    const autoExpand = new Set()
    const addToAutoExpand = (headingList) => {
      headingList.forEach(heading => {
        if (heading.level <= 2 && heading.children.length > 0) {
          autoExpand.add(heading.id)
        }
        if (heading.children.length > 0) {
          addToAutoExpand(heading.children)
        }
      })
    }
    addToAutoExpand(newHeadings)
    setExpandedSections(autoExpand)
  }, [content, extractHeadings])

  // 滚动到标题
  const scrollToHeading = useCallback((heading) => {
    // 在实际应用中，需要在预览区域找到对应的标题元素
    const previewArea = document.querySelector('.markdown-body')
    if (!previewArea) return

    // 查找标题元素
    let targetElement = previewArea.querySelector(`#${heading.anchor}`)

    // 如果找不到精确匹配，尝试按文本内容查找
    if (!targetElement) {
      const allHeadings = previewArea.querySelectorAll('h1, h2, h3, h4, h5, h6')
      targetElement = Array.from(allHeadings).find(
        el => el.textContent.trim() === heading.title
      )
    }

    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
      setActiveHeading(heading.id)

      // 高亮显示目标标题
      targetElement.classList.add('toc-highlight')
      setTimeout(() => {
        targetElement.classList.remove('toc-highlight')
      }, 2000)
    }
  }, [])

  // 监听滚动事件来更新当前活动标题
  useEffect(() => {
    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const previewArea = document.querySelector('.markdown-body')
        if (!previewArea) return

        const allHeadings = previewArea.querySelectorAll('h1, h2, h3, h4, h5, h6')
        const scrollTop = previewArea.scrollTop + 100 // 偏移量

        let currentHeading = null

        Array.from(allHeadings).forEach(el => {
          if (el.offsetTop <= scrollTop) {
            currentHeading = el
          }
        })

        if (currentHeading) {
          const flatHeadings = []
          const flattenHeadings = (headingList) => {
            headingList.forEach(heading => {
              flatHeadings.push(heading)
              flattenHeadings(heading.children)
            })
          }
          flattenHeadings(headings)

          const matchingHeading = flatHeadings.find(
            h => h.title === currentHeading.textContent.trim()
          )

          if (matchingHeading) {
            setActiveHeading(matchingHeading.id)
          }
        }
      }, 100)
    }

    const previewArea = document.querySelector('.markdown-body')
    if (previewArea) {
      previewArea.addEventListener('scroll', handleScroll)
      return () => previewArea.removeEventListener('scroll', handleScroll)
    }
  }, [headings])

  // 切换展开状态
  const toggleExpanded = useCallback((headingId) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(headingId)) {
        newSet.delete(headingId)
      } else {
        newSet.add(headingId)
      }
      return newSet
    })
  }, [])

  // 过滤标题
  const filterHeadings = useCallback((headingList, term) => {
    if (!term) return headingList

    const filtered = []

    const searchInHeadings = (headings) => {
      headings.forEach(heading => {
        const matchesSearch = heading.title.toLowerCase().includes(term.toLowerCase())
        const childMatches = searchInHeadings(heading.children)

        if (matchesSearch || childMatches.length > 0) {
          filtered.push({
            ...heading,
            children: matchesSearch ? heading.children : childMatches
          })
        }
      })
      return filtered
    }

    return searchInHeadings(headingList)
  }, [])

  // 渲染标题项
  const renderHeading = useCallback((heading, depth = 0) => {
    const isExpanded = expandedSections.has(heading.id)
    const isActive = activeHeading === heading.id
    const hasChildren = heading.children.length > 0

    return (
      <div key={heading.id} className="toc-item">
        <div
          className={`
            toc-heading
            ${isActive ? 'active' : ''}
            ${depth > 0 ? 'nested' : ''}
          `}
          style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleExpanded(heading.id)}
              className="toc-expand-btn"
              title={isExpanded ? '收起' : '展开'}
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-3 h-3" />
              ) : (
                <ChevronRightIcon className="w-3 h-3" />
              )}
            </button>
          )}

          <button
            onClick={() => scrollToHeading(heading)}
            className={`
              toc-link level-${heading.level}
              ${hasChildren ? 'has-children' : 'no-children'}
              ${isActive ? 'active' : ''}
            `}
            title={heading.title}
          >
            <span className="toc-title">{heading.title}</span>
            <span className="toc-level">H{heading.level}</span>
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div className="toc-children">
            {heading.children.map(child => renderHeading(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }, [activeHeading, expandedSections, scrollToHeading, toggleExpanded])

  const filteredHeadings = filterHeadings(headings, searchTerm)

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="toc-toggle-btn"
        title="显示目录"
      >
        <ListBulletIcon className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div
      ref={tocRef}
      className={`
        table-of-contents
        ${position === 'floating' ? 'floating' : position}
        ${isCollapsed ? 'collapsed' : ''}
        ${className}
      `}
    >
      {/* 头部 */}
      <div className="toc-header">
        <div className="toc-title-bar">
          <ListBulletIcon className="w-4 h-4" />
          <span className="toc-main-title">目录</span>
          <div className="toc-header-actions">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="toc-action-btn"
              title={isCollapsed ? '展开' : '收起'}
            >
              {isCollapsed ? (
                <EyeIcon className="w-4 h-4" />
              ) : (
                <EyeSlashIcon className="w-4 h-4" />
              )}
            </button>
            {onToggleVisibility && (
              <button
                onClick={onToggleVisibility}
                className="toc-action-btn"
                title="隐藏目录"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {!isCollapsed && (
          <>
            {/* 搜索框 */}
            <div className="toc-search">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索标题..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="toc-search-input"
              />
            </div>

            {/* 统计信息 */}
            <div className="toc-stats">
              <span className="text-xs text-gray-500">
                {filteredHeadings.length} 个标题
                {searchTerm && ` (已过滤)`}
              </span>
            </div>
          </>
        )}
      </div>

      {/* 目录内容 */}
      {!isCollapsed && (
        <div className="toc-content">
          {filteredHeadings.length === 0 ? (
            <div className="toc-empty">
              {searchTerm ? (
                <div className="text-center text-gray-500 text-sm py-4">
                  <MagnifyingGlassIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  未找到匹配的标题
                </div>
              ) : (
                <div className="text-center text-gray-500 text-sm py-4">
                  <ListBulletIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  暂无标题
                </div>
              )}
            </div>
          ) : (
            <div className="toc-list">
              {filteredHeadings.map(heading => renderHeading(heading))}
            </div>
          )}
        </div>
      )}

      {/* 底部操作 */}
      {!isCollapsed && headings.length > 0 && (
        <div className="toc-footer">
          <button
            onClick={() => setExpandedSections(new Set())}
            className="toc-footer-btn"
          >
            全部收起
          </button>
          <button
            onClick={() => {
              const allIds = new Set()
              const collectIds = (headingList) => {
                headingList.forEach(h => {
                  if (h.children.length > 0) {
                    allIds.add(h.id)
                    collectIds(h.children)
                  }
                })
              }
              collectIds(headings)
              setExpandedSections(allIds)
            }}
            className="toc-footer-btn"
          >
            全部展开
          </button>
        </div>
      )}

      <style jsx>{`
        .table-of-contents {
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          max-height: 70vh;
          min-width: 280px;
          font-size: 14px;
        }

        .table-of-contents.floating {
          position: fixed;
          top: 50%;
          right: 20px;
          transform: translateY(-50%);
          z-index: 40;
        }

        .table-of-contents.left {
          border-right: 1px solid #e5e7eb;
        }

        .table-of-contents.right {
          border-left: 1px solid #e5e7eb;
        }

        .table-of-contents.collapsed {
          max-height: 48px;
        }

        .toc-header {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .toc-title-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
        }

        .toc-main-title {
          font-weight: 600;
          color: #374151;
          flex: 1;
        }

        .toc-header-actions {
          display: flex;
          gap: 4px;
        }

        .toc-action-btn {
          padding: 4px;
          border-radius: 4px;
          border: none;
          background: transparent;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toc-action-btn:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .toc-search {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px 12px;
        }

        .toc-search-input {
          flex: 1;
          padding: 6px 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 12px;
          outline: none;
          transition: border-color 0.2s;
        }

        .toc-search-input:focus {
          border-color: #3b82f6;
        }

        .toc-stats {
          padding: 0 16px 8px;
        }

        .toc-content {
          overflow-y: auto;
          max-height: calc(70vh - 120px);
        }

        .toc-list {
          padding: 8px 0;
        }

        .toc-heading {
          display: flex;
          align-items: center;
          position: relative;
        }

        .toc-expand-btn {
          padding: 4px;
          margin-right: 4px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #6b7280;
          transition: color 0.2s;
          flex-shrink: 0;
        }

        .toc-expand-btn:hover {
          color: #374151;
        }

        .toc-link {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 16px 6px 8px;
          border: none;
          background: transparent;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 4px;
          margin: 0 8px;
          color: #4b5563;
        }

        .toc-link.no-children {
          padding-left: 24px;
        }

        .toc-link:hover {
          background: #f3f4f6;
          color: #1f2937;
        }

        .toc-link.active {
          background: #dbeafe;
          color: #1d4ed8;
          font-weight: 500;
        }

        .toc-title {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-right: 8px;
        }

        .toc-level {
          font-size: 10px;
          color: #9ca3af;
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 10px;
          flex-shrink: 0;
        }

        .toc-link.active .toc-level {
          background: #bfdbfe;
          color: #1e40af;
        }

        .level-1 .toc-title { font-weight: 600; }
        .level-2 .toc-title { font-weight: 500; }
        .level-3 .toc-title { font-weight: normal; }

        .toc-children {
          margin-left: 8px;
          border-left: 2px solid #f3f4f6;
        }

        .toc-empty {
          padding: 16px;
        }

        .toc-footer {
          display: flex;
          gap: 8px;
          padding: 8px 16px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .toc-footer-btn {
          flex: 1;
          padding: 6px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: white;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toc-footer-btn:hover {
          background: #f3f4f6;
        }

        .toc-toggle-btn {
          position: fixed;
          top: 50%;
          right: 20px;
          transform: translateY(-50%);
          padding: 12px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 50%;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          z-index: 40;
          transition: all 0.2s;
        }

        .toc-toggle-btn:hover {
          background: #f3f4f6;
        }

        /* 高亮动画 */
        :global(.toc-highlight) {
          background: #fef3c7 !important;
          transition: background 0.3s ease;
          border-radius: 4px;
          padding: 4px 8px;
          margin: 2px 0;
        }

        /* 暗色主题 */
        :global(.dark) .table-of-contents {
          background: #1f2937;
          border-color: #374151;
          color: #f9fafb;
        }

        :global(.dark) .toc-header {
          background: #111827;
          border-color: #374151;
        }

        :global(.dark) .toc-main-title {
          color: #f3f4f6;
        }

        :global(.dark) .toc-search-input {
          background: #374151;
          border-color: #4b5563;
          color: #f9fafb;
        }

        :global(.dark) .toc-link {
          color: #d1d5db;
        }

        :global(.dark) .toc-link:hover {
          background: #374151;
          color: #f9fafb;
        }

        :global(.dark) .toc-link.active {
          background: #1e40af;
          color: #bfdbfe;
        }

        :global(.dark) .toc-footer {
          background: #111827;
          border-color: #374151;
        }

        :global(.dark) .toc-footer-btn {
          background: #374151;
          border-color: #4b5563;
          color: #f9fafb;
        }

        :global(.dark) .toc-footer-btn:hover {
          background: #4b5563;
        }
      `}</style>
    </div>
  )
}

export default TableOfContents