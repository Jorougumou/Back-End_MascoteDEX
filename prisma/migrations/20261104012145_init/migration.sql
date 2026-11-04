-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('MEMBRO', 'DIREX');

-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'MEMBRO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "federacao" (
    "id_federacao" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "sigla" VARCHAR(20) NOT NULL,
    "estado" CHAR(2) NOT NULL,
    "regiao" VARCHAR(20) NOT NULL,

    CONSTRAINT "federacao_pkey" PRIMARY KEY ("id_federacao")
);

-- CreateTable
CREATE TABLE "empresa_junior" (
    "id_empresa_junior" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "nome_normalizado" VARCHAR(120) NOT NULL,
    "universidade" VARCHAR(160) NOT NULL,
    "curiosidades" TEXT,
    "id_federacao" UUID NOT NULL,

    CONSTRAINT "empresa_junior_pkey" PRIMARY KEY ("id_empresa_junior")
);

-- CreateTable
CREATE TABLE "mascote" (
    "id_mascote" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "nome_normalizado" VARCHAR(120) NOT NULL,
    "foto_url" VARCHAR(500) NOT NULL,
    "id_empresa_junior" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mascote_pkey" PRIMARY KEY ("id_mascote")
);

-- CreateTable
CREATE TABLE "evento" (
    "id_evento" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "local" VARCHAR(160) NOT NULL,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE NOT NULL,
    "id_usuario" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evento_pkey" PRIMARY KEY ("id_evento")
);

-- CreateTable
CREATE TABLE "captura" (
    "id_captura" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "id_mascote" UUID NOT NULL,
    "id_evento" UUID NOT NULL,
    "foto_url" VARCHAR(500) NOT NULL,
    "capturado_em" TIMESTAMP(3) NOT NULL,
    "sincronizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "captura_pkey" PRIMARY KEY ("id_captura")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "federacao_sigla_key" ON "federacao"("sigla");

-- CreateIndex
CREATE INDEX "federacao_estado_idx" ON "federacao"("estado");

-- CreateIndex
CREATE INDEX "empresa_junior_nome_normalizado_idx" ON "empresa_junior"("nome_normalizado");

-- CreateIndex
CREATE UNIQUE INDEX "empresa_junior_id_federacao_nome_normalizado_key" ON "empresa_junior"("id_federacao", "nome_normalizado");

-- CreateIndex
CREATE INDEX "mascote_criado_em_idx" ON "mascote"("criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "mascote_id_empresa_junior_nome_normalizado_key" ON "mascote"("id_empresa_junior", "nome_normalizado");

-- CreateIndex
CREATE INDEX "evento_data_inicio_idx" ON "evento"("data_inicio");

-- CreateIndex
CREATE INDEX "captura_id_evento_idx" ON "captura"("id_evento");

-- CreateIndex
CREATE INDEX "captura_id_mascote_idx" ON "captura"("id_mascote");

-- CreateIndex
CREATE INDEX "captura_id_usuario_capturado_em_idx" ON "captura"("id_usuario", "capturado_em");

-- CreateIndex
CREATE UNIQUE INDEX "captura_id_usuario_id_mascote_id_evento_key" ON "captura"("id_usuario", "id_mascote", "id_evento");

-- AddForeignKey
ALTER TABLE "empresa_junior" ADD CONSTRAINT "empresa_junior_id_federacao_fkey" FOREIGN KEY ("id_federacao") REFERENCES "federacao"("id_federacao") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mascote" ADD CONSTRAINT "mascote_id_empresa_junior_fkey" FOREIGN KEY ("id_empresa_junior") REFERENCES "empresa_junior"("id_empresa_junior") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mascote" ADD CONSTRAINT "mascote_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "captura" ADD CONSTRAINT "captura_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "captura" ADD CONSTRAINT "captura_id_mascote_fkey" FOREIGN KEY ("id_mascote") REFERENCES "mascote"("id_mascote") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "captura" ADD CONSTRAINT "captura_id_evento_fkey" FOREIGN KEY ("id_evento") REFERENCES "evento"("id_evento") ON DELETE RESTRICT ON UPDATE CASCADE;
