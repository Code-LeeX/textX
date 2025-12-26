import React, { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'

import EditorPage from '@pages/EditorPage'
import SettingsPage from '@pages/SettingsPage'

import useAppStore from '@store/useAppStore'
import useTheme from '@hooks/useTheme.jsx'

function App() {
  const { isLoading } = useAppStore()
  const { currentTheme } = useTheme()

  // 加载完成后移除初始加载元素
  useEffect(() => {
    const loadingElement = document.querySelector('.loading-container')
    if (!isLoading && loadingElement) {
      loadingElement.remove()
    }
  }, [isLoading])

  if (isLoading) {
    return null // 显示初始HTML中的加载动画
  }

  return (
    <div
      className={`min-h-screen theme-transition ${currentTheme?.className || ''}`}
      data-theme={currentTheme?.name}
    >
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </div>
  )
}

export default App