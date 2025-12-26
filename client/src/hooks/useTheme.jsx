import { create } from 'zustand'
import { useEffect, useCallback } from 'react'
import useAppStore from '@store/useAppStore'

const useThemeStore = create((set, get) => ({
  currentTheme: null,
  themes: [],
  isLoading: false,

  setCurrentTheme: (theme) => set({ currentTheme: theme }),
  setThemes: (themes) => set({ themes }),
  setLoading: (loading) => set({ isLoading: loading })
}))

// 默认主题
const DEFAULT_THEMES = {
  default: {
    name: 'default',
    display_name: '默认主题',
    background_color: '#ffffff',
    text_color: '#1f2937',
    background_pattern: 'none',
    className: 'theme-default'
  },
  grid: {
    name: 'grid',
    display_name: '方格背景',
    background_color: '#ffffff',
    text_color: '#1f2937',
    background_pattern: 'grid-pattern',
    className: 'theme-grid bg-grid-pattern'
  },
  dark: {
    name: 'dark',
    display_name: '黑夜主题',
    background_color: '#1f2937',
    text_color: '#f9fafb',
    background_pattern: 'none',
    className: 'theme-dark bg-gray-800 text-white'
  },
  sepia: {
    name: 'sepia',
    display_name: '护眼主题',
    background_color: '#f7f3e9',
    text_color: '#5d4037',
    background_pattern: 'none',
    className: 'theme-sepia'
  }
}

const useTheme = () => {
  const { currentTheme, themes, isLoading, setCurrentTheme, setThemes, setLoading } = useThemeStore()
  const { setLoading: setAppLoading } = useAppStore()

  // 加载主题列表
  const loadThemes = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/themes')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const themesWithClass = result.data.map(theme => ({
            ...theme,
            className: getThemeClassName(theme)
          }))
          setThemes(themesWithClass)
        }
      }
    } catch (error) {
      console.error('加载主题失败:', error)
      // 使用默认主题
      setThemes(Object.values(DEFAULT_THEMES))
    } finally {
      setLoading(false)
    }
  }, [setLoading, setThemes])

  // 加载当前激活主题
  const loadCurrentTheme = useCallback(async () => {
    try {
      const response = await fetch('/api/themes/active')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const theme = {
            ...result.data,
            className: getThemeClassName(result.data)
          }
          setCurrentTheme(theme)
          applyTheme(theme)
        }
      }
    } catch (error) {
      console.error('加载当前主题失败:', error)
      // 使用默认主题
      const defaultTheme = DEFAULT_THEMES.default
      setCurrentTheme(defaultTheme)
      applyTheme(defaultTheme)
    } finally {
      // 主题加载完成，设置应用不再loading
      setAppLoading(false)
    }
  }, [setCurrentTheme, setAppLoading])

  // 激活主题
  const activateTheme = async (themeId) => {
    try {
      const response = await fetch(`/api/themes/${themeId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const theme = {
            ...result.data,
            className: getThemeClassName(result.data)
          }
          setCurrentTheme(theme)
          applyTheme(theme)
          return true
        }
      }
      return false
    } catch (error) {
      console.error('激活主题失败:', error)
      return false
    }
  }

  // 生成主题CSS类名
  const getThemeClassName = (theme) => {
    let className = `theme-${theme.name}`

    switch (theme.name) {
      case 'dark':
        className += ' bg-gray-800 text-white'
        break
      case 'grid':
        className += ' bg-grid-pattern'
        break
      case 'sepia':
        className += ' bg-yellow-50 text-yellow-900'
        break
      default:
        className += ' bg-white text-gray-900'
        break
    }

    return className
  }

  // 应用主题到DOM
  const applyTheme = (theme) => {
    const root = document.documentElement

    // 设置CSS自定义属性
    root.style.setProperty('--theme-bg-color', theme.background_color)
    root.style.setProperty('--theme-text-color', theme.text_color)

    // 设置body背景样式
    document.body.style.backgroundColor = theme.background_color
    document.body.style.color = theme.text_color

    // 添加背景图案
    if (theme.background_pattern && theme.background_pattern !== 'none') {
      document.body.classList.add(`bg-${theme.background_pattern}`)
    } else {
      // 移除所有背景图案类
      document.body.classList.remove('bg-grid-pattern', 'bg-dot-pattern')
    }

    // 应用自定义CSS
    if (theme.custom_css) {
      let styleElement = document.getElementById('theme-custom-css')
      if (!styleElement) {
        styleElement = document.createElement('style')
        styleElement.id = 'theme-custom-css'
        document.head.appendChild(styleElement)
      }
      styleElement.textContent = theme.custom_css
    }

    // 设置主题数据属性
    root.setAttribute('data-theme', theme.name)
  }

  // 创建新主题
  const createTheme = async (themeData) => {
    try {
      const response = await fetch('/api/themes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(themeData)
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          await loadThemes() // 重新加载主题列表
          return result.data
        }
      }
      return null
    } catch (error) {
      console.error('创建主题失败:', error)
      return null
    }
  }

  // 更新主题
  const updateTheme = async (themeId, themeData) => {
    try {
      const response = await fetch(`/api/themes/${themeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(themeData)
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          await loadThemes() // 重新加载主题列表
          return result.data
        }
      }
      return null
    } catch (error) {
      console.error('更新主题失败:', error)
      return null
    }
  }

  // 删除主题
  const deleteTheme = async (themeId) => {
    try {
      const response = await fetch(`/api/themes/${themeId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          await loadThemes() // 重新加载主题列表
          return true
        }
      }
      return false
    } catch (error) {
      console.error('删除主题失败:', error)
      return false
    }
  }

  // 初始化主题
  useEffect(() => {
    loadThemes()
    loadCurrentTheme()
  }, [loadThemes, loadCurrentTheme])

  return {
    currentTheme,
    themes,
    isLoading,
    loadThemes,
    loadCurrentTheme,
    activateTheme,
    createTheme,
    updateTheme,
    deleteTheme,
    applyTheme
  }
}

export default useTheme