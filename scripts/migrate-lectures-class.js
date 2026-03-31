const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const normalize = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const parseArgs = () => {
  const args = process.argv.slice(2);
  return {
    apply: args.includes('--apply'),
    teacherId: (() => {
      const idx = args.indexOf('--teacher');
      return idx >= 0 ? args[idx + 1] : null;
    })(),
  };
};

const collectDescendantIds = (rootId, childrenMap) => {
  const out = [];
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop();
    out.push(id);
    const children = childrenMap.get(id) || [];
    for (const c of children) stack.push(c.id);
  }
  return out;
};

async function main() {
  const { apply, teacherId } = parseArgs();
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);

  const teacherWhere = teacherId ? { id: teacherId } : { role: 'TEACHER' };
  const teachers = await prisma.user.findMany({
    where: teacherWhere,
    select: {
      id: true,
      name: true,
      teacherClasses: {
        include: {
          class: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });

  let totalUpdatedPages = 0;
  let totalRootsUpdated = 0;

  for (const teacher of teachers) {
    const classes = teacher.teacherClasses.map((tc) => tc.class).filter(Boolean);
    if (classes.length === 0) {
      console.log(`- ${teacher.name}: no classes, skip`);
      continue;
    }

    const allPages = await prisma.page.findMany({
      where: { authorId: teacher.id },
      select: { id: true, title: true, description: true, parentId: true, classId: true },
    });

    const roots = allPages.filter((p) => !p.parentId);
    const rootsNeedClass = roots.filter((p) => !p.classId);
    if (rootsNeedClass.length === 0) {
      console.log(`- ${teacher.name}: no root pages missing classId`);
      continue;
    }

    const childrenMap = new Map();
    for (const p of allPages) {
      if (!p.parentId) continue;
      if (!childrenMap.has(p.parentId)) childrenMap.set(p.parentId, []);
      childrenMap.get(p.parentId).push(p);
    }

    const acceptedByClass = await prisma.studentTeacher.groupBy({
      by: ['classId'],
      where: { teacherId: teacher.id, status: 'accepted', classId: { not: null } },
      _count: { classId: true },
    });
    const acceptedMap = new Map(acceptedByClass.map((x) => [x.classId, x._count.classId]));

    const defaultClass = classes
      .slice()
      .sort((a, b) => (acceptedMap.get(b.id) || 0) - (acceptedMap.get(a.id) || 0))[0];

    console.log(`- ${teacher.name}: ${rootsNeedClass.length} roots need class mapping`);

    for (const root of rootsNeedClass) {
      const hay = normalize(`${root.title} ${root.description || ''}`);
      let picked = null;

      // 1) Direct match by class code/name in title/description
      for (const cls of classes) {
        const nName = normalize(cls.name);
        const nCode = normalize(cls.code || '');
        if ((nCode && hay.includes(nCode)) || (nName && hay.includes(nName))) {
          picked = cls;
          break;
        }
      }

      // 2) Single-class teacher fallback
      if (!picked && classes.length === 1) picked = classes[0];

      // 3) Most active class fallback
      if (!picked) picked = defaultClass;

      if (!picked) continue;

      const targetIds = collectDescendantIds(root.id, childrenMap);
      console.log(`  • ${root.title} -> ${picked.name}${picked.code ? ` (${picked.code})` : ''} [${targetIds.length} pages]`);

      if (apply) {
        const res = await prisma.page.updateMany({
          where: { id: { in: targetIds } },
          data: { classId: picked.id },
        });
        totalUpdatedPages += res.count;
      }
      totalRootsUpdated += 1;
    }
  }

  console.log(`Done. Roots mapped: ${totalRootsUpdated}. Pages updated: ${totalUpdatedPages}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
