# Cielaria · 悬崖上的云中村落

A129 独立仓库网页：把一座新海诚式悬崖村落铺进浏览器。拖拽环绕、滚轮拉近、点房子看结构；可换种子、密度和昼夜。

## 线上地址

- 首页：https://dannyling111.github.io/a129-cielaria/
- 仓库：https://github.com/dannyling111/a129-cielaria

纯静态 WebGL 页，打开即可。窗口贴图用平面贴花 + 多边形偏移，旋转时不再和墙体抢深度。

## 怎么玩

- 拖空白旋转，滚轮缩放
- 点一栋房子看网格与承重
- 换 Seed / Stack 重建村落
- 切 Day / Golden / Dusk
- `R` 重建，空格开关自转

## 本地

```sh
npm install
npm run dev
```

构建：

```sh
npm run build
```

`dist/` 就是 GitHub Pages 发布目录。
