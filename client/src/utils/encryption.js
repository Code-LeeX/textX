/**
 * 前端加密工具模块
 * 使用Web Crypto API实现AES-256-GCM加密
 */

// 默认加密密钥
const DEFAULT_ENCRYPTION_PASSWORD = 'textx_default_key_2024'

// 将字符串转换为ArrayBuffer
function stringToArrayBuffer(str) {
  const encoder = new TextEncoder()
  return encoder.encode(str)
}

// 将ArrayBuffer转换为字符串
function arrayBufferToString(buffer) {
  const decoder = new TextDecoder()
  return decoder.decode(buffer)
}

// 将ArrayBuffer转换为base64字符串
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// 将base64字符串转换为ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// 从密码生成加密密钥
async function deriveKey(password, salt) {
  const passwordBuffer = stringToArrayBuffer(password)

  // 导入密码作为原始密钥
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  )

  // 使用PBKDF2派生密钥
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * 加密文本
 * @param {string} plaintext - 要加密的明文
 * @param {string} password - 加密密码
 * @returns {Promise<Object>} 加密结果
 */
export async function encryptText(plaintext, password) {
  try {
    // 生成随机盐值
    const salt = crypto.getRandomValues(new Uint8Array(16))

    // 生成随机初始化向量
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // 从密码派生密钥
    const key = await deriveKey(password, salt)

    // 加密数据
    const plaintextBuffer = stringToArrayBuffer(plaintext)
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      plaintextBuffer
    )

    return {
      encrypted: arrayBufferToBase64(encryptedBuffer),
      salt: arrayBufferToBase64(salt),
      iv: arrayBufferToBase64(iv),
      algorithm: 'AES-256-GCM',
      version: '1.0'
    }
  } catch (error) {
    throw new Error(`加密失败: ${error.message}`)
  }
}

/**
 * 解密文本
 * @param {Object} encryptedData - 加密数据
 * @param {string} password - 解密密码
 * @returns {Promise<string>} 解密后的明文
 */
export async function decryptText(encryptedData, password) {
  try {
    const { encrypted, salt, iv, algorithm } = encryptedData

    if (algorithm !== 'AES-256-GCM') {
      throw new Error('不支持的加密算法')
    }

    // 转换回ArrayBuffer
    const encryptedBuffer = base64ToArrayBuffer(encrypted)
    const saltBuffer = base64ToArrayBuffer(salt)
    const ivBuffer = base64ToArrayBuffer(iv)

    // 从密码派生密钥
    const key = await deriveKey(password, saltBuffer)

    // 解密数据
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      encryptedBuffer
    )

    return arrayBufferToString(decryptedBuffer)
  } catch (error) {
    throw new Error(`解密失败: ${error.message}`)
  }
}

/**
 * 检查是否为加密数据
 * @param {string} content - 文件内容
 * @returns {boolean} 是否为加密数据
 */
export function isEncryptedData(content) {
  try {
    const parsed = JSON.parse(content)
    return parsed &&
           parsed.encrypted &&
           parsed.salt &&
           parsed.iv &&
           parsed.algorithm === 'AES-256-GCM'
  } catch {
    return false
  }
}

/**
 * 验证密码强度
 * @param {string} password - 密码
 * @returns {Object} 密码强度信息
 */
export function validatePasswordStrength(password) {
  const result = {
    score: 0,
    suggestions: [],
    isValid: false
  }

  if (!password) {
    result.suggestions.push('请输入密码')
    return result
  }

  // 长度检查
  if (password.length >= 8) {
    result.score += 1
  } else {
    result.suggestions.push('密码至少需要8个字符')
  }

  // 大写字母
  if (/[A-Z]/.test(password)) {
    result.score += 1
  } else {
    result.suggestions.push('添加大写字母')
  }

  // 小写字母
  if (/[a-z]/.test(password)) {
    result.score += 1
  } else {
    result.suggestions.push('添加小写字母')
  }

  // 数字
  if (/\d/.test(password)) {
    result.score += 1
  } else {
    result.suggestions.push('添加数字')
  }

  // 特殊字符
  if (/[^A-Za-z0-9]/.test(password)) {
    result.score += 1
  } else {
    result.suggestions.push('添加特殊字符')
  }

  // 长度奖励
  if (password.length >= 12) {
    result.score += 1
  }

  result.isValid = result.score >= 3

  return result
}

/**
 * 生成随机密码
 * @param {number} length - 密码长度
 * @param {Object} options - 生成选项
 * @returns {string} 生成的密码
 */
export function generateRandomPassword(length = 16, options = {}) {
  const {
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeSimilar = true
  } = options

  let charset = ''

  if (includeUppercase) {
    charset += excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  }

  if (includeLowercase) {
    charset += excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz'
  }

  if (includeNumbers) {
    charset += excludeSimilar ? '23456789' : '0123456789'
  }

  if (includeSymbols) {
    charset += '!@#$%^&*()_+-=[]{}|;:,.<>?'
  }

  if (!charset) {
    throw new Error('至少需要选择一种字符类型')
  }

  let password = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)

  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length]
  }

  return password
}

/**
 * 安全地清除密码字符串
 * @param {string} password - 要清除的密码
 */
export function clearPassword(password) {
  // 在JavaScript中无法完全安全地清除内存中的字符串
  // 但我们可以通过一些方法来降低风险
  if (typeof password === 'string') {
    // 用零覆盖字符串（这在JavaScript中的效果有限）
    return password.replace(/./g, '\0')
  }
}

/**
 * 生成文档指纹
 * @param {string} content - 文档内容
 * @returns {Promise<string>} SHA-256哈希值
 */
export async function generateDocumentFingerprint(content) {
  const buffer = stringToArrayBuffer(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return arrayBufferToBase64(hashBuffer).substring(0, 16) // 取前16个字符作为指纹
}

/**
 * 安全比较两个字符串
 * @param {string} a - 字符串A
 * @param {string} b - 字符串B
 * @returns {boolean} 是否相等
 */
export function secureCompare(a, b) {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * 创建加密会话
 * @param {string} password - 密码
 * @returns {Object} 会话对象
 */
export function createEncryptionSession(password) {
  const sessionId = crypto.getRandomValues(new Uint8Array(16))
  const sessionKey = arrayBufferToBase64(sessionId)

  return {
    sessionKey,
    createdAt: Date.now(),

    // 加密方法
    encrypt: (plaintext) => encryptText(plaintext, password),

    // 解密方法
    decrypt: (encryptedData) => decryptText(encryptedData, password),

    // 验证密码
    verify: async (testPassword) => {
      try {
        const testData = await encryptText('test', testPassword)
        await decryptText(testData, password)
        return true
      } catch {
        return false
      }
    }
  }
}

/**
 * 获取默认加密密钥
 */
export function getDefaultPassword() {
  return DEFAULT_ENCRYPTION_PASSWORD
}