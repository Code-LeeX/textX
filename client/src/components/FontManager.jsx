import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import useAppStore from '@store/useAppStore'
import {
  DocumentTextIcon,
  AdjustmentsHorizontalIcon,
  CloudArrowUpIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

const FontManager = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useAppStore()
  const [fonts, setFonts] = useState([])
  const [selectedFont, setSelectedFont] = useState(settings.font_family || 'Inter')
  const [fontSize, setFontSize] = useState(settings.font_size || 14)
  const [lineHeight, setLineHeight] = useState(settings.line_height || 1.6)
  const [letterSpacing, setLetterSpacing] = useState(settings.letter_spacing || 0)
  const [isLoading, setIsLoading] = useState(false)
  const [customFontFile, setCustomFontFile] = useState(null)
  const [previewText, setPreviewText] = useState(`# 字体预览
这是一个**粗体文本**和*斜体文本*的示例。

代码示例：\`console.log('Hello World')\`

> 引用文本示例
> 第二行引用

1. 有序列表项目一
2. 有序列表项目二

- 无序列表项目
- 另一个列表项目

Lorem ipsum dolor sit amet, consectetur adipiscing elit. 中文混排测试文本。`)

  // 预设字体列表
  const presetFonts = [
    {
      id: 'inter',
      name: 'Inter',
      family: 'Inter, sans-serif',
      type: 'web',
      category: 'sans-serif',
      description: '现代无衬线字体，适合长文本阅读'
    },
    {
      id: 'system-ui',
      name: '系统默认',
      family: 'system-ui, -apple-system, sans-serif',
      type: 'system',
      category: 'sans-serif',
      description: '使用系统默认字体'
    },
    {
      id: 'georgia',
      name: 'Georgia',
      family: 'Georgia, serif',
      type: 'web',
      category: 'serif',
      description: '经典衬线字体，适合正式文档'
    },
    {
      id: 'times',
      name: 'Times New Roman',
      family: '"Times New Roman", serif',
      type: 'web',
      category: 'serif',
      description: '传统衬线字体'
    },
    {
      id: 'fira-code',
      name: 'Fira Code',
      family: '"Fira Code", monospace',
      type: 'web',
      category: 'monospace',
      description: '编程字体，支持连字'
    },
    {
      id: 'jetbrains-mono',
      name: 'JetBrains Mono',
      family: '"JetBrains Mono", monospace',
      type: 'web',
      category: 'monospace',
      description: '现代编程字体'
    },
    {
      id: 'source-han-sans',
      name: '思源黑体',
      family: '"Source Han Sans SC", "Noto Sans CJK SC", sans-serif',
      type: 'web',
      category: 'sans-serif',
      description: '适合中文的无衬线字体'
    },
    {
      id: 'source-han-serif',
      name: '思源宋体',
      family: '"Source Han Serif SC", "Noto Serif CJK SC", serif',
      type: 'web',
      category: 'serif',
      description: '适合中文的衬线字体'
    }
  ]

  // 加载字体列表
  const loadFonts = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/fonts')
      if (response.ok) {
        const customFonts = await response.json()
        const loadedCustomFonts = await fontLoader.loadFonts(customFonts.data);
        setFonts([...presetFonts, ...loadedCustomFonts])
      } else {
        setFonts(presetFonts)
      }
    } catch (error) {
      console.error('加载字体失败:', error)
      setFonts(presetFonts)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 初始化
  useEffect(() => {
      loadFonts()
  }, [])

  // 应用字体设置
  const applyFontSettings = useCallback(() => {
    const fontConfig = {
      font_family: selectedFont,
      font_size: fontSize,
      line_height: lineHeight,
      letter_spacing: letterSpacing
    }

    updateSettings(fontConfig)

    // 立即应用到文档
    const root = document.documentElement
    root.style.setProperty('--font-family', selectedFont)
    root.style.setProperty('--font-size', `${fontSize}px`)
    root.style.setProperty('--line-height', lineHeight)
    root.style.setProperty('--letter-spacing', `${letterSpacing}px`)

    toast.success('字体设置已应用')
  }, [selectedFont, fontSize, lineHeight, letterSpacing, updateSettings])

  // 选择字体
  const selectFont = useCallback((fontFamily) => {
    setSelectedFont(fontFamily)
  }, [])

  // 重置为默认设置
  const resetToDefault = useCallback(() => {
    setSelectedFont('Inter, sans-serif')
    setFontSize(14)
    setLineHeight(1.6)
    setLetterSpacing(0)
  }, [])

  // 上传自定义字体
  const uploadCustomFont = useCallback(async () => {
    if (!customFontFile) {
      toast.error('请选择字体文件')
      return
    }

    const formData = new FormData()
    formData.append('font', customFontFile)
    formData.append('name', customFontFile.name.split('.')[0])
    formData.append('family', customFontFile.name.split('.')[0])
    try {
      const response = await fetch('/api/fonts/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const newFont = await response.json()
        setFonts(prev => [...prev, newFont])
        setCustomFontFile(null)
        toast.success('字体上传成功')
      } else {
        throw new Error('上传失败')
      }
    } catch (error) {
      console.error('上传字体失败:', error)
      toast.error('上传字体失败')
    }
  }, [customFontFile])

  // 删除自定义字体
  const deleteFont = useCallback(async (fontId) => {
    try {
      const response = await fetch(`/api/fonts/${fontId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setFonts(prev => prev.filter(f => f.id !== fontId))
        toast.success('字体删除成功')
      } else {
        throw new Error('删除失败')
      }
    } catch (error) {
      console.error('删除字体失败:', error)
      toast.error('删除字体失败')
    }
  }, [])

  // 获取字体类别颜色
  const getCategoryColor = (category) => {
    switch (category) {
      case 'sans-serif':
        return 'bg-blue-100 text-blue-800'
      case 'serif':
        return 'bg-purple-100 text-purple-800'
      case 'monospace':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <DocumentTextIcon className="w-5 h-5 mr-2" />
            字体管理
          </h2>
          <button
            onClick={onClose}
            className="btn-icon btn-ghost"
          >
            ✕
          </button>
        </div>

        <div className="flex h-[700px]">
          {/* 左侧：字体列表 */}
          <div className="w-1/3 border-r border-gray-200 p-4 overflow-y-auto">
            <h3 className="font-medium text-gray-900 mb-4">字体选择</h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {fonts.map((font) => (
                  <div
                    key={font.id}
                    className={`
                      relative p-3 rounded-lg border cursor-pointer transition-all
                      ${selectedFont === font.family
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                    onClick={() => selectFont(font.family)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900" style={{ fontFamily: font.family }}>
                        {font.name}
                      </div>
                      {font.type === 'custom' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteFont(font.id)
                          }}
                          className="btn-icon btn-ghost text-red-500 hover:bg-red-50"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(font.category)}`}>
                        {font.category}
                      </span>
                      <span className="text-xs text-gray-500">
                        {font.type === 'web' ? 'Web字体' : font.type === 'system' ? '系统字体' : '自定义'}
                      </span>
                    </div>

                    {font.description && (
                      <div className="text-xs text-gray-600 mt-2">
                        {font.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 上传自定义字体 */}
            <div className="mt-6 pt-4 border-t border-gray-200" style={{height: 180}}>
              <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                <CloudArrowUpIcon className="w-4 h-4 mr-2" />
                上传字体
              </h4>
              <input
                type="file"
                accept=".woff,.woff2,.ttf,.otf"
                onChange={(e) => setCustomFontFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              {customFontFile && (
                <button
                  onClick={uploadCustomFont}
                  className="btn btn-primary btn-sm mt-2 w-full"
                >
                  上传字体
                </button>
              )}
            </div>
          </div>

          {/* 中间：设置面板 */}
          <div className="w-1/3 border-r border-gray-200 p-4 overflow-y-auto">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <AdjustmentsHorizontalIcon className="w-4 h-4 mr-2" />
              字体设置
            </h3>

            <div className="space-y-6">
              {/* 字号设置 */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  字号: {fontSize}px
                </label>
                <input
                  type="range"
                  min="10"
                  max="24"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>10px</span>
                  <span>24px</span>
                </div>
              </div>

              {/* 行高设置 */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  行高: {lineHeight}
                </label>
                <input
                  type="range"
                  min="1.2"
                  max="2.5"
                  step="0.1"
                  value={lineHeight}
                  onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1.2</span>
                  <span>2.5</span>
                </div>
              </div>

              {/* 字间距设置 */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  字间距: {letterSpacing}px
                </label>
                <input
                  type="range"
                  min="-1"
                  max="3"
                  step="0.1"
                  value={letterSpacing}
                  onChange={(e) => setLetterSpacing(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>-1px</span>
                  <span>3px</span>
                </div>
              </div>

              {/* 预览文本设置 */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">预览文本</label>
                <textarea
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  rows={6}
                  className="input w-full text-sm"
                  placeholder="输入预览文本..."
                />
              </div>

              {/* 操作按钮 */}
              <div className="space-y-2">
                <button
                  onClick={applyFontSettings}
                  className="btn btn-primary w-full"
                >
                  应用设置
                </button>
                <button
                  onClick={resetToDefault}
                  className="btn btn-secondary w-full"
                >
                  恢复默认
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：预览区域 */}
          <div className="w-1/3 p-4 overflow-y-auto">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <EyeIcon className="w-4 h-4 mr-2" />
              实时预览
            </h3>

            <div
              className="prose prose-sm max-w-none p-4 border border-gray-200 rounded-lg"
              style={{
                fontFamily: selectedFont,
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                letterSpacing: `${letterSpacing}px`
              }}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: previewText.replace(/\n/g, '<br>')
                }}
              />
            </div>

            {/* 字体信息 */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
              <div className="font-medium text-gray-700 mb-2">当前字体设置</div>
              <div className="space-y-1 text-gray-600">
                <div>字体: {fonts.find(f => f.family === selectedFont)?.name || '未知'}</div>
                <div>字号: {fontSize}px</div>
                <div>行高: {lineHeight}</div>
                <div>字间距: {letterSpacing}px</div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            当前字体: {fonts.find(f => f.family === selectedFont)?.name || '未选择'}
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

export default FontManager


class FontLoader {
  constructor() {
    this.loadedFonts = new Map(); // 缓存已加载的字体
  }

  // 加载字体并返回字体家族名称
  async loadFont(font) {
    // 如果是预设字体，直接返回字体家族
    if (font.type === 'web' || font.type === 'system') {
      return font.family;
    }
    
    // 如果是自定义字体，检查是否已加载
    if (this.loadedFonts.has(font.id)) {
      return this.loadedFonts.get(font.id);
    }
    
    try {
      // 为自定义字体生成唯一的字体家族名称
      const fontFamily = `CustomFont-${font.id}`;
      
      // 加载字体文件
      const fontUrl = `/api/fonts/${font.id}/file`;
      const fontFace = new FontFace(
        fontFamily,
        `url(${fontUrl})`,
        { style: 'normal', weight: '400' }
      );
      
      // 等待字体加载
      const loadedFont = await fontFace.load();
      document.fonts.add(loadedFont);
      
      // 缓存已加载的字体
      this.loadedFonts.set(font.id, fontFamily);
      
      return fontFamily;
      
    } catch (error) {
      console.error('加载字体失败:', error);
      // 如果加载失败，返回默认字体
      return font.family || 'Inter, sans-serif';
    }
  }

  // 批量加载字体
  async loadFonts(fonts) {
    const results = [];
    for (const font of fonts) {
      if (font.has_file) {
        try {
          const fontFamily = await this.loadFont(font);
          results.push({ ...font, family: fontFamily });
        } catch (error) {
          console.error(`字体 ${font.name} 加载失败:`, error);
          results.push(font);
        }
      } else {
        results.push(font);
      }
    }
    return results;
  }

  // 清理不再使用的字体
  cleanup() {
    // 这里可以添加字体清理逻辑
    // 注意：浏览器中的 FontFace 一旦加载，就不能直接卸载
  }
}

export const fontLoader = new FontLoader();