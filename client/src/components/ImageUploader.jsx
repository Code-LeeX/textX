import React, { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

import {
  compressImage,
  processBatchImages,
  generateImageMarkdown,
  generateImageGroupMarkdown,
  getImagesFromDataTransfer,
  getImageDisplaySuggestion,
  isImageFile
} from '@utils/imageProcessor'

import {
  PhotoIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  Squares2X2Icon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'

const ImageUploader = ({ onInsert, isOpen, onClose }) => {
  const [images, setImages] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [compressionSettings, setCompressionSettings] = useState({
    maxSizeKB: 512,
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.8
  })
  const [layoutOptions, setLayoutOptions] = useState({
    arrangement: 'single', // 'single', 'inline', 'group'
    alignment: 'center',   // 'left', 'center', 'right'
    spacing: 'normal'      // 'tight', 'normal', 'loose'
  })

  const fileInputRef = useRef(null)

  // 处理文件选择
  const handleFiles = useCallback(async (files) => {
    const imageFiles = Array.from(files).filter(isImageFile)

    if (imageFiles.length === 0) {
      toast.error('请选择有效的图片文件')
      return
    }

    setIsProcessing(true)

    try {
      const results = await processBatchImages(imageFiles, compressionSettings)

      const processedImages = await Promise.all(
        results.map(async (result, index) => {
          if (result.success) {
            const suggestion = await getImageDisplaySuggestion(imageFiles[index])

            return {
              id: Date.now() + index,
              file: imageFiles[index],
              base64: result.data,
              originalSize: result.originalSize,
              compressedSize: result.compressedSize,
              suggestion,
              alt: imageFiles[index].name.split('.')[0],
              title: ''
            }
          } else {
            toast.error(`处理 ${result.file} 失败: ${result.error}`)
            return null
          }
        })
      )

      const validImages = processedImages.filter(Boolean)
      setImages(prev => [...prev, ...validImages])

      if (validImages.length > 0) {
        toast.success(`成功处理 ${validImages.length} 张图片`)
      }
    } catch (error) {
      console.error('处理图片失败:', error)
      toast.error('处理图片失败')
    } finally {
      setIsProcessing(false)
    }
  }, [compressionSettings])

  // 拖拽配置
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp']
    },
    multiple: true
  })

  // 移除图片
  const removeImage = useCallback((id) => {
    setImages(prev => prev.filter(img => img.id !== id))
  }, [])

  // 更新图片属性
  const updateImage = useCallback((id, updates) => {
    setImages(prev => prev.map(img =>
      img.id === id ? { ...img, ...updates } : img
    ))
  }, [])

  // 插入图片到编辑器
  const insertImages = useCallback(() => {
    if (images.length === 0) {
      toast.error('请先选择图片')
      return
    }

    let markdown = ''

    switch (layoutOptions.arrangement) {
      case 'single':
        // 单张图片逐个插入
        markdown = images.map(img =>
          generateImageMarkdown(img.base64, img.alt, img.title)
        ).join('\n\n')
        break

      case 'inline':
        // 内联显示
        markdown = images.map(img =>
          generateImageMarkdown(img.base64, img.alt, img.title, { inline: true })
        ).join(' ')
        break

      case 'group':
        // 图片组并排显示
        markdown = generateImageGroupMarkdown(
          images.map(img => ({
            base64: img.base64,
            alt: img.alt,
            title: img.title
          })),
          layoutOptions
        )
        break

      default:
        markdown = images.map(img =>
          generateImageMarkdown(img.base64, img.alt, img.title)
        ).join('\n\n')
    }

    onInsert(markdown)
    setImages([])
    onClose()

    toast.success('图片插入成功')
  }, [images, layoutOptions, onInsert, onClose])

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 计算压缩率
  const getCompressionRatio = (original, compressed) => {
    const ratio = ((original - compressed) / original * 100).toFixed(1)
    return `${ratio}%`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">图片上传</h2>
          <button
            onClick={onClose}
            className="btn-icon btn-ghost"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[600px]">
          {/* 左侧：上传区域和设置 */}
          <div className="w-1/3 border-r border-gray-200 p-4 overflow-y-auto">
            {/* 文件上传区域 */}
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${isDragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
            >
              <input {...getInputProps()} />
              <PhotoIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                {isDragActive ? '放下文件以上传' : '拖拽图片到此处或点击选择'}
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                选择文件
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {/* 压缩设置 */}
            <div className="mt-6">
              <h3 className="flex items-center text-sm font-medium text-gray-900 mb-3">
                <AdjustmentsHorizontalIcon className="w-4 h-4 mr-2" />
                压缩设置
              </h3>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs text-gray-600">最大文件大小 (KB)</span>
                  <input
                    type="range"
                    min="100"
                    max="2048"
                    step="50"
                    value={compressionSettings.maxSizeKB}
                    onChange={(e) => setCompressionSettings(prev => ({
                      ...prev,
                      maxSizeKB: parseInt(e.target.value)
                    }))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">{compressionSettings.maxSizeKB}KB</span>
                </label>

                <label className="block">
                  <span className="text-xs text-gray-600">最大宽度 (px)</span>
                  <input
                    type="range"
                    min="600"
                    max="2400"
                    step="100"
                    value={compressionSettings.maxWidth}
                    onChange={(e) => setCompressionSettings(prev => ({
                      ...prev,
                      maxWidth: parseInt(e.target.value)
                    }))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">{compressionSettings.maxWidth}px</span>
                </label>

                <label className="block">
                  <span className="text-xs text-gray-600">压缩质量</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={compressionSettings.quality}
                    onChange={(e) => setCompressionSettings(prev => ({
                      ...prev,
                      quality: parseFloat(e.target.value)
                    }))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">{Math.round(compressionSettings.quality * 100)}%</span>
                </label>
              </div>
            </div>

            {/* 布局设置 */}
            <div className="mt-6">
              <h3 className="flex items-center text-sm font-medium text-gray-900 mb-3">
                <Squares2X2Icon className="w-4 h-4 mr-2" />
                布局设置
              </h3>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs text-gray-600">排列方式</span>
                  <select
                    value={layoutOptions.arrangement}
                    onChange={(e) => setLayoutOptions(prev => ({
                      ...prev,
                      arrangement: e.target.value
                    }))}
                    className="input w-full text-sm"
                  >
                    <option value="single">单独显示</option>
                    <option value="inline">内联显示</option>
                    <option value="group">并排显示</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs text-gray-600">对齐方式</span>
                  <select
                    value={layoutOptions.alignment}
                    onChange={(e) => setLayoutOptions(prev => ({
                      ...prev,
                      alignment: e.target.value
                    }))}
                    className="input w-full text-sm"
                  >
                    <option value="left">左对齐</option>
                    <option value="center">居中</option>
                    <option value="right">右对齐</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {/* 右侧：图片预览和编辑 */}
          <div className="flex-1 p-4 overflow-y-auto">
            {isProcessing ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">处理图片中...</p>
                </div>
              </div>
            ) : images.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <PhotoIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>暂无图片</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {images.map((image) => (
                  <div key={image.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      {/* 图片预览 */}
                      <div className="flex-shrink-0">
                        <img
                          src={image.base64}
                          alt={image.alt}
                          className="w-20 h-20 object-cover rounded border"
                        />
                      </div>

                      {/* 图片信息和编辑 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {image.file.name}
                          </h4>
                          <button
                            onClick={() => removeImage(image.id)}
                            className="btn-icon btn-ghost text-red-500 hover:bg-red-50"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                          <span>原始: {formatFileSize(image.originalSize)}</span>
                          <span>压缩: {formatFileSize(image.compressedSize)}</span>
                          <span>压缩率: {getCompressionRatio(image.originalSize, image.compressedSize)}</span>
                          <span>类型: {image.suggestion?.sizeType || 'normal'}</span>
                        </div>

                        {/* 建议 */}
                        {image.suggestion?.recommendations?.length > 0 && (
                          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-3">
                            💡 {image.suggestion.recommendations.join('，')}
                          </div>
                        )}

                        {/* 编辑字段 */}
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="替代文本 (alt)"
                            value={image.alt}
                            onChange={(e) => updateImage(image.id, { alt: e.target.value })}
                            className="input w-full text-sm"
                          />
                          <input
                            type="text"
                            placeholder="标题 (可选)"
                            value={image.title}
                            onChange={(e) => updateImage(image.id, { title: e.target.value })}
                            className="input w-full text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {images.length > 0 && `已选择 ${images.length} 张图片`}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              取消
            </button>
            <button
              onClick={insertImages}
              disabled={images.length === 0 || isProcessing}
              className="btn btn-primary"
            >
              插入图片
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageUploader