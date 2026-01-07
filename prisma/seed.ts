import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const hashedPassword = await bcrypt.hash('1234', 10)

    const users = [
        { name: 'Chris', email: 'chris@zorropillos.com', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chris' },
        { name: 'Sarah', email: 'sarah@zorropillos.com', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
        { name: 'Mike', email: 'mike@zorropillos.com', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' },
        { name: 'Elena', email: 'elena@zorropillos.com', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena' },
    ]

    for (const user of users) {
        await prisma.user.upsert({
            where: { email: user.email },
            update: {},
            create: {
                name: user.name,
                email: user.email,
                password: hashedPassword,
                image: user.image,
            },
        })
    }
    console.log('Seeded 4 friends!')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
