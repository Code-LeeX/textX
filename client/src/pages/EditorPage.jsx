import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import toast from 'react-hot-toast'

import MarkdownEditor from '@components/MarkdownEditor'
import MarkdownPreview from '@components/MarkdownPreview'
import EncryptionManager, {
  needsPassword,
  formatEncryptedForSave,
  parseEncryptedFromSave
} from '@components/EncryptionManager'
import SaveDialog from '@components/SaveDialog'
import ThemeManager from '@components/ThemeManager'
import FontManager from '@components/FontManager'
import TableOfContents from '@components/TableOfContents'
import ExportDialog from '@components/ExportDialog'
import useAppStore from '@store/useAppStore'
import useTheme from '@hooks/useTheme.jsx'
import useTOC from '@hooks/useTOC'
import { isEncryptedData } from '@utils/encryption'

// 图标组件
import {
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  Squares2X2Icon,
  Cog6ToothIcon,
  DocumentArrowDownIcon,
  PaintBrushIcon,
  AdjustmentsHorizontalIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline'

const EditorPage = () => {
  const {
    currentDocument,
    viewMode,
    settings,
    setDocumentContent,
    setViewMode,
    toggleViewMode,
    setDocumentInfo,
    markDocumentSaved,
    getDocumentStats,
    setLoading
  } = useAppStore()

  const { currentTheme } = useTheme()

  // TOC 功能
  const {
    headings,
    activeHeading,
    isVisible: tocVisible,
    toggleVisibility: toggleTOC,
    scrollToHeading
  } = useTOC(currentDocument.content, settings.show_toc !== false)

  const [editorScrollTop, setEditorScrollTop] = useState(0)
  const [previewScrollTop, setPreviewScrollTop] = useState(0)

  // 加密相关状态
  const [encryptionDialog, setEncryptionDialog] = useState({
    isOpen: false,
    mode: 'decrypt', // 'encrypt', 'decrypt', 'verify'
    content: '',
    encryptedData: null,
    pendingAction: null // 待执行的操作
  })

  // 主题和字体管理状态
  const [showThemeManager, setShowThemeManager] = useState(false)
  const [showFontManager, setShowFontManager] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  const autoSaveTimeoutRef = useRef(null)
  const currentPasswordRef = useRef(null) // 用于存储当前文档密码

  // 文档统计
  const documentStats = getDocumentStats()

  // 初始化
  useEffect(() => {
    setLoading(false)
  }, [setLoading])

  // 处理内容变化
  const handleContentChange = useCallback((newContent) => {
    setDocumentContent(newContent)

    // 自动保存
    if (settings.auto_save && currentDocument.filePath) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        // 自动保存保持原有的加密设置
        if (currentDocument.isEncrypted && currentPasswordRef.current) {
          handleSaveDocument('custom', currentPasswordRef.current, true)
        } else {
          handleSaveDocument('normal', null, true)
        }
      }, 60000) // 60秒后自动保存
    }
  }, [currentDocument.content, currentDocument.filePath, currentDocument.isEncrypted, settings.auto_save])

  // 处理编辑器滚动
  const handleEditorScroll = useCallback((scrollTop) => {
    setEditorScrollTop(scrollTop)
    if (settings.sync_scroll) {
      setPreviewScrollTop(scrollTop)
    }
  }, [settings.sync_scroll])

  // 处理预览滚动
  const handlePreviewScroll = useCallback((scrollTop) => {
    setPreviewScrollTop(scrollTop)
    if (settings.sync_scroll) {
      setEditorScrollTop(scrollTop)
    }
  }, [settings.sync_scroll])

  // 新建文档
  const handleNewDocument = useCallback(async () => {
    setDocumentContent('')
    setDocumentInfo({
      filePath: null,
      fileName: 'untitled.md',
      fileHandle: null,
      isModified: false,
      isEncrypted: false,
      lastSaved: null
    })

    toast.success('新建文档成功')
  }, [setDocumentContent, setDocumentInfo])

  // 打开文档
  const handleOpenDocument = useCallback(async () => {
    try {
      // 使用浏览器的文件选择API
      const fileHandle = await window.showOpenFilePicker({
        types: [{
          description: 'Text files',
          accept: {
            'text/plain': ['.txt', '.md', '.markdown']
          }
        }]
      })

      const file = await fileHandle[0].getFile()
      const content = await file.text()

      // 检查是否是加密文件
      const encryptedData = parseEncryptedFromSave(content)

      if (encryptedData) {
        // 加密文件，先尝试用默认密钥解密
        try {
          const { decryptText, getDefaultPassword } = await import('@utils/encryption')
          const defaultPassword = getDefaultPassword()
          const decryptedContent = await decryptText(encryptedData, defaultPassword)

          // 默认密钥解密成功
          setDocumentContent(decryptedContent)
          setDocumentInfo({
            filePath: file.name,
            fileName: file.name,
            fileHandle: fileHandle[0],
            isModified: false,
            isEncrypted: true,
            lastSaved: new Date(file.lastModified).toISOString()
          })
          currentPasswordRef.current = defaultPassword
          toast.success('加密文档打开成功（使用默认密钥）')

        } catch (defaultDecryptError) {
          // 默认密钥解密失败，要求用户输入密码
          console.log('默认密钥解密失败，要求用户输入密码')
          setEncryptionDialog({
            isOpen: true,
            mode: 'decrypt',
            content: '',
            encryptedData: encryptedData,
            pendingAction: {
              type: 'open',
              fileInfo: {
                fileName: file.name,
                filePath: file.name,
                lastModified: file.lastModified
              },
              fileHandle: fileHandle[0]
            }
          })
        }
      } else {
        // 普通文本文件
        setDocumentContent(content)
        setDocumentInfo({
          filePath: file.name,
          fileName: file.name,
          fileHandle: fileHandle[0],
          isModified: false,
          isEncrypted: false,
          lastSaved: new Date(file.lastModified).toISOString()
        })
        currentPasswordRef.current = null
        toast.success('文档打开成功')
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('打开文档失败:', error)
        toast.error('打开文档失败')
      }
    }
  }, [setDocumentContent, setDocumentInfo])

  // 保存文档
  const handleSaveDocument = useCallback(async (saveMode = null, password = null, isAutoSave = false) => {
    if (!currentDocument.content.trim()) {
      toast.error('文档内容为空')
      return
    }

    try {
      // 如果没有指定保存模式，显示保存对话框
      if (saveMode == null) {
        setShowSaveDialog(true)
        return
      }

      let contentToSave = currentDocument.content
      let fileExtension = '.md'
      let isEncrypted = false

      // 根据保存模式处理
      if (saveMode === 'default' || saveMode === 'custom') {
        let finalPassword = password

        if (saveMode === 'default') {
          // 使用默认密钥
          const { getDefaultPassword } = await import('@utils/encryption')
          finalPassword = getDefaultPassword()
        }

        // 加密内容
        const { encryptText } = await import('@utils/encryption')
        const encryptedData = await encryptText(currentDocument.content, finalPassword)
        contentToSave = formatEncryptedForSave(encryptedData)
        fileExtension = '.enc.md'
        isEncrypted = true
        currentPasswordRef.current = finalPassword
      }

      if (!currentDocument.filePath) {
        // 另存为
        const suggestedName = currentDocument.fileName
          ? currentDocument.fileName.replace(/\.[^/.]+$/, fileExtension)
          : `untitled${fileExtension}`

        const fileHandle = await window.showSaveFilePicker({
          suggestedName,
          types: [{
            description: isEncrypted ? 'Encrypted Markdown files' : 'Markdown files',
            accept: {
              'text/markdown': isEncrypted ? ['.enc.md'] : ['.md', '.markdown']
            }
          }]
        })

        const writable = await fileHandle.createWritable()
        await writable.write(contentToSave)
        await writable.close()

        setDocumentInfo({
          filePath: fileHandle.name,
          fileName: fileHandle.name,
          fileHandle: fileHandle,
          isEncrypted: isEncrypted
        })
      } else {
        // 覆盖现有文件
        if (currentDocument.fileHandle) {
          // 使用存储的文件句柄覆盖现有文件
          const writable = await currentDocument.fileHandle.createWritable()
          await writable.write(contentToSave)
          await writable.close()
        } else {
          // 如果没有文件句柄，提示用户另存为
          toast.error('无法覆盖文件，请使用另存为功能')
          return
        }
      }

      markDocumentSaved()
      if (!isAutoSave) {
        toast.success('文档保存成功')
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('保存文档失败:', error)
        toast.error('保存文档失败')
      }
    }
  }, [currentDocument, setDocumentInfo, markDocumentSaved])

  // 处理保存对话框的保存操作
  const handleSaveDialogSave = useCallback(async (saveMode, password) => {
    await handleSaveDocument(saveMode, password, false)
  }, [handleSaveDocument])

  // 处理保存对话框关闭
  const handleSaveDialogClose = useCallback(() => {
    setShowSaveDialog(false)
  }, [])

  // PDF导出相关状态
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  // 导出PDF
  const handleExportPDF = useCallback(async (exportSettings = null) => {
    if (!currentDocument.content.trim()) {
      toast.error('文档内容为空')
      return
    }

    setIsExporting(true)
    setExportProgress(10)

    try {
      // 获取当前主题和字体信息
      const themeResponse = await fetch('/api/themes/current')
      const fontResponse = await fetch('/api/fonts/current')

      setExportProgress(30)

      const currentThemeData = themeResponse.ok ? await themeResponse.json() : null
      const currentFontData = fontResponse.ok ? await fontResponse.json() : null

      setExportProgress(50)

      // 获取导出设置
      let finalExportSettings = exportSettings
      if (!finalExportSettings) {
        const settingsResponse = await fetch('/api/export/settings')
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json()
          finalExportSettings = settingsData.data
        }
      }

      setExportProgress(70)

      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: currentDocument.content,
          fileName: currentDocument.fileName.replace(/\.[^/.]+$/, '') || 'document',
          includeTheme: true,
          theme: currentThemeData?.data,
          font: currentFontData?.data,
          exportSettings: finalExportSettings
        })
      })

      setExportProgress(90)

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${currentDocument.fileName.replace(/\.[^/.]+$/, '') || 'document'}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        setExportProgress(100)
        toast.success('PDF导出成功')

        // 记录导出历史
        try {
          await fetch('/api/documents/recent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_path: `${currentDocument.fileName.replace(/\.[^/.]+$/, '')}.pdf`,
              file_name: `${currentDocument.fileName.replace(/\.[^/.]+$/, '')}.pdf`,
              file_type: 'pdf',
              operation_type: 'export'
            })
          })
        } catch (historyError) {
          console.warn('记录导出历史失败:', historyError)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || '导出失败')
      }
    } catch (error) {
      console.error('导出PDF失败:', error)
      toast.error(`导出PDF失败: ${error.message}`)
    } finally {
      setIsExporting(false)
      setExportProgress(0)
      setTimeout(() => setShowExportDialog(false), 1000)
    }
  }, [currentDocument])

  // 快速导出PDF
  const handleQuickExportPDF = useCallback(() => {
    handleExportPDF()
  }, [handleExportPDF])

  // 显示导出对话框
  const handleShowExportDialog = useCallback(() => {
    setShowExportDialog(true)
  }, [])

  // 处理加密对话框成功
  const handleEncryptionSuccess = useCallback(async (result, password) => {
    const { pendingAction } = encryptionDialog

    try {
      switch (pendingAction?.type) {
        case 'open':
          // 解密并打开文档
          setDocumentContent(result)
          setDocumentInfo({
            filePath: pendingAction.fileInfo.filePath,
            fileName: pendingAction.fileInfo.fileName,
            fileHandle: pendingAction.fileHandle,
            isModified: false,
            isEncrypted: true,
            lastSaved: new Date(pendingAction.fileInfo.lastModified).toISOString()
          })
          currentPasswordRef.current = password
          toast.success('加密文档打开成功')
          break

        case 'save':
          // 使用自定义密码保存加密文档
          setTimeout(() => handleSaveDocument('custom', password, false), 100)
          break

        default:
          console.warn('未知的待执行操作:', pendingAction)
      }
    } catch (error) {
      console.error('处理加密操作失败:', error)
      toast.error('操作失败')
    }
  }, [encryptionDialog, setDocumentContent, setDocumentInfo, handleSaveDocument])

  // 处理加密对话框关闭
  const handleEncryptionClose = useCallback(() => {
    setEncryptionDialog({
      isOpen: false,
      mode: 'decrypt',
      content: '',
      encryptedData: null,
      pendingAction: null
    })
  }, [])

  // 处理加密对话框错误
  const handleEncryptionError = useCallback((error) => {
    console.error('加密操作错误:', error)
  }, [])

  // 快捷键
  useHotkeys('ctrl+n, cmd+n', () => handleNewDocument())
  useHotkeys('ctrl+o, cmd+o', () => handleOpenDocument())
  useHotkeys('ctrl+s, cmd+s', () => handleSaveDocument(null, null, false))
  useHotkeys('ctrl+\\', () => toggleViewMode())
  useHotkeys('ctrl+shift+p', () => handleQuickExportPDF())
  useHotkeys('ctrl+alt+p', () => handleShowExportDialog())

  // 视图模式图标
  const getViewModeIcon = () => {
    switch (viewMode) {
      case 'edit':
        return <PencilIcon className="w-5 h-5" />
      case 'preview':
        return <EyeIcon className="w-5 h-5" />
      case 'split':
        return <Squares2X2Icon className="w-5 h-5" />
      default:
        return <Squares2X2Icon className="w-5 h-5" />
    }
  }

  return (
    <div className="h-screen flex flex-col theme-transition">
      {/* 工具栏 */}
      <div className="toolbar flex-shrink-0">
        <div className="toolbar-group">
          <button
            onClick={handleNewDocument}
            className="btn-icon btn-ghost"
            title="新建文档 (Ctrl+N)"
          >
            <DocumentTextIcon className="w-5 h-5" />
          </button>
          <button
            onClick={handleOpenDocument}
            className="btn-icon btn-ghost"
            title="打开文档 (Ctrl+O)"
          >
            📁
          </button>
          <button
            onClick={() => handleSaveDocument(null, null, false)}
            className="btn-icon btn-ghost"
            title="保存文档 (Ctrl+S)"
            disabled={!currentDocument.isModified}
          >
            💾
          </button>
        </div>

        <div className="toolbar-group">
          <button
            onClick={() => {
              const modes = ['edit', 'split', 'preview']
              const currentIndex = modes.indexOf(viewMode)
              const nextMode = modes[(currentIndex + 1) % modes.length]
              setViewMode(nextMode)
            }}
            className="btn-icon btn-ghost"
            title={`切换视图模式 (${viewMode}) (Ctrl+\\)`}
          >
            {getViewModeIcon()}
          </button>
          {headings.length > 0 && (viewMode === 'preview' || viewMode === 'split') && (
            <button
              onClick={toggleTOC}
              className={`btn-icon ${tocVisible ? 'btn-primary' : 'btn-ghost'}`}
              title="切换目录显示"
            >
              <ListBulletIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="toolbar-group ml-auto">
          <button
            onClick={() => setShowThemeManager(true)}
            className="btn-icon btn-ghost"
            title="主题管理"
          >
            <PaintBrushIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowFontManager(true)}
            className="btn-icon btn-ghost"
            title="字体管理"
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5" />
          </button>
          <div className="relative group">
            <button
              onClick={handleQuickExportPDF}
              onContextMenu={(e) => {
                e.preventDefault()
                handleShowExportDialog()
              }}
              className={`btn-icon ${isExporting ? 'btn-primary' : 'btn-ghost'}`}
              title="导出PDF (Ctrl+Shift+P) | 右键高级设置 (Ctrl+Alt+P)"
              disabled={isExporting}
            >
              <DocumentArrowDownIcon className="w-5 h-5" />
              {isExporting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </button>

            {/* 导出进度指示器 */}
            {isExporting && (
              <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300 ease-out"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            )}

            {/* 导出选项下拉菜单 */}
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="p-2">
                <button
                  onClick={handleQuickExportPDF}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  disabled={isExporting}
                >
                  快速导出
                </button>
                <button
                  onClick={handleShowExportDialog}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  disabled={isExporting}
                >
                  高级设置...
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => window.open('/settings', '_blank')}
            className="btn-icon btn-ghost"
            title="设置 (Ctrl+,)"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 主编辑区域 */}
      <div className="flex-1 flex overflow-hidden">
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} border-r border-gray-200`}>
            <MarkdownEditor
              content={currentDocument.content}
              onChange={handleContentChange}
              onScroll={handleEditorScroll}
              scrollTop={editorScrollTop}
            />

          </div>
        )}

        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} relative`}>
            <MarkdownPreview
              content={currentDocument.content}
              onScroll={handlePreviewScroll}
              scrollTop={previewScrollTop}
            />

            {/* 目录导航 */}
            {headings.length > 0 && (
              <TableOfContents
                content={currentDocument.content}
                isVisible={tocVisible}
                onToggleVisibility={toggleTOC}
                position={viewMode === 'split' ? 'floating' : 'right'}
                className="toc-overlay"
              />
            )}
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className="status-bar">
        <div className="flex items-center space-x-4">
          <span>
            {currentDocument.fileName}
            {currentDocument.isModified && ' •'}
          </span>
          <span>行: {documentStats.lineCount}</span>
          <span>字数: {documentStats.wordCount}</span>
          <span>字符: {documentStats.characterCount}</span>
          <span>预计阅读: {documentStats.readingTime}分钟</span>
          {headings.length > 0 && (
            <span>标题: {headings.length}</span>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <span>{currentTheme?.display_name || '默认主题'}</span>
        </div>
      </div>

      {/* 加密管理对话框 */}
      <EncryptionManager
        isOpen={encryptionDialog.isOpen}
        onClose={handleEncryptionClose}
        mode={encryptionDialog.mode}
        content={encryptionDialog.content}
        encryptedData={encryptionDialog.encryptedData}
        onSuccess={handleEncryptionSuccess}
        onError={handleEncryptionError}
      />

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

      {/* 保存对话框 */}
      <SaveDialog
        isOpen={showSaveDialog}
        onClose={handleSaveDialogClose}
        onSave={handleSaveDialogSave}
        fileName={currentDocument.fileName}
      />

      {/* PDF导出对话框 */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExportPDF}
        currentDocument={currentDocument}
        isExporting={isExporting}
        exportProgress={exportProgress}
      />
    </div>
  )
}

export default EditorPage