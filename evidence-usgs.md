# Evidence — usgs-earthquakes 全链路验证（2026-10-11，进行中）

[1011-SPEC.md](1011-SPEC.md) 的执行结果记录。**本轮尚未完成**：Phase 0–3（上游实测、脚手架、
本地 testnet 验证、构建产物冒烟）全部通过；Phase 4/5（公网部署 + 真实付费 + 反向不结算）
被**资金闸门**挡住，`service.yaml` 因此停在 `status: draft`。服务摘要见
[services/usgs-earthquakes/README.md](services/usgs-earthquakes/README.md)；原始取证文件
（未改动的 curl / 脚本输出）复制在本地证据仓 `kiteai-builder/week4/evidence-raw/`，
未收录进本仓库。

## 环境与参与者

| 项 | 值 |
|---|---|
| 服务 host | **未部署**（Phase 4 待执行）。本地跑在 `:8091`（`tsx src/index.ts`）与 `:8092`（`node dist/index.js`） |
| 部署形态（计划） | Render Web Service，Root Directory `services/usgs-earthquakes`，Build `npm ci && npm run build`，Start `node dist/index.js`，Health `/healthz`，`NODE_VERSION=22` |
| network | `eip155:2368`（Kite 测试网） |
| 上游 | USGS FDSN event API `https://earthquake.usgs.gov/fdsnws/event/1`（`api: 2.8.1`，无 key、无公开速率限制、公共领域条款） |
| 付费资产 | pieUSD `0x38129cf4CE5E183eFF248F42A7D345Bb1B47621A`（18 位精度；EIP-712 domain `name`/`version` = `pieUSD` / `1`） |
| 价格 | `$0.001`/次 → `amount = 1000000000000000` |
| facilitator | `https://facilitator.pieverse.io/v2` |
| `PAY_TO`（收款方） | `0x1a8374b0F0D1074849e0cA31589532C2ad2806d8`（与另两个服务同一钱包） |
| 付款方 | `0x010F7992CE7806c291d1F494e44EF1840B7e4584`（自建 harness **fxpayer4**，本轮新生成；源码在 `kiteai-builder/week4/fxpayer4/`） |
| 付款资金来源 | **尚未到位** —— 这是本轮唯一阻塞。私钥只在 `~/.kite-x402/fxpayer4.key`（0600，仓库外、`/tmp` 外），绝不入库、绝不打印 |

## 验证结果

### 1. 上游预检（直连 USGS，不花钱）— 全部通过

| # | 检查 | 结果 | 原始证据 |
|---|---|---|---|
| 1 | `example_request` 实测 | `GET /query?format=geojson&starttime=2026-10-01&endtime=2026-10-07&minmagnitude=5.5&limit=5&orderby=magnitude` → **200**，3565 B，0.93 s，`metadata.status=200 api=2.8.1`，4 个 feature（M5.9 印尼 Tambolaka / M5.8 俄 Vilyuchinsk / M5.8 Severo-Kuril'sk / M5.5 阿拉斯加 Aleneva） | `01-upstream-preflight.txt` |
| 2 | 反向触发器（4 个） | `starttime=not-a-date`、`format=banana`、`limit=99999`、未知参数 `zzz=1` → 全部 **400** `text/plain`（`Bad starttime value` / `Bad format value` / `0 <= limit <= 20000` / `Unknown parameter "zzz"`） | 同上 |
| 3 | **jsonerror 陷阱** | `starttime=not-a-date&jsonerror=true` 与 `limit=99999&jsonerror=true` → **HTTP 200** + `metadata.status:400`、`title:"Search Error"`。本 wrapper「上游 < 400 才结算」，所以这种失败查询**会被收费** → 已写进 README 警告与 manifest `pitfalls` 第一条；不改代码（改则破坏「src 与模板逐字节相同」或触发两模板同步义务） | 同上 |
| 4 | `/count` 端点 | **200** `{"count":4,"maxAllowed":20000}` —— 经同一代理可用，但本轮**不写进 manifest**（声明的端点必须有付费实测的 `example_request`） | 同上 |

### 2. 脚手架与本地 testnet（免费部分）— 全部通过

