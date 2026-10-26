# PiLookup π

探索圆周率的无限可能 —— 在小数点后 1 亿位中，即刻定位任意数字片段。

**纯前端 · 零后端 · 数据即页面**

在线访问：[pai.suois.com](https://pai.suois.com/)

## 功能

- **按位查询**：输入位置（1 ~ 1 亿），返回小数点后该位的数字
- **区间查询**：支持一次返回最多 1000 位连续数字（如"第 5 位起的 10 位"）
- **结果上下文**：展示查询结果前后各 16 位，琥珀色高亮命中片段
- **一键复制 / 回车查询 / 快捷示例**

## 架构：数据即页面

整个站点只有两样东西：

```
pi-lookup/
├── index.html      ← 应用本体（查询逻辑 + UI，无构建、无依赖）
└── data/           ← pi_1.txt ~ pi_100.txt，每片 100 万位纯数字
    └── pi_101.txt  ← 8 位冗余（不影响前 1 亿位查询）
```

**查询原理**：定位是一条 O(1) 公式，无需任何服务端计算——

```
分片号  = ceil(位置 / 1,000,000)
片内偏移 = (位置 - 1) mod 1,000,000
```

浏览器按需 `fetch` 对应分片（gzip 后约 250KB），在内存中 `slice` 取数，命中缓存后零网络请求。

### 为什么不用后端？

| | 本站（纯前端） | 传统后端方案 |
|---|---|---|
| 服务器费用 | 0 | 常驻算力 |
| 并发能力 | CDN 无限扩展 | 受服务器限制 |
| 被滥用风险 | 无（静态层无法被打挂） | 需要限流/鉴权 |
| 首查延迟 | ~250KB 下载 | 毫秒级 API |

随机访问类查询（查第 N 位）天然是静态数据的主场。

## 把静态文件当 API 用

数据文件本身就是公开 API，无需注册、无需 key、没有配额：

### 程序化查询（整片下载 + 本地切片）

```python
import urllib.request
from functools import lru_cache

CHUNK = 1_000_000
BASE = "https://pai.suois.com/data"

@lru_cache(maxsize=None)          # 同一分片只下载一次
def get_chunk(i):
    return urllib.request.urlopen(f"{BASE}/pi_{i}.txt").read().decode()

def pi_digit(position, count=1):
    end = position + count - 1
    out, cursor = "", position
    while cursor <= end:
        i = (cursor + CHUNK - 1) // CHUNK
        txt = get_chunk(i)
        start = (i - 1) * CHUNK
        out += txt[cursor - start - 1 : min(end, i * CHUNK) - start]
        cursor = i * CHUNK + 1
    return out

print(pi_digit(5, 10))            # → 9265358979
```

> **关于 HTTP Range**：部分托管平台（GitHub raw、Vercel 等）支持 `Range: bytes=offset`
> 只取需要的几十字节；但 **Cloudflare Pages 实测不支持**（返回 200 全量）。
> 好在每片仅 1MB（gzip 后约 250KB），整片下载 + 内存缓存已足够轻量。

### 全文搜索（如：20080808 是否出现在前 1 亿位）

需要下载全部分片（gzip 后约 25MB）后在本地扫描：

```python
import urllib.request
from functools import lru_cache

BASE = "https://pai.suois.com/data"

@lru_cache(maxsize=None)
def get_chunk(i):
    return urllib.request.urlopen(f"{BASE}/pi_{i}.txt").read().decode()

def search(pattern):
    hits, carry = [], ""
    for i in range(1, 101):
        text = carry + get_chunk(i)
        start, base = 0, (i - 1) * 1_000_000 - len(carry)
        while (pos := text.find(pattern, start)) != -1:
            hits.append(base + pos + 1)
            start = pos + 1
        carry = text[-(len(pattern) - 1):]   # 留尾巴，防止跨片漏配
    return hits

hits = search("20080808")
print(f"共出现 {len(hits)} 次：{hits}")
```

## 数据可信度

全部 **100,000,008** 位已与 MIT 公开的十亿位 π 文件
（[`pi-billion.txt`](https://stuff.mit.edu/afs/sipb/contrib/pi/pi-billion.txt)）
**逐位全量比对，零差异**。

> 注：部分 π 查询 API（如 pi.delivery）实测会对任意位置返回 π 开头序列等假数据，
> 使用第三方数据源时建议做外部比对。

## 部署

纯静态，任意静态托管均可。以 Cloudflare Pages 为例：

- Framework preset: `None`
- Build command: 留空
- Build output directory: `/`

## 技术细节

- 分片粒度 100 万位：受托管平台单文件 25MiB 上限约束的反向最优——配合 HTTP Range
  可将单次程序化查询的流量压到几十字节
- 前端分片缓存（`Map`）+ 浏览器 HTTP 缓存 + CDN 边缘缓存，三层缓存下重复查询零下载

## Credits

由 [CodeBuddy](https://www.codebuddy.ai) 设计与制作。
