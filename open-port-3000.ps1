# Script mở port 3000 trên Windows Firewall
# Chạy với quyền Administrator

Write-Host "Đang mở port 3000 trên Windows Firewall..." -ForegroundColor Yellow

# Thêm rule cho TCP port 3000
netsh advfirewall firewall add rule name="Next.js Dev Server - Port 3000" dir=in action=allow protocol=TCP localport=3000

Write-Host "✅ Đã thêm rule cho port 3000!" -ForegroundColor Green

# Kiểm tra rule đã thêm
Write-Host "`nKiểm tra rule đã thêm:" -ForegroundColor Cyan
netsh advfirewall firewall show rule name="Next.js Dev Server - Port 3000"

Write-Host "`n✅ Hoàn tất! Bạn có thể truy cập từ mạng nội bộ bằng:" -ForegroundColor Green
Write-Host "   http://192.168.1.23:3000" -ForegroundColor White
Write-Host "`nLưu ý: Nếu vẫn không truy cập được, hãy kiểm tra:" -ForegroundColor Yellow
Write-Host "   1. Máy khác có cùng mạng không" -ForegroundColor White
Write-Host "   2. IP của máy bạn có đúng là 192.168.1.23 không" -ForegroundColor White
Write-Host "   3. Next.js server có đang chạy không" -ForegroundColor White