| # | 检查 | 结果 | 原始证据 |
|---|---|---|---|
| 5 | 「配置而非分叉」 | `diff -r templates/typescript-express/src services/usgs-earthquakes/src` → **无输出**（逐字节相同，含 `kite.ts`）；`npm ci` + `npm run typecheck` 通过 | `02-local-healthz-and-402.txt` |
| 6 | base-path 拼接（`index.ts:69`） | `/v1/query?…` → `https://earthquake.usgs.gov/fdsnws/event/1/query?…`，query 完整保留；`/v1/count` 同理 → **PASS** | 同上 |
| 7 | `GET /healthz` | **200** `{"ok":true,"network":"eip155:2368","asset":"pieUSD","price":"$0.001"}`；启动行 `kite x402 service on :8091 -> https://earthquake.usgs.gov/fdsnws/event/1 (network eip155:2368, $0.001 per call to 0x1a83…06d8)` | `02-local-healthz-and-402.txt` |
| 8 | 未付费 `GET /v1/query` | **402** + `PAYMENT-REQUIRED`；base64 解码断言 **4/4 PASS**（`network=eip155:2368`、`extra.name=pieUSD`、`extra.version=1`、`amount=1000000000000000`），`resource.description` = `USGS earthquake catalog queries behind x402 on Kite` | `03`–`06` |
| 9 | 构建产物冒烟（= Render 上的 Build/Start 命令） | `npm run build` → `dist/index.js` + `dist/kite.js`；`node dist/index.js` 在 `:8092` → healthz 200 + 未付费 402 解码 **4/4 PASS** | `09-build-smoke.txt` |
| 10 | manifest 校验 | 仓库根 `npm run validate` → exit 0，`✓ 3 service manifest(s) valid` | `10-validate.txt` |
| 11 | 付款 harness 端到端管路 | fxpayer4 正确签出 EIP-3009 授权（`validAfter=1791714295` 回拨 7200 s、`validBefore=1791725095`、`value=1000000000000000`、`to=0x1a83…06d8`），带 `PAYMENT-SIGNATURE` 重试 → 服务返回 **402**，`PAYMENT-REQUIRED` 的 `error` 字段为 **`insufficient_funds`**，1.354 s，**未触达上游、未产生任何扣费**。即管路已通，只差余额 | `07-local-harness-unfunded-smoke.txt` |

### 3. 尚未执行的验收项（被资金闸门阻塞）

| # | 验收项 | 状态 | 阻塞原因 |
|---|---|---|---|
| 12 | 本地真实付费 → 200 + GeoJSON + 结算 tx（收款方 == `PAY_TO`） | **pending** | 付款方余额 0 |
| 13 | 公网部署 + `verify_public.sh` ALL_PASS | **pending** | 需先 push（Render 从 GitHub 构建）+ 用户确认 |
| 14 | 公网真实付费 → 200 + 结算 tx（**验收标准 5**） | **pending** | 同 12 |
| 15 | 反向 `starttime=not-a-date` → 400 且无结算（**验收标准 2 反证**） | **pending** | 免费，但需要**有余额**的付款方才有意义（余额为 0 时「未结算」是平凡结论） |
| 16 | `service.yaml` 转 `status: testnet` + `base_url` | **pending** | 依赖 13/14 |

### 4. 余额审计（pieUSD，18 位精度，RPC `eth_call balanceOf`）

| 钱包 | 轮初（2026-10-11T12:24Z） | 说明 |
|---|---|---|
| 收款方 `0x1a83…06d8` | **0.002000**（2000000000000000 units） | 当前唯一可用资金源（MetaMask 里） |
| 付款方 `0x010F…4584`（fxpayer4，本轮新建） | **0.000000** | 待用户从收款方转 0.002 |
| 上周付款方 `0xB61D…5e5f`（fxpayer3） | 0.001000 | **沉没**：私钥只在 `/tmp/fxpayer3/payer.key`，已随 `/tmp` 清理丢失 |

本轮**零笔结算交易**（未发起任何成功付费），因此余额零变动。计划资金流：用户转 0.002 →
本地付费 1 笔 → 公网付费 1 笔 → 两笔各回流 0.001 到收款方，轮末付款方归零、收款方回到
0.002（净变化为零，不再留沉没资金）。

