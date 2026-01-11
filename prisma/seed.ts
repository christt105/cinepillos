import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const hashedPassword = await bcrypt.hash('1234', 10)

    const users = [
        { name: 'Christian', email: 'christian@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Christian' },
        { name: 'Laia', email: 'laia@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Laia' },
        { name: 'Montse', email: 'montse@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Montse' },
        { name: 'Agui', email: 'agui@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Agui' },
        { name: 'Celia', email: 'celia@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Celia' },
        { name: 'Moreno', email: 'moreno@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Moreno' },
        { name: 'Sara', email: 'sara@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sara' },
        { name: 'María', email: 'maria@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Maria' },
        { name: 'Rubén', email: 'ruben@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ruben' },
        { name: 'Pato', email: 'pato@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Pato' },
        { name: 'Chantal', email: 'chantal@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Chantal' },
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
