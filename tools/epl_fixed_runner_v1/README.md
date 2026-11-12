# 英超單雙雙版本｜固定執行系統 V1

**版本**：`EPL-FIXED-RUNNER-V1-20261112`　**狀態**：`FIXED_INFERENCE_REPLAY_PASS / LIVE_SOURCE_PIPELINE_NOT_YET_VERIFIED`

此套件固定重跑 **A：EPL R90-style MARKETPROXY Official 當年 GW11 的代理公式** 與 **B：R90 Math5-Q Recovery Shadow 研究模型**。原始 OLD R90 Exact 方向／排序器權重仍失蹤，因此**兩個版本都不可稱為 OLD R90 Exact**。GW11 原 Official Record 永遠不被改寫；此程式生成的新輪次版本須先完成賽前資料稽核及獨立封存，不能自行升級為 Official。

## 已完成的可重複執行功能

- 程式沒有 GW11 球隊、場次、賠率、比分或年份表；只讀 `--input` 與固定版 `assets/` 權重、先驗表。
- 同一套程式支援不同 GW 的 10 場賽前輸入，產生 1X2、OU2.5、A/B 單雙、各市場 R1/R2/R3；Shadow 的 Q 僅為**未校準的相對排序分數**。
- 模型 `joblib`、上一季單雙先驗表使用 SHA-256 雜湊鎖定；運行時不重新訓練、不用賽後比數。
- `--mode prematch` 會要求賽前市場報價、球隊數據都有資料來源和正確捕捉時間；要求 10 場 20 隊無重複、首場開踢時間正確、沒有賽果欄位。失敗直接阻擋。
- 升班馬如果上一季歷史樣本不足 6 場，沿 GW11 舊規則給 0.5 中性先驗；不得臨時替換。
- 模型只認 `2026-27`；跨賽季需要重新凍結先驗/模型與新版本。

## 安裝（Windows / macOS / Linux）

Python 3.13；在解壓縮目錄執行：

```bash
python -m pip install -r requirements.txt
python tests/test_pipeline.py
```

Windows PowerShell 同樣可以使用 `python` 命令。`joblib` 是 Python 模型檔，**只應讀取這份你自己持有、已核對雜湊的封存包**，不要載入不明來源 `.joblib`。

## GW11 既有資料重播

此套件內含 GW11 的 `inputs/*.csv` 與 `inputs/gw11_meta.json`（資料來源保留先前封存身份，獨立的逐筆賠率捕捉時間仍缺失）。先把三份 CSV 組合成標準賽前輸入：

```bash
python prepare_input.py --meta inputs/gw11_meta.json --fixtures inputs/gw11_fixtures.csv --odds inputs/gw11_odds.csv --teams inputs/gw11_team_stats.csv --output outputs/gw11_prepared.json
python run_epl_fixed.py --input outputs/gw11_prepared.json --mode replay --output-dir outputs/gw11
```

也可以直接使用 `inputs/gw11_archived.json` 作 `--mode replay`。結果檔：`forecast.json`、`MODEL_OUTPUTS.csv`、`SHA256SUMS.json`。

**驗證結果：** 新的 38 欄 `MODEL_OUTPUTS.csv` 的 SHA-256 和歷史封存 **完全相同**：`4d5ea7a0e7ab84bf667ecf6a3958b41f6250682d091432682ce63272420cf08d`；10 場方向與全部 R 位也一致。

## 未來 GW12、GW13 ... 的執行方法（不用修改程式碼）

1. 從具名來源取得**下一輪**的 `fixtures.csv`、`odds.csv`、`team_stats.csv`。賠率需保留 1X2 主/和/客與大小2.5 大/小的十進位價格，AH 可選；成績數據須截止於本輪開賽前，不能混進本輪比分。
2. 新增 `meta.json`，填 `purpose=PREMATCH`、`season=2026-27`、`gw`、獨立 `record_id`、時間含時區的 `prediction_cutoff_utc`、`first_kickoff_utc`、各資料來源 URL 及真實捕捉時間 `captured_at_utc`。`market_snapshot` 和 `team_snapshot` 的 `capture_time_verified` 必須有真實依據才能設為 `true`。`team_snapshot.through_gw` 必須早於目標 GW。
3. 按上面 `prepare_input.py` 指令換檔名，輸出新的標準 JSON；再執行：

```bash
python run_epl_fixed.py --input outputs/new_round.json --mode prematch --output-dir outputs/new_round
```

此模式只標記 `PREMATCH_PROVISIONAL_NOT_AUTOMATICALLY_OFFICIAL`；**尚需獨立核實來源、鎖定輸入 SHA/模型 SHA、追加到 Master，才是有效的正式賽前 Record**。所有資料必須實際取得，不能依回測／過去結果填入。

## 來源、回測與已知限制

- `assets/R90_RECOVERY_MATH5_SHADOW_GW11.joblib`：2026-11-09 已封存的五方向模型與 Q 排序器，雜湊 `c9142f32d71088fe2cdddd9c8b183962347a7b5aab041921c63eca5667909917`；只在推論使用，**不重訓**。
- `assets/prior_rates_2025.json`：2025–26 已完賽的 last10 parity 跨隊先驗及原始別名，按舊程式原則封存。`provenance/EPL_Parity_History_FeatureCache_4180.pkl` 為歷史研究快取，**推論時完全不讀取**，僅保留來源證據。
- `provenance/epl_gw11_forecast_OLD_HARDCODED_ARCHIVE.py`：原來硬編碼 GW11 的程式，只作查核，固定執行引擎不匯入。
- `tests/GW11_MODEL_OUTPUTS.csv`：原封存的 GW11 基準；`tests/test_pipeline.py` 包含 10 類檢驗：完整 CSV 位元組重播、相同輸入跨次一致、輸入順序不敏感、模擬另一輪、資料缺漏/後視/時間/權重異常阻擋。
- **模擬 GW12 只是 TEST_ONLY 工程測試，沒有任何真實賽程或預測用途。**
- 本程式**不自動下載**網站的賽程、賠率或球隊數據，也不保證網路來源正確；外部來源的捕捉/核實流程仍需部署並稽核。它解決的是「固定、可攜、可驗證的賽前資料 → 確定性模型輸出」。
- 固定並不保證高準度。舊 R90 Exact 尚未恢復；新 Shadow 的歷史樣本外表現並沒有證明 70% 勝率。保留 PASS／Research 狀態與獨立績效評估。

## 稽核及資料結構

主程式 `run_epl_fixed.py`、匯入器 `prepare_input.py`、`model_manifest.json`、`requirements.txt`、`SHA256SUMS.txt`、`tests/`、`inputs/`、`assets/` 皆包含在 ZIP 中。未來更動模型、特徵規則或先驗表，必須建立 **V2／新的模型 ID**；不允許悄悄改掉此 V1。