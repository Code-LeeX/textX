import React, { useState, useRef, useEffect } from 'react'
import {
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { validatePasswordStrength, generateRandomPassword } from '@utils/encryption'

const PasswordInput = ({
  value,
  onChange,
  onSubmit,
  placeholder = '请输入密码',
  showStrengthMeter = false,
  showGenerateButton = false,
  confirmMode = false,
  title = '密码验证',
  description = '',
  isRequired = true,
  autoFocus = true
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const inputRef = useRef(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // 验证密码强度
  useEffect(() => {
    if (showStrengthMeter && value) {
      const strength = validatePasswordStrength(value)
      setPasswordStrength(strength)
    } else {
      setPasswordStrength(null)
    }
  }, [value, showStrengthMeter])

  // 处理密码变化
  const handlePasswordChange = (e) => {
    onChange(e.target.value)
  }

  // 处理确认密码变化
  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value)
  }

  // 生成随机密码
  const handleGeneratePassword = () => {
    setIsGenerating(true)

    // 添加一些延迟以显示生成动画
    setTimeout(() => {
      const generatedPassword = generateRandomPassword(16, {
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeSimilar: true
      })

      onChange(generatedPassword)
      setConfirmPassword(generatedPassword)
      setIsGenerating(false)
    }, 500)
  }

  // 处理表单提交
  const handleSubmit = (e) => {
    e.preventDefault()

    if (!value) {
      return
    }

    if (confirmMode && value !== confirmPassword) {
      return
    }

    if (showStrengthMeter && passwordStrength && !passwordStrength.isValid) {
      return
    }

    onSubmit(value)
  }

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e)
    }
  }

  // 获取强度颜色
  const getStrengthColor = (score) => {
    if (score <= 1) return 'text-red-500'
    if (score <= 3) return 'text-yellow-500'
    if (score <= 4) return 'text-blue-500'
    return 'text-green-500'
  }

  // 获取强度文本
  const getStrengthText = (score) => {
    if (score <= 1) return '弱'
    if (score <= 3) return '中等'
    if (score <= 4) return '强'
    return '非常强'
  }

  const isConfirmValid = !confirmMode || value === confirmPassword
  const canSubmit = value && isConfirmValid && (!showStrengthMeter || (passwordStrength && passwordStrength.isValid))

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 标题和描述 */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <KeyIcon className="w-8 h-8 text-primary-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>

        {/* 密码输入框 */}
        <div className="relative">
          <input
            ref={inputRef}
            type={showPassword ? 'text' : 'password'}
            value={value}
            onChange={handlePasswordChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`
              input pr-20 w-full
              ${passwordStrength?.isValid === false ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
              ${passwordStrength?.isValid === true ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : ''}
            `}
            required={isRequired}
            autoComplete="new-password"
          />

          {/* 显示/隐藏密码按钮 */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeSlashIcon className="w-4 h-4" />
              ) : (
                <EyeIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* 密码强度指示器 */}
        {showStrengthMeter && passwordStrength && value && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">密码强度:</span>
              <span className={`text-sm font-medium ${getStrengthColor(passwordStrength.score)}`}>
                {getStrengthText(passwordStrength.score)}
              </span>
            </div>

            {/* 强度条 */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`
                  h-2 rounded-full transition-all duration-300
                  ${passwordStrength.score <= 1 ? 'bg-red-500' : ''}
                  ${passwordStrength.score === 2 || passwordStrength.score === 3 ? 'bg-yellow-500' : ''}
                  ${passwordStrength.score === 4 ? 'bg-blue-500' : ''}
                  ${passwordStrength.score >= 5 ? 'bg-green-500' : ''}
                `}
                style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
              />
            </div>

            {/* 建议 */}
            {passwordStrength.suggestions.length > 0 && (
              <div className="text-xs text-gray-500 space-y-1">
                {passwordStrength.suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-center">
                    <ExclamationTriangleIcon className="w-3 h-3 mr-1 text-yellow-500" />
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 确认密码输入框 */}
        {confirmMode && (
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              onKeyDown={handleKeyDown}
              placeholder="确认密码"
              className={`
                input pr-10 w-full
                ${confirmPassword && !isConfirmValid ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
                ${confirmPassword && isConfirmValid ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : ''}
              `}
              required={isRequired}
              autoComplete="new-password"
            />

            {/* 显示/隐藏确认密码按钮 */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* 确认密码状态 */}
            {confirmPassword && (
              <div className="mt-1 text-xs flex items-center">
                {isConfirmValid ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircleIcon className="w-3 h-3 mr-1" />
                    密码匹配
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                    密码不匹配
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 生成密码按钮 */}
        {showGenerateButton && (
          <button
            type="button"
            onClick={handleGeneratePassword}
            disabled={isGenerating}
            className="w-full btn btn-secondary text-sm"
          >
            {isGenerating ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500 mr-2"></div>
                生成中...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <ShieldCheckIcon className="w-4 h-4 mr-2" />
                生成安全密码
              </div>
            )}
          </button>
        )}

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full btn btn-primary"
        >
          确认
        </button>
      </form>
    </div>
  )
}

export default PasswordInput