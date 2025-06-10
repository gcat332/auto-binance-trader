
# 🚀 Trading Bot – บอทเทรดอัตโนมัติ Binance (Fullstack Backend + Frontend)

![Python](https://img.shields.io/badge/Python-3.9%2B-blue)
![Binance](https://img.shields.io/badge/Binance-Exchange-yellow)
![React](https://img.shields.io/badge/React-UI-green)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-blueviolet)

---

## ภาพรวม

Trading Bot สำหรับ Binance ที่มีทั้งฝั่ง Backend (Python + FastAPI)  
และ Frontend (React) ใช้งานง่าย รองรับ Rule Engine กำหนดกลยุทธ์แบบยืดหยุ่น  
เหมาะกับการเทรดจริง, ทดสอบกลยุทธ์ย้อนหลัง และต่อยอด

---

## ฟีเจอร์เด่น

- **Rule Engine UI (Frontend):**
  - สร้าง/แก้ไขกฎเทรดผ่านเว็บ (ลาก-วาง, Dropdown)
  - ครบทุก Indicator: EMA, RSI, MACD, PRICE, VOLUME, BREAKOUT, CANDLE, TIME ฯลฯ
  - รองรับ Cross, Manual Value, Nested AND/OR, Filter เวลา

- **Backend (FastAPI + Python):**
  - คำนวณ Indicator
  - ประมวลผล Rule ทุกเงื่อนไข
  - ต่อ Binance API เทรดจริงหรือเทรดจำลอง

- **Log & Debug:**
  - พร้อม log สี

---

## โครงสร้างโปรเจ็ค

```
trading-bot/
│
├── backend/
│   ├── functions/              # Sub-component of backend
│   │   ├── binance_client.py
│   │   ├── indicator.py
│   │   ├── log_engine.py
│   │   ├── rule_engine.py    
│   ├── venv/                   # Python virtual environment
│   ├── main.py                 # FastAPI entrypoint
│   ├── requirements.txt
│
├── frontend/
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/         # Sub-component of frontend
│   │   │   ├── App.css
│   │   │   ├── App.jsx
│   │   │   ├── index.css
│   │   │   └── main.jsx
│   │   ├── App.jsx             # React app
│   │   └── index.html
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── indicator_config/           # Indicator configs will collected here
│   ├── ema.json
│   ├── macd.json
│   └── rsi.json
│
├── log/                        # Log to show in frontend
│
├── rule_config/                # Rule configs will collected here
│
└── user_config/                # API key and Testnet properties

```

---

## วิธีติดตั้งและใช้งาน

1. **Clone โปรเจ็ค**
   ```bash
   git clone <repo-url>
   cd trading-bot
   ```

2. **ติดตั้ง Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **ติดตั้ง Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **ตั้งค่า Indicator & Rule**
   - แก้ไข `backend/ema.json`, `rsi.json`, `macd.json`

5. **รัน Backend**
   ```bash
   cd ../backend
   uvicorn main:app --reload
   ```

6. **รัน Frontend**
   ```bash
   cd ../frontend
   npm start
   # เปิดดู http://localhost:3000
   ```

---

## ตัวอย่าง Rule (JSON)

```json
{
  "type": "condition",
  "indicator": "RSI",
  "name": "RSI14",
  "operator": "cross_down",
  "compared": "oversold"
}
```
- `operator`: `>`, `<`, `=`, `>=`, `<=`, `cross_up`, `cross_down`
- `compared`: indicator name, manual value, overbought/oversold
- `value`: ใส่ค่าตรง (manual value)
- `type`: รองรับซ้อน AND/OR ไม่จำกัด

---

## Frontend UI (React)

- Drag-and-drop สร้าง/แก้ไขกฎแบบ visual (RuleBuilder)
- แสดง Order/Asset/Log แบบเรียลไทม์
- เชื่อมต่อ backend อัตโนมัติ

---

## Roadmap

- [ ] แจ้งเตือน Line/Discord
- [ ] Backlog test
- [ ] Plug-in custom indicator

---

## ติดต่อ & ขอบคุณ

- Binance API, pandas, numpy, FastAPI, React
- [TradingView](https://tradingview.com) (แรงบันดาลใจ UI)
- เปิดรับ Pull Request และฟีดแบคทุกช่องทาง

---

_🐈ขอให้โชคดีในการเทรด!🐈‍⬛_
