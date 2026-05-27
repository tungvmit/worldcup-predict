# ⚽ World Cup 2026 – Dự Đoán Tỉ Số

Ứng dụng web **miễn phí, không cần server** để dự đoán tỉ số World Cup 2026 cho nhóm bạn bè / đồng nghiệp.

🌐 **Live:** https://tungvmit.github.io/worldcup-predict/

---

## 🎮 Cách Chơi

1. Nhập tên của bạn ở góc trên phải
2. Chọn trận đấu muốn dự đoán (nhấn vào thẻ trận)
3. Nhập tỉ số dự đoán và xác nhận
4. Xem kết quả và bảng xếp hạng sau khi trận kết thúc

## 💰 Mức Cược

| Vòng | Mức cược |
|------|----------|
| Vòng Bảng | 10.000 ₫ |
| Vòng 1/16, 1/8, Tứ Kết, Bán Kết | 20.000 ₫ |
| Tranh Hạng Ba | 50.000 ₫ |
| Chung Kết | 100.000 ₫ |

## 📊 Phân Chia Tiền Thưởng

- **85%** tổng pool → chia đều cho người đoán đúng tỉ số
- **15%** tổng pool → vào quỹ chung
- Tối đa **4 người** có thể đặt cùng một tỉ số

## 🔑 Tài Khoản Quản Trị

- Mật khẩu mặc định: **`admin2026`**
- Chức năng: nhập kết quả, sửa tên đội, xem chi tiết từng trận, xóa dự đoán
- Để đổi mật khẩu: sửa dòng `const ADMIN_PWD = "admin2026"` trong `index.html`

## ⚠️ Lưu Ý Về Dữ Liệu

Dữ liệu lưu trong `localStorage` của trình duyệt — **không tự đồng bộ giữa các máy**.

**Cách dùng chung dữ liệu:**
- Đơn giản nhất: chỉ dùng trên 1 máy tính chung (của người quản trị)
- Nâng cao: tích hợp Firebase Realtime Database để đồng bộ realtime

## 🚀 Deploy

Repo này dùng **GitHub Actions** để tự động deploy lên GitHub Pages mỗi khi push lên nhánh `main`.

### Bật GitHub Pages lần đầu:
1. Vào **Settings → Pages**
2. Source: **GitHub Actions**
3. Push bất kỳ thay đổi nào lên `main` → workflow chạy tự động

### Chạy local:
Chỉ cần mở file `index.html` bằng trình duyệt — không cần cài đặt gì thêm.

## 📁 Cấu Trúc

```
worldcup-predict/
├── index.html              # Toàn bộ ứng dụng (React + logic)
├── .github/
│   └── workflows/
│       └── deploy.yml      # Tự động deploy lên GitHub Pages
└── README.md
```

---

**Phát triển bởi:** tungvmit | 2026
