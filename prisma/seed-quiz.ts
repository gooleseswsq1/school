// Quick seed script to create test data for Magic Quiz Builder
// Run with: node prisma/seed-quiz.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedQuizData() {
  try {
    console.log('Creating test data for Magic Quiz Builder...');

    // 1. Create a teacher user
    const teacher = await prisma.user.upsert({
      where: { email: 'teacher@example.com' },
      update: {},
      create: {
        email: 'teacher@example.com',
        name: 'Giáo Viên Demo',
        password: 'hashed_password_123',
        role: 'TEACHER',
        isActive: true,
      },
    });

    console.log('✓ Teacher created:', teacher.email);

    // 2. Create a student user
    const student = await prisma.user.upsert({
      where: { email: 'student@example.com' },
      update: {},
      create: {
        email: 'student@example.com',
        name: 'Học Sinh Demo',
        password: 'hashed_password_123',
        role: 'STUDENT',
        isActive: true,
      },
    });

    console.log('✓ Student created:', student.email);

    // 3. Create a page
    const page = await prisma.page.create({
      data: {
        title: 'Bài Giảng C Programming',
        slug: 'c-programming-lesson',
        description: 'Giáo trình lập trình C cơ bản',
        authorId: teacher.id,
        isPublished: true,
      },
    });

    console.log('✓ Page created:', page.title);

    // 4. Create a quiz block
    const block = await prisma.pageBlock.create({
      data: {
        pageId: page.id,
        type: 'QUIZ',
        order: 0,
      },
    });

    console.log('✓ Quiz block created');

    // 5. Create a quiz
    const quiz = await prisma.quiz.create({
      data: {
        blockId: block.id,
        title: 'Bài Kiểm Tra: Giới Thiệu C',
        questions: {
          create: [
            {
              questionText: 'C là ngôn ngữ lập trình được phát triển vào năm mấy?',
              questionType: 'multiple',
              order: 0,
              options: {
                create: [
                  {
                    optionText: '1972',
                    isCorrect: true,
                    order: 0,
                  },
                  {
                    optionText: '1982',
                    isCorrect: false,
                    order: 1,
                  },
                  {
                    optionText: '1992',
                    isCorrect: false,
                    order: 2,
                  },
                  {
                    optionText: '2002',
                    isCorrect: false,
                    order: 3,
                  },
                ],
              },
            },
            {
              questionText: 'Ai là người phát minh ra ngôn ngữ C?',
              questionType: 'multiple',
              order: 1,
              options: {
                create: [
                  {
                    optionText: 'Dennis Ritchie',
                    isCorrect: true,
                    order: 0,
                  },
                  {
                    optionText: 'Guido van Rossum',
                    isCorrect: false,
                    order: 1,
                  },
                  {
                    optionText: 'Bjarne Stroustrup',
                    isCorrect: false,
                    order: 2,
                  },
                  {
                    optionText: 'James Gosling',
                    isCorrect: false,
                    order: 3,
                  },
                ],
              },
            },
            {
              questionText: 'C là ngôn ngữ lập trình cấp thấp?',
              questionType: 'trueFalse',
              order: 2,
              options: {
                create: [
                  {
                    optionText: 'Đúng',
                    isCorrect: true,
                    order: 0,
                  },
                  {
                    optionText: 'Sai',
                    isCorrect: false,
                    order: 1,
                  },
                ],
              },
            },
            {
              questionText: 'Hàm main() trong C trả về giá trị gì?',
              questionType: 'multiple',
              order: 3,
              options: {
                create: [
                  {
                    optionText: 'int',
                    isCorrect: true,
                    order: 0,
                  },
                  {
                    optionText: 'void',
                    isCorrect: false,
                    order: 1,
                  },
                  {
                    optionText: 'string',
                    isCorrect: false,
                    order: 2,
                  },
                  {
                    optionText: 'boolean',
                    isCorrect: false,
                    order: 3,
                  },
                ],
              },
            },
          ],
        },
      },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    console.log('✓ Quiz created with', quiz.questions.length, 'questions');

    // 6. Create another page with a different quiz for testing bulk import
    const page2 = await prisma.page.create({
      data: {
        title: 'Bài Giảng Lập Trình Web',
        slug: 'web-programming-lesson',
        description: 'Giáo trình lập trình web cơ bản',
        authorId: teacher.id,
        isPublished: true,
      },
    });

    console.log('✓ Second page created:', page2.title);

    const block2 = await prisma.pageBlock.create({
      data: {
        pageId: page2.id,
        type: 'QUIZ',
        order: 0,
      },
    });

    console.log('✓ Second quiz block created');

    console.log('\n✅ Seed completed successfully!');
    console.log('\nTest Credentials:');
    console.log('Teacher: teacher@example.com / password: hashed_password_123');
    console.log('Student: student@example.com / password: hashed_password_123');
    console.log('\nYou can now:');
    console.log('1. Login as teacher to see/edit the quiz');
    console.log('2. Login as student to take the quiz');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedQuizData();
