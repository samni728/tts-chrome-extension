🎧 Chrome Extension for Local-TTS-Service

这是一个配合 Local-TTS-Service 使用的 Chrome 浏览器插件，支持朗读网页内容并通过本地 TTS 接口进行语音合成。插件提供简洁的设置页面和浮动播放器，适用于快速测试、本地化部署、文档朗读等场景。

⸻

✨ 功能亮点
• 支持朗读选中的文本或整页内容
• 兼容 OpenAI 标准的 /v1/audio/speech 接口
• 内置中英文界面切换（支持 i18n）
• 提供浮动播放器，支持播放/暂停、进度拖动、音量调节、语速控制
• 与 Local-TTS-Service 无缝集成，可用于局域网、本地部署环境

⸻

🧭 使用步骤 1. 打开 Chrome，访问 chrome://extensions/，开启“开发者模式” 2. 点击 加载已解压的扩展程序，选择本项目的 chrome_extension/ 目录（或已拆分的新项目） 3. 点击浏览器右上角插件图标，打开设置页 4. 在设置中填写以下信息：
• TTS 服务器地址：如 http://127.0.0.1:5050
• API 密钥：来自你的 Local-TTS-Service 配置
• 语言与音色：可选 zh-CN、en-US 等 5. 返回网页，选中内容后点击插件按钮即可朗读

⸻

📦 示例配置（推荐使用本地服务）

TTS Server Address: http://127.0.0.1:5050
API Key: sk-xxxxxx
Language: zh-CN
Voice: zh-CN-XiaoxiaoNeural

⸻

🛠️ 面向开发者

本插件已支持 Manifest V3，适配新版 Chrome 插件生态。开发建议：

# 安装依赖（如需使用构建工具）

npm install

# 打包/构建（可选）

npm run build

⸻

📌 相关项目推荐
• 🔊 Local-TTS-Service：本地部署的高性能 TTS 服务端
• 💡 tts-chrome-extension：本插件的独立仓库（可选）
