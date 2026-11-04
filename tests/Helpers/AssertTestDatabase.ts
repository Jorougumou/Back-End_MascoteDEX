export function assertTestDatabase(url: string | undefined): void {
  if (!url) {
    throw new Error('DATABASE_URL não definida. Verifique o .env.test.')
  }

  const databaseName = new URL(url).pathname.replace('/', '')

  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Abortado: o banco "${databaseName}" não termina em "_test". ` +
        'Testes de integração só podem rodar em banco de teste.',
    )
  }
}