## 本轮暴露的环境/流程问题

- **测试网链头停止推进（新发现，影响 Phase 5）**：同一个 head block `22042197`
  （head_ts `2026-10-11T11:36:42Z`）在 12:01:40Z 与 12:24:25Z 两次采样之间**没有变化**，
  滞后从 25.0 min 涨到 47.7 min，即约 23 分钟内没有出块。付费调用时若链仍停滞，结算可能
  长时间不确认 → 执行 Phase 5 前必须重新采样 head，确认链在推进；`BACKDATE_SECONDS`
  取 `max(7200, lag+1800)`。
- **本地端口被上周遗留进程占用，导致首次验证结果被污染（流程教训）**：一个 2026-10-04 17:08
  启动的 `node dist/index.js`（cwd `services/open-meteo-weather`，上周 Phase 3 构建冒烟的残留）
  连续 7 天占着 `:8080`。本轮第一次「本地验证」的请求全被它接走 —— `/healthz` 与 402 的
  network/asset/amount 两个服务完全一样，看不出异常，只有 `resource.description` 是上周服务的
  兜底文案才露出马脚。已 kill 该进程，并改用 `:8091`/`:8092` + **断言启动行里的 upstream**
  重跑，`verify_public.sh` 也新增了第 5 条断言（`resource.description` 含 `USGS`）。
  教训：本地验证前必须 `lsof -nP -iTCP:<port> -sTCP:LISTEN` 清场，并核对启动日志里的上游地址。
- **`.env` 里带空格的值必须加引号（真实 bug，两个服务都踩了）**：本服务 `.env` 与
  `services/open-meteo-weather/.env:5` 的 `SERVICE_DESCRIPTION=` 都未加引号，而 `.env` 是靠
  `set -a; . ./.env` 由 shell 读取的（应用本身不加载 dotenv）→ 值被截断、变量丢失，402 里
  只剩兜底文案 `Paid API wrapped for the Kite network`。`frankfurter-fx` 的写法（带引号）才是
  对的。**只影响本地开发**：Render 上的 env 由面板注入，公网服务的 description 是正确的。
- **付款方私钥放 `/tmp` 会丢**：上周 0.001 pieUSD 因此沉没 → 本轮改放 `~/.kite-x402/`（0600）。
- **kpass 不能支付自建 host**：`agent:session execute` 只放行 Kite 服务目录内 host
  （`host_not_in_executable_catalog`），沿用 2026-10-04 实测结论。
- **测试网水龙头全渠道停摆**：`kpass faucet`（prod/staging）禁用、网页水龙头后端 500 →
  新钱包领不到 pieUSD，资金只能来自已有余额的钱包。

## 复现（免费部分，不花资金）

```bash
cd services/usgs-earthquakes
npm ci && npm run typecheck
diff -r ../../templates/typescript-express/src src          # 必须无输出
set -a; . ./.env; set +a; export PORT=8091
npx tsx src/index.ts &                                       # 启动行须显示 USGS 上游
curl -i localhost:8091/healthz                               # 200
curl -sD- -o /dev/null "localhost:8091/v1/query?format=geojson&starttime=2026-10-01&endtime=2026-10-07&minmagnitude=5.5&limit=5&orderby=magnitude"   # 402
npm run build && PORT=8092 node dist/index.js                # 构建产物冒烟
cd ../.. && npm run validate                                 # ✓ 3 service manifest(s) valid
```

## 下一步（需要用户动作）

1. **转账**：MetaMask 从 `0x1a8374b0F0D1074849e0cA31589532C2ad2806d8` 转 **0.002 pieUSD** 到
   `0x010F7992CE7806c291d1F494e44EF1840B7e4584`（需一点 KITE testnet gas）。
2. **确认 push**：Render 从 GitHub 构建，必须先推 `feat(services): add usgs-earthquakes x402 wrapper`。
3. **Render 部署**：按 Phase 4 配置（Root Directory `services/usgs-earthquakes`、Free、
   Health `/healthz`、`PAY_TO` 设 Secret、不设 `PORT`），把真实 host 告知。
4. 之后执行 Phase 5（公网付费 + 反向）与 Phase 6（manifest 转 `testnet`、看板提交）。
