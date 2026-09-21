# ≤Ø6 螺钉选型（证据汇总）静态站

纯前端单页应用：从证据 Excel 抽取公开供应商/标准数据，供塑料自攻与机牙+嵌件选型查阅。**禁止编造数值**——页面只展示 Excel/JSON 中有出处的数据。

## GitHub Pages

预期地址：https://wenzhangzhou.github.io/jisuanhuizong-ggb/screw/

启用方式（若尚未开启）：仓库 **Settings → Pages → Build and deployment → Source** 选 **Deploy from a branch**，Branch 选 `main`，Folder 选 `/ (root)`，Save。

## 本地打开

```bash
cd screw
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080/
```

（`file://` 下 `fetch` 证据 JSON 可能被浏览器拦截，请用本地 HTTP。）

## 数据加载

1. 优先：`data/data.core.json` + `data/data.extra.json`
2. 其次：`data/data.json`
3. 回退：`data/parts/*.json`（几何可拆分为 `geometry.a.json` + `geometry.b.json`）

`data.js` 仅为兼容占位；真实证据由 `data.loader.js` 异步加载。

## 数据来源

- 源文件：`螺钉选型_D6及以下_Nm_有出处.xlsx`
- 用 `openpyxl`（`data_only=True`）抽取，禁止编造数值
- 关键 PEM 核对：ABS M2=0.3、M4=2、M5-1=5.1、M5-2=6.8、M6-1/M6-2=7.3；Ø4 PC/ABS d0=3.2

## 声明

仅汇总公开供应商/标准数据，非设计保证；空值需试验或供应商 CALC；GF/LGF 几何可能为最邻近材料近似。
