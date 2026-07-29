import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const hashedPassword = await bcrypt.hash('1234', 10)

    const users = [
        { name: 'Christian', email: 'christian@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Christian', isAdmin: true },
        { name: 'Laia', email: 'laia@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Laia', isAdmin: false },
        { name: 'Montse', email: 'montse@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Montse', isAdmin: false },
        { name: 'Agui', email: 'agui@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Agui', isAdmin: false },
        { name: 'Celia', email: 'celia@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Celia', isAdmin: false },
        { name: 'Moreno', email: 'moreno@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Moreno', isAdmin: false },
        { name: 'Sara', email: 'sara@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sara', isAdmin: false },
        { name: 'María', email: 'maria@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Maria', isAdmin: false },
        { name: 'Rubén', email: 'ruben@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ruben', isAdmin: false },
        { name: 'Pato', email: 'pato@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Pato', isAdmin: false },
        { name: 'Chantal', email: 'chantal@zorropillos.com', image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Chantal', isAdmin: false },
    ]

    for (const user of users) {
        await prisma.user.upsert({
            where: { email: user.email },
            update: { isAdmin: user.isAdmin },
            create: {
                name: user.name,
                email: user.email,
                password: hashedPassword,
                image: user.image,
                isAdmin: user.isAdmin,
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
