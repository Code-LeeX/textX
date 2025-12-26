import { useState, useEffect, useCallback, useRef } from 'react'

const useTOC = (content, enabled = true) => {
  const [headings, setHeadings] = useState([])
  const [activeHeading, setActiveHeading] = useState(null)
  const [isVisible, setIsVisible] = useState(true)
  const [position, setPosition] = useState('right') // 'left', 'right', 'floating'

  const observerRef = useRef(null)
  const timeoutRef = useRef(null)

  // 提取标题信息
  const extractHeadings = useCallback((markdownContent) => {
    if (!markdownContent || !enabled) return []

    const lines = markdownContent.split('\n')
    const headingsList = []
    let currentLineNumber = 0

    lines.forEach((line, lineIndex) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        const level = headingMatch[1].length
        const title = headingMatch[2].trim()
        const id = `heading-${Date.now()}-${lineIndex}`

        // 生成URL友好的锚点
        const anchor = title
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 50) // 限制长度

        headingsList.push({
          id,
          anchor,
          level,
          title,
          lineIndex,
          lineNumber: currentLineNumber + lineIndex + 1,
          originalLine: line
        })
      }
    })

    return headingsList
  }, [enabled])

  // 构建层级结构
  const buildHierarchy = useCallback((flatHeadings) => {
    const result = []
    const stack = []

    flatHeadings.forEach(heading => {
      const headingWithChildren = { ...heading, children: [] }

      // 清理栈，移除层级不合适的项
      while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
        stack.pop()
      }

      // 添加到层级结构
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(headingWithChildren)
      } else {
        result.push(headingWithChildren)
      }

      stack.push(headingWithChildren)
    })

    return result
  }, [])

  // 更新标题列表
  useEffect(() => {
    if (!content) {
      setHeadings([])
      return
    }

    const flatHeadings = extractHeadings(content)
    const hierarchicalHeadings = buildHierarchy(flatHeadings)
    setHeadings(hierarchicalHeadings)
  }, [content, extractHeadings, buildHierarchy])

  // 获取扁平化的标题列表（用于导航）
  const getFlatHeadings = useCallback(() => {
    const flatList = []

    const flatten = (headingList) => {
      headingList.forEach(heading => {
        flatList.push(heading)
        if (heading.children) {
          flatten(heading.children)
        }
      })
    }

    flatten(headings)
    return flatList
  }, [headings])

  // 滚动到指定标题
  const scrollToHeading = useCallback((heading) => {
    const previewContainer = document.querySelector('.markdown-preview') ||
                           document.querySelector('.markdown-body') ||
                           document.querySelector('[data-markdown-preview]')

    if (!previewContainer) {
      console.warn('找不到预览容器')
      return
    }

    // 尝试多种方式查找目标元素
    let targetElement = null

    // 1. 通过锚点ID查找
    if (heading.anchor) {
      targetElement = previewContainer.querySelector(`#${heading.anchor}`)
    }

    // 2. 通过标题文本查找
    if (!targetElement) {
      const headingElements = previewContainer.querySelectorAll('h1, h2, h3, h4, h5, h6')
      targetElement = Array.from(headingElements).find(
        el => el.textContent.trim() === heading.title.trim()
      )
    }

    // 3. 通过级别和位置推测
    if (!targetElement && heading.lineIndex !== undefined) {
      const headingElements = previewContainer.querySelectorAll(`h${heading.level}`)
      const flatHeadings = getFlatHeadings()
      const headingIndex = flatHeadings.findIndex(h => h.id === heading.id)
      const sameLevel = flatHeadings.filter(h => h.level === heading.level)
      const indexInLevel = sameLevel.findIndex(h => h.id === heading.id)

      if (indexInLevel < headingElements.length) {
        targetElement = headingElements[indexInLevel]
      }
    }

    if (targetElement) {
      // 滚动到目标位置
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      })

      // 设置活动标题
      setActiveHeading(heading.id)

      // 添加高亮效果
      targetElement.classList.add('toc-target-highlight')
      setTimeout(() => {
        targetElement.classList.remove('toc-target-highlight')
      }, 2000)

      // 触发自定义事件
      window.dispatchEvent(new CustomEvent('toc:navigate', {
        detail: { heading, element: targetElement }
      }))

      return true
    } else {
      console.warn('无法找到标题元素:', heading.title)
      return false
    }
  }, [getFlatHeadings])

  // 设置活动标题（基于滚动位置）
  const updateActiveHeading = useCallback(() => {
    const previewContainer = document.querySelector('.markdown-preview') ||
                           document.querySelector('.markdown-body') ||
                           document.querySelector('[data-markdown-preview]')

    if (!previewContainer || headings.length === 0) return

    const scrollTop = previewContainer.scrollTop
    const containerHeight = previewContainer.clientHeight
    const scrollOffset = containerHeight * 0.2 // 20% 偏移

    // 获取所有标题元素
    const headingElements = previewContainer.querySelectorAll('h1, h2, h3, h4, h5, h6')
    if (headingElements.length === 0) return

    let currentHeading = null
    let currentDistance = Infinity

    // 找到最接近视口顶部的标题
    Array.from(headingElements).forEach(element => {
      const rect = element.getBoundingClientRect()
      const containerRect = previewContainer.getBoundingClientRect()
      const elementTop = rect.top - containerRect.top + scrollTop
      const distance = Math.abs(elementTop - scrollTop - scrollOffset)

      if (elementTop <= scrollTop + scrollOffset && distance < currentDistance) {
        currentDistance = distance
        currentHeading = element
      }
    })

    if (currentHeading) {
      const flatHeadings = getFlatHeadings()
      const matchingHeading = flatHeadings.find(
        h => h.title.trim() === currentHeading.textContent.trim()
      )

      if (matchingHeading && matchingHeading.id !== activeHeading) {
        setActiveHeading(matchingHeading.id)

        // 触发活动标题变化事件
        window.dispatchEvent(new CustomEvent('toc:activeChange', {
          detail: { heading: matchingHeading, element: currentHeading }
        }))
      }
    }
  }, [headings, activeHeading, getFlatHeadings])

  // 监听滚动事件
  useEffect(() => {
    const previewContainer = document.querySelector('.markdown-preview') ||
                           document.querySelector('.markdown-body') ||
                           document.querySelector('[data-markdown-preview]')

    if (!previewContainer || !enabled) return

    const handleScroll = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(updateActiveHeading, 50)
    }

    previewContainer.addEventListener('scroll', handleScroll, { passive: true })

    // 初始化活动标题
    updateActiveHeading()

    return () => {
      previewContainer.removeEventListener('scroll', handleScroll)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [updateActiveHeading, enabled])

  // 导航到下一个/上一个标题
  const navigateToNext = useCallback(() => {
    const flatHeadings = getFlatHeadings()
    if (flatHeadings.length === 0) return

    let nextIndex = 0
    if (activeHeading) {
      const currentIndex = flatHeadings.findIndex(h => h.id === activeHeading)
      nextIndex = Math.min(currentIndex + 1, flatHeadings.length - 1)
    }

    scrollToHeading(flatHeadings[nextIndex])
  }, [activeHeading, getFlatHeadings, scrollToHeading])

  const navigateToPrevious = useCallback(() => {
    const flatHeadings = getFlatHeadings()
    if (flatHeadings.length === 0) return

    let prevIndex = flatHeadings.length - 1
    if (activeHeading) {
      const currentIndex = flatHeadings.findIndex(h => h.id === activeHeading)
      prevIndex = Math.max(currentIndex - 1, 0)
    }

    scrollToHeading(flatHeadings[prevIndex])
  }, [activeHeading, getFlatHeadings, scrollToHeading])

  // 获取统计信息
  const getStats = useCallback(() => {
    const flatHeadings = getFlatHeadings()
    const stats = {
      total: flatHeadings.length,
      byLevel: {},
      currentIndex: -1,
      progress: 0
    }

    // 按级别统计
    flatHeadings.forEach(heading => {
      stats.byLevel[heading.level] = (stats.byLevel[heading.level] || 0) + 1
    })

    // 当前进度
    if (activeHeading) {
      stats.currentIndex = flatHeadings.findIndex(h => h.id === activeHeading)
      stats.progress = stats.total > 0 ? (stats.currentIndex + 1) / stats.total : 0
    }

    return stats
  }, [activeHeading, getFlatHeadings])

  // 切换可见性
  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => !prev)
  }, [])

  // 设置位置
  const changePosition = useCallback((newPosition) => {
    setPosition(newPosition)
  }, [])

  return {
    // 数据
    headings,
    activeHeading,
    flatHeadings: getFlatHeadings(),

    // 状态
    isVisible,
    position,

    // 操作
    scrollToHeading,
    setActiveHeading,
    navigateToNext,
    navigateToPrevious,
    toggleVisibility,
    changePosition,

    // 工具
    getStats,

    // 控制
    enabled
  }
}

export default useTOC