import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import useAppStore from '@store/useAppStore'
import ImageUploader from '@components/ImageUploader'
import {
  compressImage,
  getImagesFromDataTransfer,
  generateImageMarkdown
} from '@utils/imageProcessor'

const MarkdownEditor = ({
  content,
  onChange,
  onScroll,
  scrollTop
}) => {
  const textareaRef = useRef(null)
  const [selectionStart, setSelectionStart] = useState(0)
  const [selectionEnd, setSelectionEnd] = useState(0)
  const [showImageUploader, setShowImageUploader] = useState(false)

  const { settings } = useAppStore()

  // 同步滚动位置
  useEffect(() => {
    if (textareaRef.current && scrollTop !== undefined) {
      textareaRef.current.scrollTop = scrollTop
    }
  }, [scrollTop])

  // 处理内容变化
  const handleChange = useCallback((e) => {
    onChange(e.target.value)
  }, [onChange])

  // 处理滚动
  const handleScroll = useCallback((e) => {
    if (onScroll) {
      onScroll(e.target.scrollTop)
    }
  }, [onScroll])

  // 处理选择变化
  const handleSelectionChange = useCallback((e) => {
    setSelectionStart(e.target.selectionStart)
    setSelectionEnd(e.target.selectionEnd)
  }, [])

  // 插入文本的通用方法
  const insertText = useCallback((before, after = '', placeholder = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const textToInsert = selectedText || placeholder

    const newContent =
      content.substring(0, start) +
      before + textToInsert + after +
      content.substring(end)

    onChange(newContent)

    // 设置新的光标位置
    setTimeout(() => {
      const newCursorPos = start + before.length + textToInsert.length + after.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      textarea.focus()
    }, 0)
  }, [content, onChange])

  // Markdown 快捷键
  useHotkeys('ctrl+b, cmd+b', (e) => {
    e.preventDefault()
    insertText('**', '**', '粗体文本')
  }, { enableOnFormTags: true })

  useHotkeys('ctrl+i, cmd+i', (e) => {
    e.preventDefault()
    insertText('*', '*', '斜体文本')
  }, { enableOnFormTags: true })

  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault()
    insertText('[', '](url)', '链接文本')
  }, { enableOnFormTags: true })

  useHotkeys('ctrl+shift+c, cmd+shift+c', (e) => {
    e.preventDefault()
    insertText('`', '`', '代码')
  }, { enableOnFormTags: true })

  useHotkeys('ctrl+shift+k, cmd+shift+k', (e) => {
    e.preventDefault()
    insertText('```\n', '\n```', '代码块')
  }, { enableOnFormTags: true })

  // Tab 键处理
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd

      // 插入制表符
      const newContent =
        content.substring(0, start) +
        '  ' + // 使用两个空格代替tab
        content.substring(end)

      onChange(newContent)

      // 设置光标位置
      setTimeout(() => {
        e.target.setSelectionRange(start + 2, start + 2)
      }, 0)
    }

    // Enter 键处理（自动列表续行）
    if (e.key === 'Enter') {
      const lines = content.split('\n')
      const currentLineIndex = content.substring(0, selectionStart).split('\n').length - 1
      const currentLine = lines[currentLineIndex]

      // 检查当前行是否是列表项
      const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s/)
      if (listMatch) {
        e.preventDefault()
        const [, indent, marker] = listMatch
        let newMarker = marker

        // 如果是数字列表，增加数字
        if (/\d+\./.test(marker)) {
          const num = parseInt(marker) + 1
          newMarker = `${num}.`
        }

        const newContent =
          content.substring(0, selectionStart) +
          '\n' + indent + newMarker + ' ' +
          content.substring(selectionEnd)

        onChange(newContent)

        // 设置光标位置
        setTimeout(() => {
          const newPos = selectionStart + 1 + indent.length + newMarker.length + 1
          textareaRef.current.setSelectionRange(newPos, newPos)
        }, 0)
      }
    }
  }, [content, onChange, selectionStart, selectionEnd])

  // 处理粘贴事件（图片处理）
  const handlePaste = useCallback(async (e) => {
    const imageFiles = getImagesFromDataTransfer(e.clipboardData)

    if (imageFiles.length > 0) {
      e.preventDefault()

      try {
        // 如果只有一张图片，直接处理
        if (imageFiles.length === 1) {
          const compressedBase64 = await compressImage(imageFiles[0], {
            maxSizeKB: 512,
            maxWidth: 1200,
            maxHeight: 1200
          })

          const imageMarkdown = generateImageMarkdown(
            compressedBase64,
            imageFiles[0].name.split('.')[0]
          )

          insertText('', '', imageMarkdown)
        } else {
          // 多张图片打开上传器
          setShowImageUploader(true)
        }
      } catch (error) {
        console.error('处理图片失败:', error)
        // 如果处理失败，打开上传器
        setShowImageUploader(true)
      }
    }
  }, [insertText])

  // 处理图片插入
  const handleImageInsert = useCallback((markdown) => {
    insertText('', '', markdown)
  }, [insertText])

  // 图片上传快捷键
  useHotkeys('ctrl+shift+i, cmd+shift+i', (e) => {
    e.preventDefault()
    setShowImageUploader(true)
  }, { enableOnFormTags: true })


  return (
    <>
      <div className="editor-container">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onScroll={settings.sync_scroll ? handleScroll : undefined}
          onSelect={handleSelectionChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className="editor-textarea pl-4 whitespace-pre-wrap"
          style={{
            fontFamily: settings.font_family || 'Inter, monospace',
            fontSize: `${settings.font_size || 14}px`,
            lineHeight: '1.6'
          }}
          placeholder="开始输入您的内容... (Ctrl+Shift+I 插入图片)"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          data-gramm="false"
        />
      </div>

      {/* 图片上传器 */}
      <ImageUploader
        isOpen={showImageUploader}
        onClose={() => setShowImageUploader(false)}
        onInsert={handleImageInsert}
      />
    </>
  )
}

export default MarkdownEditor