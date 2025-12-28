import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAppStore = create(
  persist(
    (set, get) => ({
      // 应用状态
      isLoading: true,

      // 文档状态
      currentDocument: {
        content: '',
        filePath: null,
        fileName: 'untitled.md',
        fileHandle: null, // 保存文件句柄用于覆盖现有文件
        isModified: false,
        isEncrypted: false,
        lastSaved: null
      },

      // 编辑器状态
      viewMode: 'split', // 'edit' | 'preview' | 'split'

      // 设置状态
      settings: {
        theme_name: 'default',
        font_family: 'Inter',
        font_size: 14,
        auto_save: true,
        sync_scroll: true
      },

      // 操作方法
      setLoading: (loading) => set({ isLoading: loading }),

      // 文档操作
      setDocumentContent: (content) =>
        set((state) => ({
          currentDocument: {
            ...state.currentDocument,
            content,
            isModified: state.currentDocument.content !== content
          }
        })),

      setDocumentInfo: (info) =>
        set((state) => ({
          currentDocument: { ...state.currentDocument, ...info }
        })),

      resetDocument: () =>
        set({
          currentDocument: {
            content: '',
            filePath: null,
            fileName: 'untitled.md',
            fileHandle: null,
            isModified: false,
            isEncrypted: false,
            lastSaved: null
          }
        }),

      markDocumentSaved: () =>
        set((state) => ({
          currentDocument: {
            ...state.currentDocument,
            isModified: false,
            lastSaved: new Date().toISOString()
          }
        })),

      // 视图模式操作
      setViewMode: (mode) => set({ viewMode: mode }),

      toggleViewMode: () =>
        set((state) => {
          const modes = ['edit', 'split', 'preview'];
          const currentIndex = modes.indexOf(state.viewMode);
          const nextIndex = (currentIndex + 1) % modes.length;
          return { viewMode: modes[nextIndex] };
        }),


      // 设置操作
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),

      updateSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value }
        })),

      // 获取当前状态的方法
      getCurrentState: () => get(),

      // 检查是否有未保存的更改
      hasUnsavedChanges: () => get().currentDocument.isModified,

      // 获取文档统计信息
      getDocumentStats: () => {
        const { content } = get().currentDocument;
        // 统计汉字（匹配中文字符，包括中文标点）
        const chineseRegex = /[\u4e00-\u9fa5]/g;
        const chineseCount = (content.match(chineseRegex) || []).length;
        
        // 统计英文单词（匹配连续的英文字母，包含连字符等情况）
        const englishWordRegex = /\b[a-zA-Z]+(?:[-'][a-zA-Z]+)*\b/g;
        const englishWordCount = (content.match(englishWordRegex) || []).length;

        const wordCount = chineseCount + englishWordCount;
        const characterCount = content.length;
        const lineCount = content.split('\n').length;
        const readingTime = Math.ceil(wordCount / 200);

        return {
          wordCount,
          characterCount,
          lineCount,
          readingTime
        };
      }
    }),
    {
      name: 'textx-app-store',
      partialize: (state) => ({
        // 只持久化部分状态
        viewMode: state.viewMode,
        settings: state.settings
      })
    }
  )
)

export default useAppStore