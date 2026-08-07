import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

/**
 * Demo data for a throwaway preview instance. Never point this at the real
 * database: it wipes every table before writing.
 */
const prisma = new PrismaClient()

const PIN = process.env.PREVIEW_PIN || '1234'

const FILMS = [
    { tmdbId: 550, title: 'El club de la lucha', posterPath: '/8kNruSfhk5IoE4eZOc4UpvDn6tq.jpg', releaseDate: '1999-10-15' },
    { tmdbId: 27205, title: 'Origen', posterPath: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', releaseDate: '2010-07-15' },
    { tmdbId: 155, title: 'El caballero oscuro', posterPath: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', releaseDate: '2008-07-16' },
    { tmdbId: 680, title: 'Pulp Fiction', posterPath: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', releaseDate: '1994-09-10' },
    { tmdbId: 13, title: 'Forrest Gump', posterPath: '/saHP97rTPS5eLmrLQEcANmKrsFl.jpg', releaseDate: '1994-06-23' },
    { tmdbId: 129, title: 'El viaje de Chihiro', posterPath: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', releaseDate: '2001-07-20' },
    { tmdbId: 1891, title: 'El Imperio contraataca', posterPath: '/nNAeTmF4CtdSgMDplXTDPOpYzsX.jpg', releaseDate: '1980-05-20' },
    { tmdbId: 603, title: 'Matrix', posterPath: '/aOIuZAjPaRIE6CMzbazvcHuHXDc.jpg', releaseDate: '1999-03-30' },
]

const PEOPLE = [
    { name: 'Christian', email: 'christian@preview.local', isAdmin: true },
    { name: 'Lucia', email: 'lucia@preview.local', isAdmin: false },
    { name: 'Marc', email: 'marc@preview.local', isAdmin: false },
    { name: 'Aina', email: 'aina@preview.local', isAdmin: false },
]

const avatar = (name: string) =>
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}`

async function wipe() {
    await prisma.vote.deleteMany()
    await prisma.meetingCandidate.deleteMany()
    await prisma.meeting.deleteMany()
    await prisma.proposal.deleteMany()
    await prisma.film.deleteMany()
    await prisma.membership.deleteMany()
    await prisma.user.updateMany({ data: { activeGroupId: null } })
    await prisma.group.deleteMany()
    await prisma.user.deleteMany()
}

async function main() {
    await wipe()

    const password = await bcrypt.hash(PIN, 10)

    const users = []
    for (const person of PEOPLE) {
        users.push(
            await prisma.user.create({
                data: { ...person, password, image: avatar(person.name) },
            })
        )
    }

    const films = []
    for (const film of FILMS) {
        films.push(
            await prisma.film.create({
                data: { ...film, overview: `Sinopsis de demostración de ${film.title}.` },
            })
        )
    }

    const zorropillos = await prisma.group.create({
        data: {
            name: 'Zorropillos',
            memberships: {
                create: users.map((user, index) => ({
                    userId: user.id,
                    role: index === 0 ? 'OWNER' : 'MEMBER',
                })),
            },
        },
    })

    const cineForum = await prisma.group.create({
        data: {
            name: 'Cine Fórum',
            memberships: {
                create: [
                    { userId: users[0].id, role: 'OWNER' },
                    { userId: users[1].id, role: 'MEMBER' },
                ],
            },
        },
    })

    for (const [index, film] of films.entries()) {
        await prisma.proposal.create({
            data: {
                userId: users[index % users.length].id,
                filmId: film.id,
                groupId: zorropillos.id,
            },
        })
    }

    // A second proposer on the first film, so the "+N" avatar stack shows up.
    await prisma.proposal.create({
        data: { userId: users[1].id, filmId: films[0].id, groupId: zorropillos.id },
    })

    await prisma.proposal.create({
        data: { userId: users[0].id, filmId: films[5].id, groupId: cineForum.id },
    })

    const meeting = await prisma.meeting.create({
        data: {
            date: new Date(Date.now() + 5 * 86400000),
            status: 'VOTING',
            groupId: zorropillos.id,
        },
    })

    const candidates = []
    for (const [index, film] of films.slice(0, 4).entries()) {
        candidates.push(
            await prisma.meetingCandidate.create({
                data: { meetingId: meeting.id, filmId: film.id, userId: users[index].id },
            })
        )
    }

    await prisma.vote.create({ data: { candidateId: candidates[0].id, userId: users[0].id } })
    await prisma.vote.create({ data: { candidateId: candidates[0].id, userId: users[1].id } })
    await prisma.vote.create({ data: { candidateId: candidates[1].id, userId: users[2].id } })

    // Yesterday's session, still visible on the home page for 24h. This is the
    // hero layout that used to clip long film titles on a phone.
    const concluded = await prisma.meeting.create({
        data: {
            date: new Date(Date.now() - 3 * 3600000),
            status: 'CONCLUDED',
            groupId: zorropillos.id,
            selectedFilmId: films[0].id,
        },
    })

    await prisma.meetingCandidate.create({
        data: { meetingId: concluded.id, filmId: films[0].id, userId: users[3].id },
    })

    console.log(`Preview data ready. Sign in as any of ${PEOPLE.map(p => p.name).join(', ')} with PIN ${PIN}.`)
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (error) => {
        console.error(error)
        await prisma.$disconnect()
        process.exit(1)
    })
