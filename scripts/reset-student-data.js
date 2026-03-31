// scripts/reset-student-data.js
// Xóa toàn bộ data cũ của học sinh (exam attempts) để làm mới hệ thống
// Chạy: node scripts/reset-student-data.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Bắt đầu reset data học sinh...\n');

  // 1. Xóa toàn bộ StudentExamAttempt
  const attempts = await prisma.studentExamAttempt.deleteMany({});
  console.log(`✅ Đã xóa ${attempts.count} bài làm (StudentExamAttempt)`);

  // 2. Thống kê StudentTeacher links (không xóa, chỉ báo cáo)
  const links = await prisma.studentTeacher.findMany({
    include: {
      student: { select: { name: true, email: true } },
      teacher: { select: { name: true } },
    },
  });
  console.log(`\n📊 Tổng liên kết học sinh-giáo viên: ${links.length}`);
  const accepted = links.filter(l => l.status === 'accepted');
  const pending = links.filter(l => l.status === 'pending');
  console.log(`   ✅ Accepted: ${accepted.length}`);
  console.log(`   ⏳ Pending:  ${pending.length}`);

  if (pending.length > 0) {
    console.log('\n⚠️  Liên kết đang chờ duyệt:');
    pending.forEach(l => {
      console.log(`   - ${l.student?.name || l.studentId} → ${l.teacher?.name || l.teacherId}`);
    });
  }

  // 3. Kiểm tra Pages (bài giảng) có sẵn
  const pages = await prisma.page.count();
  console.log(`\n📄 Tổng số bài giảng (Pages): ${pages}`);

  // 4. Kiểm tra Exams
  const exams = await prisma.exam.findMany({
    select: { id: true, title: true, status: true, _count: { select: { items: true } } },
  });
  console.log(`📝 Tổng số đề thi (Exams): ${exams.length}`);
  exams.forEach(e => {
    console.log(`   - [${e.status}] ${e.title} (${e._count.items} câu)`);
  });

  console.log('\n✅ Reset hoàn tất! Học sinh có thể làm bài lại từ đầu.');
}

main()
  .catch(err => {
    console.error('❌ Lỗi:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
