import React, { useState, useEffect } from 'react'
import {
  XMarkIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  Cog6ToothIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const ExportDialog = ({
  isOpen,
  onClose,
  onExport,
  currentDocument,
  isExporting = false,
  exportProgress = 0
}) => {
  const [exportSettings, setExportSettings] = useState({
    include_theme: true,
    page_size: 'A4',
    margin_top: 20,
    margin_bottom: 20,
    margin_left: 20,
    margin_right: 20,
    font_size: 12
  })

  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  // 加载导出设置
  useEffect(() => {
    if (isOpen) {
      loadExportSettings()
    }
  }, [isOpen])

  const loadExportSettings = async () => {
    try {
      const response = await fetch('/api/export/settings')
      if (response.ok) {
        const data = await response.json()
        setExportSettings(data.data)
      }
    } catch (error) {
      console.error('加载导出设置失败:', error)
    }
  }

  // 保存导出设置
  const saveExportSettings = async (settings) => {
    try {
      const response = await fetch('/api/export/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        throw new Error('保存设置失败')
      }

      return true
    } catch (error) {
      console.error('保存导出设置失败:', error)
      toast.error('保存设置失败')
      return false
    }
  }

  // 预览PDF内容
  const handlePreview = async () => {
    if (!currentDocument.content.trim()) {
      toast.error('文档内容为空')
      return
    }

    setIsLoadingPreview(true)
    try {
      const response = await fetch('/api/export/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: currentDocument.content,
          includeTheme: exportSettings.include_theme
        })
      })

      if (response.ok) {
        const htmlContent = await response.text()
        setPreviewHtml(htmlContent)
        setShowPreview(true)
      } else {
        throw new Error('生成预览失败')
      }
    } catch (error) {
      console.error('预览失败:', error)
      toast.error('预览失败')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // 导出PDF
  const handleExport = async () => {
    if (!currentDocument.content.trim()) {
      toast.error('文档内容为空')
      return
    }

    // 先保存设置
    const saved = await saveExportSettings(exportSettings)
    if (!saved) return

    // 执行导出
    onExport(exportSettings)
  }

  // 重置设置
  const handleReset = () => {
    setExportSettings({
      include_theme: true,
      page_size: 'A4',
      margin_top: 20,
      margin_bottom: 20,
      margin_left: 20,
      margin_right: 20,
      font_size: 12
    })
  }

  // 更新设置
  const updateSetting = (key, value) => {
    setExportSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <DocumentArrowDownIcon className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                PDF导出设置
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={isExporting}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* 内容 */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="space-y-6">
              {/* 基本设置 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  基本设置
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      包含主题样式
                    </span>
                    <input
                      type="checkbox"
                      checked={exportSettings.include_theme}
                      onChange={(e) => updateSetting('include_theme', e.target.checked)}
                      className="form-checkbox h-4 w-4 text-blue-600 rounded"
                      disabled={isExporting}
                    />
                  </label>

                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    包含当前主题的颜色、字体和背景样式
                  </div>
                </div>
              </div>

              {/* 页面设置 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  页面设置
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <label>
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      页面大小
                    </span>
                    <select
                      value={exportSettings.page_size}
                      onChange={(e) => updateSetting('page_size', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      disabled={isExporting}
                    >
                      <option value="A4">A4</option>
                      <option value="A3">A3</option>
                      <option value="A5">A5</option>
                      <option value="Letter">Letter</option>
                      <option value="Legal">Legal</option>
                    </select>
                  </label>

                  <label>
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      字体大小 (px)
                    </span>
                    <input
                      type="number"
                      min="8"
                      max="24"
                      value={exportSettings.font_size}
                      onChange={(e) => updateSetting('font_size', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      disabled={isExporting}
                    />
                  </label>
                </div>
              </div>

              {/* 边距设置 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  页边距 (mm)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <label>
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      上边距
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={exportSettings.margin_top}
                      onChange={(e) => updateSetting('margin_top', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      disabled={isExporting}
                    />
                  </label>

                  <label>
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      下边距
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={exportSettings.margin_bottom}
                      onChange={(e) => updateSetting('margin_bottom', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      disabled={isExporting}
                    />
                  </label>

                  <label>
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      左边距
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={exportSettings.margin_left}
                      onChange={(e) => updateSetting('margin_left', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      disabled={isExporting}
                    />
                  </label>

                  <label>
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      右边距
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={exportSettings.margin_right}
                      onChange={(e) => updateSetting('margin_right', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      disabled={isExporting}
                    />
                  </label>
                </div>
              </div>

              {/* 预设模板 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  快速预设
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setExportSettings(prev => ({
                      ...prev,
                      margin_top: 15,
                      margin_bottom: 15,
                      margin_left: 15,
                      margin_right: 15,
                      font_size: 11
                    }))}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
                    disabled={isExporting}
                  >
                    紧凑
                  </button>
                  <button
                    onClick={() => setExportSettings(prev => ({
                      ...prev,
                      margin_top: 20,
                      margin_bottom: 20,
                      margin_left: 20,
                      margin_right: 20,
                      font_size: 12
                    }))}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
                    disabled={isExporting}
                  >
                    标准
                  </button>
                  <button
                    onClick={() => setExportSettings(prev => ({
                      ...prev,
                      margin_top: 30,
                      margin_bottom: 30,
                      margin_left: 25,
                      margin_right: 25,
                      font_size: 14
                    }))}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
                    disabled={isExporting}
                  >
                    宽松
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 导出进度 */}
          {isExporting && (
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>导出进度</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 底部操作 */}
          <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex space-x-2">
              <button
                onClick={handlePreview}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isExporting || isLoadingPreview}
              >
                <EyeIcon className="w-4 h-4 mr-2" />
                {isLoadingPreview ? '生成中...' : '预览'}
              </button>

              <button
                onClick={handleReset}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isExporting}
              >
                <Cog6ToothIcon className="w-4 h-4 mr-2" />
                重置
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isExporting}
              >
                取消
              </button>
              <button
                onClick={handleExport}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isExporting || !currentDocument.content.trim()}
              >
                <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                {isExporting ? '导出中...' : '导出PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 预览窗口 */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                PDF预览
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(95vh-80px)]">
              <div
                className="bg-white shadow-lg mx-auto"
                style={{
                  width: exportSettings.page_size === 'A4' ? '210mm' :
                         exportSettings.page_size === 'A3' ? '297mm' : '216mm',
                  minHeight: exportSettings.page_size === 'A4' ? '297mm' :
                            exportSettings.page_size === 'A3' ? '420mm' : '279mm',
                  transform: 'scale(0.7)',
                  transformOrigin: 'top center'
                }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ExportDialog