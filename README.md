# Chrome Extension for LocalTTS

1. 在 Chrome 地址栏输入 `chrome://extensions/` 打开扩展管理页，开启“开发者模式”。
2. 点击“加载已解压的扩展程序”，选择 `chrome_extension/` 目录。
3. 在扩展图标的右键菜单或点击弹出页即可朗读网页内容。
4. 先在扩展的“选项”页面中填写本地服务地址和 API Token。地址必须包含 `http://` 或 `https://` 前缀，
   以便在 HTTP 与 HTTPS 页面中都能正确调用服务。
5. 如果服务未提供 `/v1/audio/all_voices` 接口，插件会使用 OpenAI 默认的几个音色（alloy、echo、fable、onyx、nova、shimmer）。
