# 项目名称

TTS Chrome Extension

# 项目背景

这是一个浏览器插件，允许用户将网页内容通过兼容 OpenAI 的 `/v1/audio/speech` 接口进行语音合成播放。插件支持语言选择、音色选择，并提供可悬浮的播放器 UI（带进度、音量、语速控制）。

# 开发目标

1. 通过 popup 页面配置 TTS 服务地址、API 密钥、语言、音色
2. 支持用户朗读选中文本或整页内容
3. 使用 `<audio>` 标签实现流式播放，符合 OpenAI 接口规范
4. 插件支持中英 UI 切换，并在内容播放期间保留浮动播放器组件

# 技术栈

- JavaScript (Vanilla or Vite)
- Chrome Manifest V3
- HTML / CSS (考虑 Tailwind 可选)
- 可选模块：i18n.js、popup.js、background.js

# 功能补充建议

- 设置记忆缓存（localStorage）
- 支持调节播放语速
- 语言和音色下拉选择支持动态加载（接口：/v1/audio/all_voices）
