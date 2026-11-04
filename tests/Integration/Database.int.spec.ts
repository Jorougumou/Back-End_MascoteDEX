import { describe, expect, it } from 'vitest'
import { prisma } from '@/Infra/Database/Prisma'

const federacao = {
  nome: 'Federação de Teste',
  sigla: 'FTESTE',
  estado: 'CE',
  regiao: 'Nordeste',
}

describe('Banco de testes — infraestrutura', () => {
  it('grava e lê uma federação', async () => {
    await prisma.federacao.create({ data: federacao })

    expect(await prisma.federacao.count()).toBe(1)
  })

  it('começa cada teste com o banco limpo', async () => {
    expect(await prisma.federacao.count()).toBe(0)
  })

  it('respeita a constraint única da sigla', async () => {
    await prisma.federacao.create({ data: federacao })

    await expect(prisma.federacao.create({ data: federacao })).rejects.toMatchObject({
      code: 'P2002',
    })
  })
})
