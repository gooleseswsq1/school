# Hướng dẫn mở port 3000 cho truy cập mạng nội bộ

## 🔍 Nguyên nhân không truy cập được

1. **Firewall Windows không có rule cho port 3000**
2. **`allowedDevOrigins` chỉ cho phép "100.115.158.11" và "localhost"**

## ✅ Các bước khắc phục

### Bước 1: Mở port 3000 trên Firewall

Chạy PowerShell với quyền **Administrator** và thực hiện:

```powershell
# Mở port 3000 trên Windows Firewall
.\open-port-3000.ps1
```

Hoặc chạy lệnh trực tiếp:

```powershell
netsh advfirewall firewall add rule name="Next.js Dev Server - Port 3000" dir=in action=allow protocol=TCP localport=3000
```

### Bước 2: Cập nhật allowedDevOrigins

File `next.config.ts` đã được cập nhật để cho phép:
- `192.168.1.23` (IP của máy bạn)
- `192.168.1.0/24` (tất cả IP trong subnet 192.168.1.x)
- `10.0.0.0/8` (mạng 10.x.x.x)
- `172.16.0.0/12` (mạng 172.16.x.x - 172.31.x.x)

### Bước 3: Khởi động lại Next.js server

```powershell
# Dừng server hiện tại (Ctrl+C)
# Sau đó chạy lại
npm run dev
```

## 🌐 Truy cập từ máy khác trong mạng nội bộ

Sau khi hoàn thành các bước trên, máy khác có thể truy cập:

```
http://192.168.1.23:3000
```

## 🔧 Kiểm tra kết nối

### Từ máy bạn (localhost):
```powershell
curl -I http://localhost:3000
```

### Từ IP nội bộ:
```powershell
curl -I http://192.168.1.23:3000
```

### Kiểm tra firewall rule:
```powershell
netsh advfirewall firewall show rule name="Next.js Dev Server - Port 3000"
```

## ⚠️ Lưu ý quan trọng

1. **Đảm bảo Next.js server đang chạy**:
   ```powershell
   npm run dev
   ```

2. **Kiểm tra IP của máy bạn**:
   ```powershell
   ipconfig
   ```
   Tìm dòng `IPv4 Address` trong phần `Ethernet adapter` hoặc `Wi-Fi`

3. **Đảm bảo máy khác cùng mạng**:
   - Cùng subnet (ví dụ: 192.168.1.x)
   - Cùng gateway
   - Cùng DNS

4. **Nếu vẫn không truy cập được**:
   - Kiểm tra antivirus có chặn không
   - Kiểm tra router có chặn port không
   - Kiểm tra máy khác có firewall riêng không

## 🚀 Cách sử dụng nhanh

### 1. Mở PowerShell với quyền Admin
### 2. Chạy script mở port:
```powershell
.\open-port-3000.ps1
```
### 3. Khởi động lại Next.js:
```powershell
npm run dev
```
### 4. Truy cập từ máy khác:
```
http://192.168.1.23:3000
```

## 📋 Kiểm tra danh sách rule firewall hiện có

```powershell
netsh advfirewall firewall show rule name=all dir=in | findstr "3000"
```

## 🗑️ Xóa rule (nếu cần)

```powershell
netsh advfirewall firewall delete rule name="Next.js Dev Server - Port 3000"
```

## 🔍 Debugging

### Kiểm tra port đang lắng nghe:
```powershell
netstat -an | findstr "3000"
```

### Kiểm tra process đang chạy:
```powershell
tasklist | findstr "node"
```

### Kiểm tra IP máy bạn:
```powershell
ipconfig | findstr "IPv4"
```

## 📞 Hỗ trợ

Nếu vẫn không truy cập được, hãy kiểm tra:
1. Next.js server có đang chạy không?
2. IP của máy bạn có đúng không?
3. Máy khác có cùng mạng không?
4. Firewall có rule nào khác chặn không?