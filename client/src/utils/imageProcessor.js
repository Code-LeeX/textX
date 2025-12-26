/**
 * 图片处理工具模块
 * 支持图片压缩、格式转换、并排显示等功能
 */

// 图片类型检测
export const isImageFile = (file) => {
  return file && file.type && file.type.startsWith('image/')
}

// 支持的图片格式
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp'
]

// 检查图片格式是否支持
export const isSupportedImageType = (type) => {
  return SUPPORTED_IMAGE_TYPES.includes(type)
}

/**
 * 压缩图片到指定大小
 * @param {File} file - 图片文件
 * @param {Object} options - 压缩选项
 * @returns {Promise<string>} Base64编码的图片
 */
export const compressImage = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      maxSizeKB = 512,        // 最大文件大小(KB)
      maxWidth = 1200,        // 最大宽度
      maxHeight = 1200,       // 最大高度
      quality = 0.8,          // 初始质量
      outputFormat = 'jpeg'   // 输出格式
    } = options

    if (!isImageFile(file)) {
      reject(new Error('不是有效的图片文件'))
      return
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      try {
        // 计算压缩后的尺寸
        let { width, height } = calculateOptimalDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        )

        canvas.width = width
        canvas.height = height

        // 绘制压缩后的图片
        ctx.drawImage(img, 0, 0, width, height)

        // 递归压缩直到满足大小要求
        compressToTargetSize(canvas, outputFormat, maxSizeKB, quality)
          .then(resolve)
          .catch(reject)

      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => reject(new Error('图片加载失败'))

    // 使用createObjectURL而不是FileReader以支持更大的文件
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 计算最优尺寸
 */
const calculateOptimalDimensions = (originalWidth, originalHeight, maxWidth, maxHeight) => {
  let width = originalWidth
  let height = originalHeight

  // 如果图片尺寸超出限制，按比例缩放
  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height

    if (width > height) {
      width = Math.min(width, maxWidth)
      height = width / aspectRatio
    } else {
      height = Math.min(height, maxHeight)
      width = height * aspectRatio
    }
  }

  return { width: Math.round(width), height: Math.round(height) }
}

/**
 * 压缩到目标大小
 */
const compressToTargetSize = (canvas, format, maxSizeKB, initialQuality) => {
  return new Promise((resolve, reject) => {
    let quality = initialQuality
    let attempts = 0
    const maxAttempts = 10

    const tryCompress = () => {
      if (attempts >= maxAttempts) {
        // 如果尝试次数过多，返回当前结果
        resolve(canvas.toDataURL(`image/${format}`, 0.1))
        return
      }

      const dataUrl = canvas.toDataURL(`image/${format}`, quality)
      const sizeKB = (dataUrl.length * 3) / 4 / 1024 // Base64大小估算

      if (sizeKB <= maxSizeKB || quality <= 0.1) {
        resolve(dataUrl)
      } else {
        quality -= 0.1
        attempts++
        // 使用setTimeout避免阻塞UI
        setTimeout(tryCompress, 0)
      }
    }

    tryCompress()
  })
}

/**
 * 批量处理多张图片
 * @param {File[]} files - 图片文件数组
 * @param {Object} options - 处理选项
 * @returns {Promise<Array>} 处理结果数组
 */
export const processBatchImages = async (files, options = {}) => {
  const results = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    if (!isImageFile(file)) {
      results.push({
        success: false,
        error: '不是有效的图片文件',
        file: file.name
      })
      continue
    }

    try {
      const compressedImage = await compressImage(file, options)
      results.push({
        success: true,
        data: compressedImage,
        originalSize: file.size,
        compressedSize: (compressedImage.length * 3) / 4,
        file: file.name
      })
    } catch (error) {
      results.push({
        success: false,
        error: error.message,
        file: file.name
      })
    }
  }

  return results
}

/**
 * 生成图片Markdown语法
 * @param {string} base64 - Base64编码的图片
 * @param {string} alt - 替代文本
 * @param {string} title - 标题
 * @param {Object} options - 显示选项
 * @returns {string} Markdown语法
 */
