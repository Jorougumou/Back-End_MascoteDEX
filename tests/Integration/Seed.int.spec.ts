import { Perfil } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { prisma } from '@/Infra/Database/Prisma'
import { seedDirex } from '@/Infra/Database/Seeds/DirexSeed'
import { loadFederacoes, seedFederacoes } from '@/Infra/Database/Seeds/FederacaoSeed'
import { verifyPassword } from '@/Shared/Utils/Password'

const direx = { nome: 'Direx Teste', email: 'Direx@Teste.com', senha: 'senha-segura-123' }

describe('Seed de federações (RN007)', () => {
  it('carrega o arquivo do projeto com uma federação por sigla', async () => {
    const federacoes = await loadFederacoes()
    const siglas = new Set(federacoes.map((federacao) => federacao.sigla))

    expect(federacoes.length).toBeGreaterThan(0)
    expect(siglas.size).toBe(federacoes.length)
  })

  it('grava todas as federações e é idempotente', async () => {
    const federacoes = await loadFederacoes()

    await seedFederacoes(federacoes)
    await seedFederacoes(federacoes)

    expect(await prisma.federacao.count()).toBe(federacoes.length)
  })

  it('atualiza os dados de uma federação existente pela sigla', async () => {
    const base = { sigla: 'FTESTE', estado: 'CE', regiao: 'Nordeste' }

    await seedFederacoes([{ ...base, nome: 'Nome Antigo' }])
    await seedFederacoes([{ ...base, nome: 'Nome Novo' }])

    const federacao = await prisma.federacao.findUniqueOrThrow({ where: { sigla: 'FTESTE' } })

    expect(federacao.nome).toBe('Nome Novo')
    expect(await prisma.federacao.count()).toBe(1)
  })
})

describe('Seed do usuário DIREX (RN002)', () => {
  it('cria o DIREX com e-mail normalizado e senha em hash', async () => {
    expect(await seedDirex(direx)).toBe('criado')

    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email: 'direx@teste.com' } })

    expect(usuario.perfil).toBe(Perfil.DIREX)
    expect(usuario.senhaHash).not.toBe(direx.senha)
    expect(await verifyPassword(usuario.senhaHash, direx.senha)).toBe(true)
  })

  it('é idempotente quando o DIREX já existe', async () => {
    await seedDirex(direx)

    expect(await seedDirex(direx)).toBe('ja_existia')
    expect(await prisma.usuario.count()).toBe(1)
  })

  it('promove um membro existente sem alterar a senha', async () => {
    await prisma.usuario.create({
      data: { nome: 'Membro', email: 'direx@teste.com', senhaHash: 'hash-original' },
    })

    expect(await seedDirex(direx)).toBe('promovido')

    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email: 'direx@teste.com' } })

    expect(usuario.perfil).toBe(Perfil.DIREX)
    expect(usuario.senhaHash).toBe('hash-original')
  })

  it('ignora o seed quando as variáveis não estão definidas', async () => {
    expect(await seedDirex({})).toBe('ignorado')
    expect(await prisma.usuario.count()).toBe(0)
  })

  it('rejeita senha com menos de 8 caracteres (RN003)', async () => {
    await expect(seedDirex({ ...direx, senha: 'curta' })).rejects.toThrow()
  })
})
