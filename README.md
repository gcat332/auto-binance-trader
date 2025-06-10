# 🚀 Trading Bot – บอทเทรดอัตโนมัติสำหรับ Binance พร้อม Rule Engine ยืดหยุ่นสูง

![Python](https://img.shields.io/badge/Python-3.9%2B-blue)
![Binance](https://img.shields.io/badge/Binance-Exchange-yellow)
![React](https://img.shields.io/badge/React-UI-green)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-blueviolet)

---

## ภาพรวม

**บอทเทรดอัตโนมัติสำหรับ Binance** ที่ออกแบบให้แก้ไขได้ง่าย ทดสอบได้จริง และยืดหยุ่นสูง  
สร้างกลยุทธ์เทรดด้วย Rule Engine ที่อ่านง่าย (JSON)  
มี UI สำหรับสร้างเงื่อนไขเทรดแบบลาก-วาง รองรับการทดสอบย้อนหลัง (backtest) และต่อยอดสำหรับเทรดจริง

---

## ✨ ฟีเจอร์เด่น

- **Rule Engine ปรับแต่งได้เอง**
  - มี UI สำหรับสร้างกฎ (React)
  - รองรับ Indicator ยอดนิยม (EMA, RSI, MACD, PRICE, VOLUME, BREAKOUT, CANDLE, TIME ฯลฯ)
  - กำหนด AND/OR ซ้อนกันหลายชั้น, Cross, เทียบค่า, Manual Value, ฟิลเตอร์เวลา

- **โหมดเทรดจริง & Backtest**
  - เชื่อมต่อ API Binance หรือใช้ mock data ทดสอบกลยุทธ์ย้อนหลัง

- **Multi-Asset, Multi-Scope**
  - รองรับ Spot และ Futures
  - เทรดได้หลายเหรียญพร้อมกัน

- **Log ผลลัพธ์อ่านง่าย**
  - มีไฟล์ HTML สรุปผล log สีสันอ่านง่าย (เช่น test_output_colored.html)
  - เก็บประวัติการเทรดแบบละเอียด

- **ขยาย/ต่อยอดง่าย**
  - เพิ่ม indicator หรือ pattern ใหม่ได้เอง
  - โค้ดอ่านง่าย เหมาะสำหรับนำไปต่อยอด

---

## 📂 โครงสร้างโปรเจ็ค

```
trading-bot/
│
├── indicator.py               # คำนวณ Indicator ทุกประเภท (EMA, RSI, MACD, ... output เป็น dict)
├── rule_engine.py             # Engine สำหรับเช็ค rule logic และสั่ง order
├── test.py                    # สคริปต์เทส logic ทั้งชุด + log สีสวย
│
├── mockup_indicator.json      # ตัวอย่าง indicator data สำหรับทดสอบ/backtest
├── mock_rule_set.json         # ตัวอย่าง rule set (เงื่อนไขทุกรูปแบบ)
│
├── ema.json, rsi.json, macd.json  # ไฟล์ config สำหรับ indicator (ใช้กับ indicator.py)
│
├── RuleBuilder.jsx, ...       # React component สำหรับสร้าง rule ผ่าน UI
│
└── test_output_colored.html   # ไฟล์ log ทดสอบ (HTML มีสี)
```

---

## 🛠️ วิธีเริ่มต้น

### 1. **Clone และติดตั้ง Dependency**
```bash
git clone <repo-url>
cd trading-bot
pip install -r requirements.txt
```

### 2. **ตั้งค่า Indicator และ Rule**

- แก้ไขไฟล์ config:
  - `ema.json`, `rsi.json`, `macd.json`
- ตั้งค่า rule:
  - `mock_rule_set.json` (มีตัวอย่าง rule ทุกแบบ)
- ใช้ `mockup_indicator.json` สำหรับ backtest

### 3. **รันทดสอบ Batch Test**

```bash
python test.py
# จะได้ log ที่หน้าจอ และไฟล์ HTML สี (test_output_colored.html)
```

### 4. **รัน Backend (API/UI)**

```bash
uvicorn main:app --reload
# เปิดดู API ได้ที่ http://localhost:8000
```

---

## 🧠 รูปแบบ Rule (JSON)

```json
{
  "type": "condition",
  "indicator": "RSI",
  "name": "RSI14",
  "operator": "cross_down",
  "compared": "oversold"
}
```
**รองรับ:**
- `operator`: `>`, `<`, `=`, `>=`, `<=`, `cross_up`, `cross_down`
- `compared`: ชื่อ indicator, manual value, overbought/oversold, etc.
- ฟิลเตอร์เวลา: `["09:00", "17:00"]`
- ซ้อนกลุ่มด้วย AND/OR ได้ไม่จำกัดชั้น

**ดูตัวอย่างทั้งหมดในไฟล์ `mock_rule_set.json`**

---

## 🧪 Backtest

- วาง `mockup_indicator.json` และ `mock_rule_set.json` ในโฟลเดอร์หลัก
- รัน `python test.py`
- ตรวจสอบผลลัพธ์ในหน้าจอและดูสรุปสีสวยใน HTML

---

## 📈 Indicator Calculator (Python)

- รับข้อมูล OHLCV bar ทีละแท่ง (dict)
- คำนวณ indicator ทั้งหมดอัตโนมัติในโครงสร้างเดียว
- ใช้งานกับข้อมูลจริงหรือย้อนหลังก็ได้

---

## 🖥️ Rule Builder UI (React)

- สร้างกฎเทรดแบบลาก-วาง เลือก AND/OR/Group ซ้อนเงื่อนไข
- Dropdown indicator/operator/value/cross/manual
- Export/Import logic เป็น JSON ได้เลย

---

## ⚡ Roadmap / ไอเดียเพิ่ม

- [ ] เพิ่ม Candlestick Pattern อื่นๆ
- [ ] ระบบแจ้งเตือน (Line, Discord, ฯลฯ)
- [ ] Web UI dashboard สำหรับ Monitoring & Manual trade
- [ ] รองรับ plugin custom indicator เพิ่ม

---

## 🙏 ขอบคุณ

- Binance API
- pandas, numpy, FastAPI, React
- [TradingView](https://tradingview.com) (แรงบันดาลใจ UI)

---

## 📬 Feedback / Suggestion

อยากได้ฟีเจอร์อะไรเพิ่ม แจ้ง Issue หรือ Pull Request ได้เต็มที่!

---

_ขอให้กำไร!_ 🚀