export const generateImageMarkdown = (base64, alt = 'image', title = '', options = {}) => {
  const {
    inline = false,     // 是否内联显示
    small = false,      // 是否小图显示
    width,             // 指定宽度
    height,            // 指定高度
    align              // 对齐方式
  } = options

  let titleAttr = title
  const attributes = []

  if (inline) attributes.push('inline')
  if (small) attributes.push('small')
  if (width) attributes.push(`width=${width}`)
  if (height) attributes.push(`height=${height}`)
  if (align) attributes.push(`align=${align}`)

  if (attributes.length > 0) {
    titleAttr = attributes.join(' ')
  }

  return `![${alt}](${base64}${titleAttr ? ` "${titleAttr}"` : ''})`
}

/**
 * 生成并排图片Markdown
 * @param {Array} images - 图片数组 [{base64, alt, title}]
 * @param {Object} options - 选项
 * @returns {string} Markdown语法
 */
export const generateImageGroupMarkdown = (images, options = {}) => {
  const { spacing = 'normal', alignment = 'left' } = options

  if (images.length === 1) {
    return generateImageMarkdown(images[0].base64, images[0].alt, images[0].title, options)
  }

  // 多图并排
  const imageMarkdowns = images.map(img =>
    generateImageMarkdown(img.base64, img.alt, img.title, { ...options, inline: true })
  )

  return `<div class="image-group ${alignment}">\n${imageMarkdowns.join('\n')}\n</div>`
}

/**
 * 从剪贴板获取图片
 * @param {DataTransfer} dataTransfer - 拖拽或粘贴事件的dataTransfer
 * @returns {File[]} 图片文件数组
 */
export const getImagesFromDataTransfer = (dataTransfer) => {
  const files = Array.from(dataTransfer.files || [])
  const imageFiles = files.filter(isImageFile)

  // 检查剪贴板中的图片数据
  const items = Array.from(dataTransfer.items || [])
  const imageItems = items.filter(item => item.type.startsWith('image/'))

  const additionalFiles = imageItems
    .map(item => item.getAsFile())
    .filter(file => file && !imageFiles.some(existing =>
      existing.name === file.name && existing.size === file.size
    ))

  return [...imageFiles, ...additionalFiles]
}

/**
 * 检测图片尺寸类型
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @returns {string} 尺寸类型
 */
export const getImageSizeType = (width, height) => {
  const aspectRatio = width / height

  if (width <= 300 || height <= 200) {
    return 'small'
  } else if (aspectRatio > 2) {
    return 'wide'
  } else if (aspectRatio < 0.5) {
    return 'tall'
  } else {
    return 'normal'
  }
}

/**
 * 优化图片显示建议
 * @param {File} file - 图片文件
 * @returns {Promise<Object>} 显示建议
 */
export const getImageDisplaySuggestion = (file) => {
  return new Promise((resolve) => {
    const img = new Image()

    img.onload = () => {
      const sizeType = getImageSizeType(img.width, img.height)
      const fileSize = file.size / 1024 // KB

      const suggestion = {
        sizeType,
        originalDimensions: { width: img.width, height: img.height },
        fileSize: Math.round(fileSize),
        recommendations: []
      }

      // 生成建议
      if (sizeType === 'small') {
        suggestion.recommendations.push('建议使用内联显示')
      }

      if (fileSize > 500) {
        suggestion.recommendations.push('建议压缩以减小文件大小')
      }

      if (sizeType === 'wide') {
        suggestion.recommendations.push('建议使用横向布局')
      }

      if (sizeType === 'tall') {
        suggestion.recommendations.push('建议与文字并排显示')
      }

      resolve(suggestion)
    }

    img.onerror = () => {
      resolve({
        error: '无法读取图片尺寸',
        recommendations: ['建议检查图片格式是否正确']
      })
    }

    img.src = URL.createObjectURL(file)
  })
}

/**
 * 图片格式转换
 * @param {string} base64 - 原始图片base64
 * @param {string} targetFormat - 目标格式 (jpeg, png, webp)
 * @param {number} quality - 质量 (0-1)
 * @returns {Promise<string>} 转换后的base64
 */
export const convertImageFormat = (base64, targetFormat = 'jpeg', quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      canvas.width = img.width
      canvas.height = img.height

      // PNG需要透明背景处理
      if (targetFormat === 'jpeg' && base64.includes('data:image/png')) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      ctx.drawImage(img, 0, 0)

      const convertedBase64 = canvas.toDataURL(`image/${targetFormat}`, quality)
      resolve(convertedBase64)
    }

    img.onerror = () => reject(new Error('图片格式转换失败'))
    img.src = base64
  })
}