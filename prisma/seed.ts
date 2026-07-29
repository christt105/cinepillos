import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = process.env.SEED_ADMIN_EMAIL
    const password = process.env.SEED_ADMIN_PASSWORD
    const name = process.env.SEED_ADMIN_NAME || 'admin'

    if (!email || !password) {
        throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set. There is no default admin password.')
    }

    const admin = await prisma.user.upsert({
        where: { email },
        update: { isAdmin: true },
        create: {
            name,
            email,
            password: await bcrypt.hash(password, 10),
            image: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
            isAdmin: true,
        },
    })

    console.log(`Seeded admin user ${admin.email}. Create the rest of the accounts from /admin.`)
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
