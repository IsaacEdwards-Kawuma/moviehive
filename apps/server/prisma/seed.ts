import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create or ensure Admin User has role ADMIN
  const adminExists = await prisma.user.findUnique({ where: { email: 'admin@stream.com' } });
  if (!adminExists) {
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@stream.com',
        passwordHash: await bcrypt.hash('admin123', 10),
        role: 'ADMIN',
      },
    });
    console.log('Created admin:', adminUser.email, '/ password: admin123');
  } else {
    await prisma.user.update({
      where: { email: 'admin@stream.com' },
      data: { role: 'ADMIN' },
    });
    console.log('Admin already exists; ensured role is ADMIN');
  }

  const genres = [
    'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
    'Drama', 'Family', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller',
  ];
  for (const name of genres) {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const existing = await prisma.genre.findUnique({ where: { slug } });
    if (!existing) {
      await prisma.genre.create({ data: { name, slug } });
    }
  }

  const genreMap = await prisma.genre.findMany().then((g) => Object.fromEntries(g.map((x) => [x.slug, x.id])));

  const actionId = genreMap['action'];
  const dramaId = genreMap['drama'];
  const comedyId = genreMap['comedy'];
  const scifiId = genreMap['sci-fi'];
  const thrillerId = genreMap['thriller'];

  const movies = [
    { title: 'The Dark Knight', type: 'movie' as const, year: 2008, duration: 152, rating: 'PG-13', desc: 'Batman must accept one of the greatest sacrifices.', genreIds: [actionId, dramaId, thrillerId] },
    { title: 'Inception', type: 'movie' as const, year: 2010, duration: 148, rating: 'PG-13', desc: 'A thief who steals secrets through dream-sharing technology.', genreIds: [actionId, scifiId, thrillerId] },
    { title: 'Interstellar', type: 'movie' as const, year: 2014, duration: 169, rating: 'PG-13', desc: 'A team of explorers travel through a wormhole in space.', genreIds: [dramaId, scifiId] },
    { title: 'The Shawshank Redemption', type: 'movie' as const, year: 1994, duration: 142, rating: 'R', desc: 'Two imprisoned men bond over a number of years.', genreIds: [dramaId] },
    { title: 'Pulp Fiction', type: 'movie' as const, year: 1994, duration: 154, rating: 'R', desc: 'The lives of two mob hitmen, a boxer, and a pair of diner bandits.', genreIds: [genreMap['crime'], dramaId, thrillerId] },
  ];

  for (const m of movies) {
    const slug = m.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const existing = await prisma.content.findFirst({ where: { title: m.title } });
    if (existing) continue;
    const content = await prisma.content.create({
      data: {
        type: m.type,
        title: m.title,
        description: m.desc,
        releaseYear: m.year,
        duration: m.duration,
        rating: m.rating,
        featured: Math.random() > 0.5,
        thumbnailUrl: `https://picsum.photos/seed/${slug}/640/360`,
        posterUrl: `https://picsum.photos/seed/${slug}p/400/600`,
        videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        languages: ['en'],
        regions: ['US'],
        contentGenres: {
          create: m.genreIds.map((genreId) => ({ genreId })),
        },
      },
    });
    console.log('Created:', content.title);
  }

  const seriesTitle = 'Stranger Things';
  let series = await prisma.content.findFirst({ where: { title: seriesTitle } });
  if (!series) {
    series = await prisma.content.create({
      data: {
        type: 'series',
        title: seriesTitle,
        description: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments.',
        releaseYear: 2016,
        rating: 'TV-14',
        featured: true,
        thumbnailUrl: 'https://picsum.photos/seed/stranger/640/360',
        posterUrl: 'https://picsum.photos/seed/strangerp/400/600',
        languages: ['en'],
        regions: ['US'],
        contentGenres: {
          create: [{ genreId: dramaId }, { genreId: scifiId }, { genreId: thrillerId }],
        },
      },
    });
    for (let s = 1; s <= 2; s++) {
      for (let e = 1; e <= 4; e++) {
        await prisma.episode.create({
          data: {
            seriesId: series.id,
            season: s,
            episode: e,
            title: `Episode ${e}`,
            duration: 50,
            videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            thumbnailUrl: `https://picsum.photos/seed/st${s}${e}/640/360`,
          },
        });
      }
    }
    console.log('Created series:', series.title);
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());