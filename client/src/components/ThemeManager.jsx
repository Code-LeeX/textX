import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import useAppStore from '@store/useAppStore'
import {
  SwatchIcon,
  PaintBrushIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  EyeDropperIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

const ThemeManager = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useAppStore()
  const [themes, setThemes] = useState([])
  const [selectedTheme, setSelectedTheme] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [customTheme, setCustomTheme] = useState({
    name: '',
    colors: {
      primary: '#3b82f6',
      secondary: '#6b7280',
      accent: '#10b981',
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#1f2937',
      textSecondary: '#6b7280',
      border: '#e5e7eb'
    }
  })

  // 预设主题
  const presetThemes = [
    {
      id: 'light',
      name: '经典浅色',
      type: 'preset',
      colors: {
        primary: '#3b82f6',
        secondary: '#6b7280',
        accent: '#10b981',
        background: '#ffffff',
        surface: '#f9fafb',
        text: '#1f2937',
        textSecondary: '#6b7280',
        border: '#e5e7eb'
      }
    },
    {
      id: 'dark',
      name: '经典深色',
      type: 'preset',
      colors: {
        primary: '#60a5fa',
        secondary: '#9ca3af',
        accent: '#34d399',
        background: '#111827',
        surface: '#1f2937',
        text: '#f9fafb',
        textSecondary: '#d1d5db',
        border: '#374151'
      }
    },
    {
      id: 'sepia',
      name: '护眼棕黄',
      type: 'preset',
      colors: {
        primary: '#d97706',
        secondary: '#a3a3a3',
        accent: '#059669',
        background: '#fef7ed',
        surface: '#fed7aa',
        text: '#451a03',
        textSecondary: '#7c2d12',
        border: '#fdba74'
      }
    },
    {
      id: 'forest',
      name: '森林绿',
      type: 'preset',
      colors: {
        primary: '#059669',
        secondary: '#6b7280',
        accent: '#d97706',
        background: '#f0fdf4',
        surface: '#dcfce7',
        text: '#064e3b',
        textSecondary: '#166534',
        border: '#bbf7d0'
      }
    },
    {
      id: 'ocean',
      name: '海洋蓝',
      type: 'preset',
      colors: {
        primary: '#0ea5e9',
        secondary: '#64748b',
        accent: '#06b6d4',
        background: '#f0f9ff',
        surface: '#e0f2fe',
        text: '#0c4a6e',
        textSecondary: '#0369a1',
        border: '#bae6fd'
      }
    },
    {
      id: 'sunset',
      name: '日落橙',
      type: 'preset',
      colors: {
        primary: '#ea580c',
        secondary: '#78716c',
        accent: '#eab308',
        background: '#fffbeb',
        surface: '#fef3c7',
        text: '#7c2d12',
        textSecondary: '#a16207',
        border: '#fed7aa'
      }
    }
  ]

  // 加载主题列表
  const loadThemes = useCallback(async () => {
    setIsLoading(true)
    try {
      // 从后端加载自定义主题
      const response = await fetch('/api/themes')
      if (response.ok) {
        const customThemes = await response.json()
        setThemes([...presetThemes, ...customThemes])
      } else {
        // 如果后端不可用，使用预设主题
        setThemes(presetThemes)
      }
    } catch (error) {
      console.error('加载主题失败:', error)
      setThemes(presetThemes)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 初始化
  useEffect(() => {
    if (isOpen) {
      loadThemes()
      setSelectedTheme(settings.theme_id || 'light')
    }
  }, [isOpen, loadThemes, settings.theme_id])

  // 应用主题
  const applyTheme = useCallback((theme) => {
    const root = document.documentElement

    // 应用CSS变量
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value)
    })

    // 更新设置
    updateSettings({
      theme_id: theme.id,
      theme_name: theme.name
    })

    toast.success(`已切换到 ${theme.name} 主题`)
  }, [updateSettings])

  // 选择主题
  const selectTheme = useCallback((theme) => {
    setSelectedTheme(theme.id)
    applyTheme(theme)
  }, [applyTheme])

  // 保存自定义主题
  const saveCustomTheme = useCallback(async () => {
    if (!customTheme.name.trim()) {
      toast.error('请输入主题名称')
      return
    }

    try {
      const response = await fetch('/api/themes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: customTheme.name,
          colors: customTheme.colors,
          type: 'custom'
        })
      })

      if (response.ok) {
        const newTheme = await response.json()
        setThemes(prev => [...prev, newTheme])
        setCustomTheme({
          name: '',
          colors: { ...customTheme.colors }
        })
        toast.success('自定义主题保存成功')
      } else {
        throw new Error('保存失败')
      }
    } catch (error) {
      console.error('保存自定义主题失败:', error)
      toast.error('保存主题失败')
    }
  }, [customTheme])

  // 删除自定义主题
  const deleteTheme = useCallback(async (themeId) => {
    try {
      const response = await fetch(`/api/themes/${themeId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setThemes(prev => prev.filter(t => t.id !== themeId))
        if (selectedTheme === themeId) {
          selectTheme(presetThemes[0])
        }
        toast.success('主题删除成功')
      } else {
        throw new Error('删除失败')
      }
    } catch (error) {
      console.error('删除主题失败:', error)
      toast.error('删除主题失败')
    }
  }, [selectedTheme, selectTheme])

  // 获取主题图标
  const getThemeIcon = (themeId) => {
    switch (themeId) {
      case 'light':
        return <SunIcon className="w-4 h-4" />
      case 'dark':
        return <MoonIcon className="w-4 h-4" />
      case 'sepia':
        return <EyeDropperIcon className="w-4 h-4" />
      default:
        return <SwatchIcon className="w-4 h-4" />
    }
  }

  // 颜色选择器
  const ColorPicker = ({ label, value, onChange }) => (
    <div className="flex items-center space-x-2">
      <label className="text-sm text-gray-600 w-20">{label}</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input text-sm flex-1"
        placeholder="#000000"
      />
    </div>
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <PaintBrushIcon className="w-5 h-5 mr-2" />
            主题管理
          </h2>
          <button
            onClick={onClose}
            className="btn-icon btn-ghost"
          >
            ✕
          </button>
        </div>

        <div className="flex h-[600px]">
          {/* 左侧：主题列表 */}
          <div className="w-1/2 border-r border-gray-200 p-4 overflow-y-auto">
            <h3 className="font-medium text-gray-900 mb-4">选择主题</h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {themes.map((theme) => (
                  <div
                    key={theme.id}
                    className={`
                      relative p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${selectedTheme === theme.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                    onClick={() => selectTheme(theme)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getThemeIcon(theme.id)}
                        <div>
                          <div className="font-medium text-gray-900">{theme.name}</div>
                          <div className="text-xs text-gray-500">
                            {theme.type === 'preset' ? '内置主题' : '自定义主题'}
                          </div>
                        </div>
                      </div>

                      {theme.type === 'custom' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteTheme(theme.id)
                          }}
                          className="btn-icon btn-ghost text-red-500 hover:bg-red-50"
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    {/* 颜色预览 */}
                    <div className="flex space-x-1 mt-2">
                      {Object.entries(theme.colors).slice(0, 6).map(([key, color]) => (
                        <div
                          key={key}
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右侧：自定义主题 */}
          <div className="w-1/2 p-4 overflow-y-auto">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <SparklesIcon className="w-4 h-4 mr-2" />
              自定义主题
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">主题名称</label>
                <input
                  type="text"
                  value={customTheme.name}
                  onChange={(e) => setCustomTheme(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                  placeholder="输入主题名称"
                  className="input w-full"
                />
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">颜色配置</h4>

                <ColorPicker
                  label="主色"
                  value={customTheme.colors.primary}
                  onChange={(color) => setCustomTheme(prev => ({
                    ...prev,
                    colors: { ...prev.colors, primary: color }
                  }))}
                />

                <ColorPicker
                  label="次色"
                  value={customTheme.colors.secondary}
                  onChange={(color) => setCustomTheme(prev => ({
                    ...prev,
                    colors: { ...prev.colors, secondary: color }
                  }))}
                />

                <ColorPicker
                  label="强调色"
                  value={customTheme.colors.accent}
                  onChange={(color) => setCustomTheme(prev => ({
                    ...prev,
                    colors: { ...prev.colors, accent: color }
                  }))}
                />

                <ColorPicker
                  label="背景色"
                  value={customTheme.colors.background}
                  onChange={(color) => setCustomTheme(prev => ({
                    ...prev,
                    colors: { ...prev.colors, background: color }
                  }))}
                />

                <ColorPicker
                  label="表面色"
                  value={customTheme.colors.surface}
                  onChange={(color) => setCustomTheme(prev => ({
                    ...prev,
                    colors: { ...prev.colors, surface: color }
                  }))}
                />

                <ColorPicker
                  label="文本色"
                  value={customTheme.colors.text}
                  onChange={(color) => setCustomTheme(prev => ({
                    ...prev,
                    colors: { ...prev.colors, text: color }
                  }))}
                />

                <ColorPicker
                  label="边框色"
                  value={customTheme.colors.border}
                  onChange={(color) => setCustomTheme(prev => ({
                    ...prev,
                    colors: { ...prev.colors, border: color }
                  }))}
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={saveCustomTheme}
                  className="btn btn-primary w-full"
                  disabled={!customTheme.name.trim()}
                >
                  保存自定义主题
                </button>
              </div>

              {/* 预览区域 */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-700 mb-2">预览</h4>
                <div
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: customTheme.colors.background,
                    borderColor: customTheme.colors.border,
                    color: customTheme.colors.text
                  }}
                >
                  <div
                    className="text-lg font-medium"
                    style={{ color: customTheme.colors.primary }}
                  >
                    标题文本
                  </div>
                  <div
                    className="text-sm mt-1"
                    style={{ color: customTheme.colors.textSecondary }}
                  >
                    这是预览文本，展示主题效果
                  </div>
                  <div
                    className="mt-2 px-3 py-1 rounded text-sm inline-block"
                    style={{
                      backgroundColor: customTheme.colors.accent,
                      color: customTheme.colors.background
                    }}
                  >
                    强调元素
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            当前主题: {themes.find(t => t.id === selectedTheme)?.name || '未选择'}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThemeManager