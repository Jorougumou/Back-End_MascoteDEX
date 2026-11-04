import { buildApp, type App, type AppOverrides } from '@/App'

let app: App | undefined

export async function setupIntegration(overrides: AppOverrides = {}): Promise<App> {
  app = buildApp(overrides)
  await app.ready()
  return app
}

export async function teardownIntegration(): Promise<void> {
  if (app) {
    await app.close()
    app = undefined
  }
}
