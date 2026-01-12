import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  'en': {
    translation: {
      "Explorer": "Explorer",
      "Search": "Search",
      "Settings": "Settings",
      "File": "File",
      "Save": "Save",
      "Edit": "Edit",
      "View": "View",
      "Help": "Help",
      "OpenFolder": "Open Folder...",
      "Exit": "Exit",
      "Theme": "Theme",
      "Language": "Language",
      "FontSize": "Font Size",
      "TabSize": "Tab Size",
      "Cancel": "Cancel",
      "Close": "Close",
      "NoFile": "No file opened",
      "About": "About",
      "SwitchTheme": "Switch to {{mode}} Theme",
      "Unsaved": "Unsaved",
      "ConfirmDelete": "Are you sure you want to delete \"{{name}}\"",
      "NewFile": "New File",
      "SaveBeforeClose": "Do you want to save the changes you made to {{name}}?",
      "DontSave": "Don't Save",
      "SaveAs": "Save As...",
      "Administrator": "Administrator",
      "ContextMenu": "Show in Context Menu",
      "ContextMenuLabel": "Edit with Zyma",
      "SingleInstance": "Single Instance Mode",
      "SingleInstanceDesc": "Reuse existing window when opening files",
      "Success": "Success"
    }
  },
  'zh-CN': {
    translation: {
      "Explorer": "资源管理器",
      "Search": "搜索",
      "Settings": "设置",
      "File": "文件",
      "Save": "保存",
      "Edit": "编辑",
      "View": "视图",
      "Help": "帮助",
      "OpenFolder": "打开文件夹...",
      "Exit": "退出",
      "Theme": "主题",
      "Language": "语言",
      "FontSize": "字体大小",
      "TabSize": "制表符大小",
      "Cancel": "取消",
      "Close": "关闭",
      "NoFile": "未打开文件",
      "About": "关于",
      "SwitchTheme": "切换至{{mode}}主题",
      "Unsaved": "未保存",
      "ConfirmDelete": "确定要删除 \"{{name}}\" 吗？",
      "NewFile": "新建文件",
      "SaveBeforeClose": "你想保存对 \"{{name}}\" 的修改吗？",
      "DontSave": "不保存",
      "SaveAs": "另存为...",
      "Administrator": "管理员",
      "ContextMenu": "显示在右键菜单",
      "ContextMenuLabel": "在智码中编辑",
      "SingleInstance": "单实例模式",
      "SingleInstanceDesc": "开启后，打开新文件将复用现有窗口",
      "Success": "成功"
    }
  },
  'zh-TW': {
    translation: {
      "Explorer": "資源管理器",
      "Search": "搜尋",
      "Settings": "設定",
      "File": "檔案",
      "Save": "儲存",
      "Edit": "編輯",
      "View": "檢視",
      "Help": "說明",
      "OpenFolder": "開啟資料夾...",
      "Exit": "結束",
      "Theme": "佈景主題",
      "Language": "語言",
      "FontSize": "字體大小",
      "TabSize": "製表位大小",
      "Cancel": "取消",
      "Close": "關閉",
      "NoFile": "未開啟檔案",
      "About": "關於",
      "SwitchTheme": "切換至{{mode}}主題",
      "Unsaved": "未儲存",
      "ConfirmDelete": "確定要刪除 \"{{name}}\" 嗎？",
      "NewFile": "新建檔案",
      "SaveBeforeClose": "你想儲存對 \"{{name}}\" 的修改嗎？",
      "DontSave": "不儲存",
      "SaveAs": "另存為...",
      "Administrator": "管理員",
      "ContextMenu": "顯示在右鍵選單",
      "ContextMenuLabel": "在智碼中編輯",
      "SingleInstance": "單實例模式",
      "SingleInstanceDesc": "開啟後，開啟新檔案將複用現有視窗",
      "Success": "成功"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh-CN',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;