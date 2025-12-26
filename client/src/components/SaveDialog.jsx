import React, { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import PasswordInput from '@components/PasswordInput'
import {
  LockClosedIcon,
  LockOpenIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

const SaveDialog = ({
  isOpen,
  onClose,
  onSave,
  fileName = 'untitled.md'
}) => {
  const [saveMode, setSaveMode] = useState('normal') // 'normal', 'default', 'custom'
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // 重置状态
  const resetState = useCallback(() => {
    setSaveMode('normal')
    setPassword('')
    setConfirmPassword('')
    setIsProcessing(false)
  }, [])

  // 处理关闭
  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  // 处理保存
  const handleSave = useCallback(async () => {
    if (saveMode === 'custom') {
      // 验证自定义密码
      if (!password) {
        toast.error('请输入密码')
        return
      }
      if (password !== confirmPassword) {
        toast.error('两次输入的密码不一致')
        return
      }
      if (password.length < 6) {
        toast.error('密码长度至少为6位')
        return
      }
    }

    setIsProcessing(true)

    try {
      await onSave(saveMode, password)
      resetState()
      onClose()
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败')
    } finally {
      setIsProcessing(false)
    }
  }, [saveMode, password, confirmPassword, onSave, resetState, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 relative overflow-hidden">
        {/* 处理中遮罩 */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white bg-opacity-90 dark:bg-gray-800 dark:bg-opacity-90 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">保存中...</p>
            </div>
          </div>
        )}

        {/* 标题 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            保存文档
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {fileName}
          </p>
        </div>

        <div className="p-6">
          {/* 保存模式选择 */}
          <div className="space-y-3 mb-6">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">选择保存方式</h4>

            {/* 普通保存 */}
            <label className="flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="radio"
                name="saveMode"
                value="normal"
                checked={saveMode === 'normal'}
                onChange={(e) => setSaveMode(e.target.value)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-3 ${
                saveMode === 'normal'
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {saveMode === 'normal' && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
              <LockOpenIcon className="w-5 h-5 text-gray-500 mr-3" />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">普通保存</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">文档内容不加密</div>
              </div>
            </label>

            {/* 默认密钥加密 */}
            <label className="flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="radio"
                name="saveMode"
                value="default"
                checked={saveMode === 'default'}
                onChange={(e) => setSaveMode(e.target.value)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-3 ${
                saveMode === 'default'
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {saveMode === 'default' && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
              <LockClosedIcon className="w-5 h-5 text-yellow-500 mr-3" />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">默认加密</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">使用默认密钥加密，便于快速保存</div>
              </div>
            </label>

            {/* 自定义密码加密 */}
            <label className="flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="radio"
                name="saveMode"
                value="custom"
                checked={saveMode === 'custom'}
                onChange={(e) => setSaveMode(e.target.value)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-3 ${
                saveMode === 'custom'
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {saveMode === 'custom' && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
              <KeyIcon className="w-5 h-5 text-red-500 mr-3" />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">自定义密码</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">设置专用密码，安全性更高</div>
              </div>
            </label>
          </div>

          {/* 自定义密码输入 */}
          {saveMode === 'custom' && (
            <div className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  设置密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码（至少6位）"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  确认密码
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-500">两次输入的密码不一致</p>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  保存中
                </>
              ) : (
                '保存'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SaveDialog