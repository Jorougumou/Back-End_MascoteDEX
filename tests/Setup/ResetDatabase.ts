import { beforeEach } from 'vitest'
import { prisma } from '@/Infra/Database/Prisma'
import { assertTestDatabase } from '../Helpers/AssertTestDatabase'

assertTestDatabase(process.env.DATABASE_URL)

beforeEach(async () => {
  await prisma.$executeRaw`
    TRUNCATE TABLE "captura", "mascote", "empresa_junior", "federacao", "evento", "usuario"
    RESTART IDENTITY CASCADE
  `
})
