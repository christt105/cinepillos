import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = process.env.SEED_ADMIN_EMAIL
    const name = process.env.SEED_ADMIN_NAME || 'admin'

    if (!email) {
        throw new Error('SEED_ADMIN_EMAIL must be set to the Google account that should be the first administrator.')
    }

    const admin = await prisma.user.upsert({
        where: { email },
        update: { isAdmin: true },
        create: {
            name,
            email,
            isAdmin: true,
        },
    })

    console.log(`Seeded admin user ${admin.email}. They sign in with Google using that address. Create the rest of the accounts from /admin.`)
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
