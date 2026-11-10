import { prisma } from "@/Infra/Database/Prisma";
import { createAuthRepository } from "@/Modules/Auth/AuthRepository";
import { createAuthService } from "@/Modules/Auth/AuthService";
import { createMascoteRepository } from "@/Modules/Mascotes/MascoteRepository";
import { createMascoteService } from "@/Modules/Mascotes/MascoteService";
import { createEventoRepository } from "@/Modules/Eventos/EventoRepository";
import { createEventoService } from "@/Modules/Eventos/EventoService";
import { createFederacaoRepository } from "@/Modules/Federacoes/FederacaoRepository";
import { createFederacaoService } from "@/Modules/Federacoes/FederacaoService";
import { createEmpresaJuniorRepository } from "@/Modules/EmpresasJuniores/EmpresaJuniorRepository";
import { createEmpresaJuniorService } from "@/Modules/EmpresasJuniores/EmpresaJuniorService";
import { env } from "@/Config/Env";
import { createStorage } from "@/Infra/Storage/StorageFactory";
import type { StorageProvider } from "@/Infra/Storage/StorageProvider";
import { loggerNulo, type Logger } from "@/Shared/Utils/Logger";
import { createCapturaRepository } from "@/Modules/Capturas/CapturaRepository";
import { createCapturaService } from "@/Modules/Capturas/CapturaService";

import { createRankingRepository } from "@/Modules/Ranking/RankingRepository";
import { createRankingService } from "@/Modules/Ranking/RankingService";

export interface ContainerOverrides {
  storage?: StorageProvider;
  logger?: Logger;
}

export function buildContainer(overrides: ContainerOverrides = {}) {
  const authRepository = createAuthRepository(prisma);
  const authService = createAuthService({ authRepository });

  const storage = overrides.storage ?? createStorage(env);
  const logger = overrides.logger ?? loggerNulo;

  const mascoteRepository = createMascoteRepository(prisma);
  const mascoteService = createMascoteService({
    mascoteRepository,
    storage,
    logger,
  });

  const eventoRepository = createEventoRepository(prisma);
  const eventoService = createEventoService({ eventoRepository });

  const federacaoRepository = createFederacaoRepository(prisma);
  const federacaoService = createFederacaoService({ federacaoRepository });

  const empresaJuniorRepository = createEmpresaJuniorRepository(prisma);
  const empresaJuniorService = createEmpresaJuniorService({
    empresaJuniorRepository,
  });

  const capturaRepository = createCapturaRepository(prisma);

  const capturaService = createCapturaService({
    capturaRepository,
    storage,
    logger,
  });

  const rankingRepository = createRankingRepository(prisma);
  const rankingService = createRankingService({ rankingRepository });

  return {
    storage,
    authService,
    mascoteService,
    eventoService,
    federacaoService,
    empresaJuniorService,
    capturaService,
    rankingService,
  };
}

export type Container = ReturnType<typeof buildContainer>;
