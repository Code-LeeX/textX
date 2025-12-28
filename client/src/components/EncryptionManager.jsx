import React, { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import PasswordInput from '@components/PasswordInput'
import { encryptText, decryptText } from '@utils/encryption'

const EncryptionManager = ({
  isOpen,
  onClose,
  mode, // 'encrypt', 'decrypt', 'verify'
  content,
  encryptedData,
  onSuccess,
  onError,
  title,
  description
}) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [iptV, setIptV] = useState()

  // 处理密码提交
  const handlePasswordSubmit = useCallback(async (password) => {
    if (!password) {
      toast.error('请输入密码')
      return
    }

    setIsProcessing(true)

    try {
      let result = null

      switch (mode) {
        case 'encrypt':
          if (!content) {
            throw new Error('没有内容需要加密')
          }
          result = await encryptText(content, password)
          toast.success('内容加密成功')
          break

        case 'decrypt':
          if (!encryptedData) {
            throw new Error('没有加密数据需要解密')
          }
          result = await decryptText(encryptedData, password)
          toast.success('内容解密成功')
          break

        case 'verify':
          if (!encryptedData) {
            throw new Error('没有加密数据需要验证')
          }
          // 尝试解密来验证密码
          result = await decryptText(encryptedData, password)
          toast.success('密码验证成功')
          break

        default:
          throw new Error('未知的操作模式')
      }

      onSuccess?.(result, password)
      onClose()
    } catch (error) {
      console.error('加密操作失败:', error)
      const errorMessage = error.message.includes('解密失败')
        ? '密码错误或文件已损坏'
        : error.message
      toast.error(errorMessage)
      onError?.(error)
    } finally {
      setIsProcessing(false)
    }
  }, [mode, content, encryptedData, onSuccess, onError, onClose])

  // 获取对话框配置
  const getDialogConfig = () => {
    switch (mode) {
      case 'encrypt':
        return {
          title: title || '加密文档',
          description: description || '请设置一个安全密码来加密您的文档。请务必记住此密码，丢失后无法恢复文档内容。',
          confirmMode: true,
          showStrengthMeter: true,
          showGenerateButton: true,
          placeholder: '请输入加密密码'
        }

      case 'decrypt':
        return {
          title: title || '解密文档',
          description: description || '请输入密码来解密文档内容。',
          confirmMode: false,
          showStrengthMeter: false,
          showGenerateButton: false,
          placeholder: '请输入解密密码'
        }

      case 'verify':
        return {
          title: title || '验证密码',
          description: description || '请输入文档密码以继续操作。',
          confirmMode: false,
          showStrengthMeter: false,
          showGenerateButton: false,
          placeholder: '请输入文档密码'
        }

      default:
        return {
          title: '加密操作',
          description: '请输入密码。',
          confirmMode: false,
          showStrengthMeter: false,
          showGenerateButton: false,
          placeholder: '请输入密码'
        }
    }
  }

  if (!isOpen) return null

  const config = getDialogConfig()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 relative">
        {/* 处理中遮罩 */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">处理中...</p>
            </div>
          </div>
        )}

        <div className="p-6">
          <PasswordInput
            value={iptV}
            onChange={(v)=>{setIptV(v)}} // PasswordInput 内部管理状态
            onSubmit={handlePasswordSubmit}
            title={config.title}
            description={config.description}
            confirmMode={config.confirmMode}
            showStrengthMeter={config.showStrengthMeter}
            showGenerateButton={config.showGenerateButton}
            placeholder={config.placeholder}
            isRequired={true}
            autoFocus={true}
          />

          {/* 操作按钮 */}
          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="btn btn-secondary"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 便捷的静态方法
EncryptionManager.encrypt = (content, options = {}) => {
  return new Promise((resolve, reject) => {
    const manager = document.createElement('div')
    document.body.appendChild(manager)

    const cleanup = () => {
      document.body.removeChild(manager)
    }

    const handleSuccess = (encryptedData, password) => {
      cleanup()
      resolve({ encryptedData, password })
    }

    const handleError = (error) => {
      cleanup()
      reject(error)
    }

    const handleClose = () => {
      cleanup()
      reject(new Error('用户取消操作'))
    }

    // 这里需要使用 ReactDOM.render 或类似方法来渲染组件
    // 暂时不实现，因为需要更复杂的逻辑
  })
}

EncryptionManager.decrypt = (encryptedData, options = {}) => {
  // 类似的静态方法实现
}

// 工具函数：检查内容是否需要密码
export const needsPassword = (content) => {
  if (typeof content === 'string') {
    return isEncryptedData(content)
  }
  return false
}

// 工具函数：格式化加密数据用于保存
export const formatEncryptedForSave = (encryptedData) => {
  return JSON.stringify({
    ...encryptedData,
    createdAt: new Date().toISOString(),
    version: '1.0'
  }, null, 2)
}

// 工具函数：解析保存的加密数据
export const parseEncryptedFromSave = (fileContent) => {
  try {
    const parsed = JSON.parse(fileContent)
    if (parsed.encrypted && parsed.salt && parsed.iv) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export default EncryptionManager