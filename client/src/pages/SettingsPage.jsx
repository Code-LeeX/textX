import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import useAppStore from '@store/useAppStore'
import useTheme from '@hooks/useTheme.jsx'
import ThemeManager from '@components/ThemeManager'
import FontManager from '@components/FontManager'

import {
  XMarkIcon,
  ArrowLeftIcon,
  PaintBrushIcon,
  DocumentTextIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'

const SettingsPage = () => {
  const navigate = useNavigate()
  const { settings, updateSettings } = useAppStore()
  const { themes, currentTheme, activateTheme, isLoading: themesLoading } = useTheme()

  const [localSettings, setLocalSettings] = useState(settings)
  const [activeTab, setActiveTab] = useState('general')
  const [showThemeManager, setShowThemeManager] = useState(false)
  const [showFontManager, setShowFontManager] = useState(false)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  // 保存设置
  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          settings: Object.entries(localSettings).reduce((acc, [key, value]) => {
            acc[key] = {
              value,
              type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string'
            }
            return acc
          }, {})
        })
      })

      if (response.ok) {
        updateSettings(localSettings)
        toast.success('设置保存成功')
      } else {
        throw new Error('保存失败')
      }
    } catch (error) {
      console.error('保存设置失败:', error)
      toast.error('保存设置失败')
    }
  }

  // 重置设置
  const handleResetSettings = async () => {
    try {
      const response = await fetch('/api/settings/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // 重新加载页面以获取默认设置
        window.location.reload()
        toast.success('设置已重置')
      } else {
        throw new Error('重置失败')
      }
    } catch (error) {
      console.error('重置设置失败:', error)
      toast.error('重置设置失败')
    }
  }

  const tabs = [
    { id: 'general', name: '常规', icon: '⚙️' },
    { id: 'editor', name: '编辑器', icon: '📝' },
    { id: 'theme', name: '主题', icon: '🎨' },
    { id: 'security', name: '安全', icon: '🔐' },
    { id: 'export', name: '导出', icon: '📤' }
  ]

  return (
    <div className="h-screen flex bg-gray-50">
      {/* 侧边栏 */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">设置</h1>
            <button
              onClick={() => navigate('/')}
              className="btn-icon btn-ghost"
              title="返回编辑器"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors mb-1
                ${activeTab === tab.id
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <span className="mr-3">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSaveSettings}
            className="btn btn-primary w-full mb-2"
          >
            保存设置
          </button>
          <button
            onClick={handleResetSettings}
            className="btn btn-secondary w-full"
          >
            重置设置
          </button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">常规设置</h2>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="font-medium">语言设置</h3>
                </div>
                <div className="card-content">
                  <label className="flex items-center justify-between">
                    <span>界面语言</span>
                    <select
                      value={localSettings.language || 'zh-CN'}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, language: e.target.value }))}
                      className="input w-40"
                    >
                      <option value="zh-CN">简体中文</option>
                      <option value="en-US">English</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="font-medium">应用行为</h3>
                </div>
                <div className="card-content space-y-4">
                  <label className="flex items-center justify-between">
                    <span>自动保存</span>
                    <input
                      type="checkbox"
                      checked={localSettings.auto_save || false}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, auto_save: e.target.checked }))}
                      className="form-checkbox"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">编辑器设置</h2>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">字体设置</h3>
                    <button
                      onClick={() => setShowFontManager(true)}
                      className="btn btn-secondary btn-sm flex items-center"
                    >
                      <DocumentTextIcon className="w-4 h-4 mr-2" />
                      高级字体管理
                    </button>
                  </div>
                </div>
                <div className="card-content space-y-4">
                  <label className="flex items-center justify-between">
                    <span>字体族</span>
                    <select
                      value={localSettings.font_family || 'Inter, sans-serif'}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, font_family: e.target.value }))}
                      className="input w-48"
                    >
                      <option value="Inter, sans-serif">Inter</option>
                      <option value="system-ui, sans-serif">系统默认</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="'Times New Roman', serif">Times New Roman</option>
                      <option value="'Source Han Sans SC', sans-serif">思源黑体</option>
                      <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                    </select>
                  </label>

                  <label className="flex items-center justify-between">
                    <span>字体大小</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="12"
                        max="24"
                        value={localSettings.font_size || 14}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, font_size: parseInt(e.target.value) }))}
                        className="w-32"
                      />
                      <span className="text-sm text-gray-500 w-12">{localSettings.font_size || 14}px</span>
                    </div>
                  </label>

                  <label className="flex items-center justify-between">
                    <span>行高</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="1.2"
                        max="2.5"
                        step="0.1"
                        value={localSettings.line_height || 1.6}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, line_height: parseFloat(e.target.value) }))}
                        className="w-32"
                      />
                      <span className="text-sm text-gray-500 w-12">{localSettings.line_height || 1.6}</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="font-medium">编辑器行为</h3>
                </div>
                <div className="card-content space-y-4">
                  <label className="flex items-center justify-between">
                    <span>显示行号</span>
                    <input
                      type="checkbox"
                      checked={localSettings.show_line_numbers || false}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, show_line_numbers: e.target.checked }))}
                      className="form-checkbox"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span>自动换行</span>
                    <input
                      type="checkbox"
                      checked={localSettings.word_wrap || false}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, word_wrap: e.target.checked }))}
                      className="form-checkbox"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span>同步滚动</span>
                    <input
                      type="checkbox"
                      checked={localSettings.sync_scroll || false}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, sync_scroll: e.target.checked }))}
                      className="form-checkbox"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span>默认显示目录</span>
                    <input
                      type="checkbox"
                      checked={localSettings.show_toc !== false}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, show_toc: e.target.checked }))}
                      className="form-checkbox"
                    />
                  </label>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="font-medium">目录设置</h3>
                </div>
                <div className="card-content space-y-4">
                  <label className="flex items-center justify-between">
                    <span>目录位置</span>
                    <select
                      value={localSettings.toc_position || 'right'}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, toc_position: e.target.value }))}
                      className="input w-32"
                    >
                      <option value="left">左侧</option>
                      <option value="right">右侧</option>
                      <option value="floating">浮动</option>
                    </select>
                  </label>

                  <label className="flex items-center justify-between">
                    <span>自动展开级别</span>
                    <select
                      value={localSettings.toc_auto_expand || '2'}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, toc_auto_expand: e.target.value }))}
                      className="input w-32"
                    >
                      <option value="1">仅一级标题</option>
                      <option value="2">到二级标题</option>
                      <option value="3">到三级标题</option>
                      <option value="all">全部展开</option>
                    </select>
                  </label>

                  <div className="text-sm text-gray-600">
                    目录会根据Markdown标题自动生成，支持平滑滚动导航
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">主题设置</h2>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">选择主题</h3>
                    <button
                      onClick={() => setShowThemeManager(true)}
                      className="btn btn-secondary btn-sm flex items-center"
                    >
                      <PaintBrushIcon className="w-4 h-4 mr-2" />
                      高级主题管理
                    </button>
                  </div>
                </div>
                <div className="card-content">
                  {themesLoading ? (
                    <div className="text-center py-4">加载主题中...</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {themes.slice(0, 4).map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => activateTheme(theme.id)}
                          className={`
                            p-4 rounded-lg border-2 transition-all text-left
                            ${currentTheme?.id === theme.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{theme.display_name}</h4>
                            {currentTheme?.id === theme.id && (
                              <span className="text-primary-600">✓</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: theme.background_color }}
                            />
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: theme.text_color }}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {themes.length > 4 && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setShowThemeManager(true)}
                        className="btn btn-ghost btn-sm"
                      >
                        查看全部 {themes.length} 个主题
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="font-medium">主题设置</h3>
                </div>
                <div className="card-content space-y-4">
                  <label className="flex items-center justify-between">
                    <span>自动切换主题</span>
                    <input
                      type="checkbox"
                      checked={localSettings.auto_theme || false}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, auto_theme: e.target.checked }))}
                      className="form-checkbox"
                    />
                  </label>
                  <div className="text-sm text-gray-600">
                    自动根据系统深色/浅色模式切换主题
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">安全设置</h2>
              </div>

            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">导出设置</h2>
                <p className="text-gray-600">配置PDF导出的默认设置，可在导出时进行调整</p>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="font-medium">PDF导出</h3>
                </div>
                <div className="card-content space-y-4">
                  <label className="flex items-center justify-between">
                    <span>页面大小</span>
                    <select
                      value={localSettings.export_page_size || 'A4'}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, export_page_size: e.target.value }))}
                      className="input w-32"
                    >
                      <option value="A4">A4</option>
                      <option value="A3">A3</option>
                      <option value="A5">A5</option>
                      <option value="Letter">Letter</option>
                      <option value="Legal">Legal</option>
                    </select>
                  </label>

                  <label className="flex items-center justify-between">
                    <span>默认包含主题样式</span>
                    <input
                      type="checkbox"
                      checked={localSettings.export_include_theme !== false}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, export_include_theme: e.target.checked }))}
                      className="form-checkbox"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span>默认字体大小 (px)</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="8"
                        max="24"
                        value={localSettings.export_font_size || 12}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, export_font_size: parseInt(e.target.value) }))}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-500 w-8">{localSettings.export_font_size || 12}</span>
                    </div>
                  </label>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">默认页边距 (mm)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <label>
                        <span className="text-sm text-gray-600">上边距</span>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={localSettings.export_margin_top || 20}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, export_margin_top: parseInt(e.target.value) }))}
                          className="input w-full"
                        />
                      </label>
                      <label>
                        <span className="text-sm text-gray-600">下边距</span>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={localSettings.export_margin_bottom || 20}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, export_margin_bottom: parseInt(e.target.value) }))}
                          className="input w-full"
                        />
                      </label>
                      <label>
                        <span className="text-sm text-gray-600">左边距</span>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={localSettings.export_margin_left || 20}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, export_margin_left: parseInt(e.target.value) }))}
                          className="input w-full"
                        />
                      </label>
                      <label>
                        <span className="text-sm text-gray-600">右边距</span>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={localSettings.export_margin_right || 20}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, export_margin_right: parseInt(e.target.value) }))}
                          className="input w-full"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-5 h-5 text-blue-600 mt-0.5">
                        💡
                      </div>
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">导出提示</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>这些是默认设置，可在每次导出时调整</li>
                          <li>包含主题样式会保持当前的颜色和字体</li>
                          <li>建议使用标准页边距以获得最佳打印效果</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="font-medium">导出历史</h3>
                </div>
                <div className="card-content">
                  <label className="flex items-center justify-between">
                    <span>保存导出记录</span>
                    <input
                      type="checkbox"
                      checked={localSettings.save_export_history !== false}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, save_export_history: e.target.checked }))}
                      className="form-checkbox"
                    />
                  </label>
                  <div className="text-sm text-gray-600 mt-2">
                    自动记录导出的文档以便快速重新导出
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 主题管理对话框 */}
      <ThemeManager
        isOpen={showThemeManager}
        onClose={() => setShowThemeManager(false)}
      />

      {/* 字体管理对话框 */}
      <FontManager
        isOpen={showFontManager}
        onClose={() => setShowFontManager(false)}
      />
    </div>
  )
}

export default SettingsPage