# EPL 2026–27 單雙雙版本協議｜2026-11-09

**Policy ID**：`EPL-PARITY-2TRACK-20261109`  
**生效範圍**：英超 2026–27 **GW11 起**新開立之賽前紀錄；GW1–GW10 歷史不倒填。  
**資料狀態**：`POLICY_ACTIVE / SHADOW_NOT_RUN`。此文件不是 GW11 方向預測或已訓練模型的證明。

## 兩條獨立模型線

| ID | 顯示名稱 | 身分 | 來源與現況 |
|---|---|---|---|
| `OFFICIAL` | Official（現行正式單雙） | 正式 | 沿用 EPL 現有賽前封存 Record 及既定模型線；不以 Recovery 替代；初盤與 PRE-KICK 仍各自留版。 |
| `R90_RECOVERY_SHADOW` | R90 Recovery Shadow | Research / Shadow | 用舊 R90 方向五模型與 Q 排序架構重新構建的候選線。**原始 Exact 權重缺失**；截至本協議，新的方向模型＋排序器尚未產生經驗證的可執行賽前封存，故 `NOT_RUN`。不得沿用舊 73.7% 作新模型預期勝率。 |

## 每輪固定輸出

1. 兩版各自 **完整 10 場單雙方向**、各自 **R1 / R2 / R3**，亦允許低把握場為 `PASS`；PASS 不計算命中率，但不因湊 R1/R2/R3 而降低選場標準。若全輪不足三場有效預測，R 位應標 `MISSING / NOT_RUN`，不得創造內容填滿。
2. 每版具獨立 `record_id`、`model_version`、模型來源雜湊、賽前 `prediction_cutoff_utc`、該輪 `first_kickoff_utc`、快照來源、模型方向與排行、`seal_sha256`。Shadow Record ID 後綴固定為 `R90-RECOVERY-SHADOW`。
3. **Official 和 Shadow 使用同一輪、同一場次、同一賽前 cutoff 與市場快照**才可同場比較；同輪多場若開始時間不同，採最早開賽前截止，不得用已開賽場比分影響同輪其他選場。
4. 分清 `OPEN / OPENPROXY / PRE-KICK`，同版本賽後才追加 `RESULT`，不能用終盤反填初盤。Official 原方向永不改寫；Shadow 也要賽前凍結才計分。
5. 計分各自列 **全輪、R1、R2、R3、R1+R2、R1+R2+R3**；逐輪與累計分別計算。Research / Shadow 絕不混入 Official 命中率。未有賽前封存一律為 `NOT_RUN`，不得視為 0% 或當成實際命中。
6. 預計用至少 **50–100 筆新輪次賽前封存選場**做公平前推比較，再考慮是否升級；採用與否依樣本外表現與時間稽核，不因單輪結果改閾值。舊 R90 的 2022–25 歷史成績是獨立研究資料，不能併入新的 Shadow 前推。

## 現況與操作約束

- 目前 EPL Dashboard 已存 GW6–10 的正式預測，**不對 GW6–10 補建 Shadow 預測**。
- `data/epl_parity_dual_track.json` 為資料來源；`tools/build_epl_parity_dual.py` 驗證並產生供離線 Dashboard 使用的 `epl-parity-tracks.js`。Shadow 新紀錄必須先通過模型實際執行、開賽前封存與驗證，不能只修改標籤。
- 目前 `shadow_records=[]`，狀態 `NOT_RUN`，故 Shadow 命中率顯示 `—`。
- 研究恢復來源：`research/R90_V1_Recovery_Research_Report_20261109.md`、`research/R90_V1_Stage3_Recovery_Report_20261109.md`。

**Policy 不等於預測已執行。** `OFFICIAL` 的既有 Master Record、賽前排名、比分、過往 Settlements 全部保持不變。