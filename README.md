# 莉凱空間配置

莉凱家俱的 3D 空間配置網頁：輸入室內坪數與格局，設定門窗、裝潢風格，把莉凱家俱的沙發、床、餐桌、單椅、茶几擺進房間看看。

- 正式網址：https://likai-room.netlify.app
- 純前端（Three.js），不需要伺服器，打開 `index.html` 就能用

## 檔案

| 檔案 | 內容 |
|---|---|
| `index.html` | 介面與操作（坪數粗估、門窗設定、裝潢風格、擺放、分享） |
| `models.js` | 家具 3D 模型，自動擷取產生，請勿手改 |
| `extra-models.js` | 自己建的款式：蜂巢簾、穿越簾、茶几、單椅 |
| `styles.js` | 裝潢風格（北歐、奶油、輕奢、現代、簡約、侘寂、美拉德）與材質貼圖 |

`models.js` 的部分建模程式來自 [andytsai-000/furniture-planner](https://github.com/andytsai-000/furniture-planner)。
