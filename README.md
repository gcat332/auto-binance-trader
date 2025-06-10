# 1. สร้าง virtual environment
python3.11 -m venv venv

# 2. เปิดใช้งาน venv (Linux/Mac)
source venv/bin/activate

# 2. เปิดใช้งาน venv (Windows)
venv\Scripts\activate

# 3. ติดตั้ง dependencies
pip install -r requirements.txt

# 4. ทดสอบ
python test.py