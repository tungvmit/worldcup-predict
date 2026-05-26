# ⚽ World Cup 2026 - Dự Đoán Tỉ Số

Ứng dụng web miễn phí để dự đoán tỉ số các trận đấu World Cup 2026, với hệ thống cược và chia tiền tự động.

## 🎮 Cách Chơi

1. **Nhập tên của bạn**
2. **Chọn trận đấu** và dự đoán tỉ số
3. **Gửi dự đoán** trước khi trận bắt đầu
4. **Xem kết quả** và nhận thưởng

## 💰 Mức Cược

- **Vòng Bảng**: 10.000 VND
- **Vòng Loại Trực Tiếp**: 20.000 VND
- **Trận Ba**: 50.000 VND
- **Chung Kết**: 100.000 VND

## 📊 Chia Tiền

- **85%** cho người đoán đúng tỉ số
- **15%** vào quỹ chung
- Tối đa **4 người** có thể dự đoán cùng một tỉ số

## 🚀 Chạy Ứng Dụng

### Local Development
```bash
npm install
npm start
# Truy cập: http://localhost:3000
```

### Docker
```bash
docker compose up -d --build
```

## ⚠️ Lưu Ý Quan Trọng

- Chỉ tính tỉ số trong 90 phút chính thức
- Không tính hiệp phụ hoặc luân lưu
- Phải dự đoán trước khi trận bắt đầu
- Mỗi người chỉ dự đoán 1 lần cho mỗi trận

## 📁 Cấu Trúc

- `server.js` - Backend API
- `public/index.html` - Frontend UI
- `package.json` - Dependencies
- `Dockerfile` - Docker configuration

## 🛠 Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite
- **Frontend**: HTML5 + Tailwind CSS + Vanilla JS
- **Deployment**: Docker

---

**Phát triển bởi**: tungvmit | 2026
