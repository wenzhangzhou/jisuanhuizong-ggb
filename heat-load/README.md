# 箱体热负荷计算（heat-load）

工程估算：六面保温 + 门封/温差型热桥 → **KA_box** 与 **Q_steady**；选型冷量 **Q_cap = K·Q_steady**（拉温 Q_pull 单独展示）。

- 默认面积模式：内外均值（mean）；Ψ_seal 默认 0.04
- 可交接空载降温页：复制 KA / Pin / Tamb
- 本地方案库 localStorage：`heatload-schemes-v1`（经 CloudLoaderInject）

页面源：`page.html.gz.b64`（由 index.html 解压注入）。
