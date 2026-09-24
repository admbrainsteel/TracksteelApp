# TracksteelApp (TrackSteel) — Base de Conhecimento Completa

> **Arquivo:** `descritivo_tracksteelapp.md`
> **Nome oficial:** TrackSteel — "Plataforma de Gestão Industrial"
> **Nome interno do código:** tracksteel-app (package.json)
> **Versão:** 1.0.0
> **Stack:** React 18 + TypeScript + Vite 6 + Supabase (PostgreSQL + Auth + Storage) + TanStack React Query v5 + shadcn/ui + Tailwind + React Flow + Recharts + jsPDF + Three.js
> **Última atualização:** 2026-09-15
> **Uso pretendido:** RAG, fine-tuning de bot, FAQ público, atendimento por e-mail/chat/WhatsApp para gestores de produção industrial, engenheiros de fabricação, operadores de chão de fábrica, gestores de obras/PCP, fornecedores.
> **Regra de ouro:** Nunca inventar informação. Se a pergunta fugir do que está documentado aqui, responder: "Não tenho essa informação no momento. Posso te conectar com a equipe do TrackSteel — me passa seu e-mail?"

---

## 0. Identidade do bot (system prompt)

```
Você é o assistente oficial do TrackSteel (TracksteelApp) — plataforma
brasileira de gestão industrial para fabricação de estruturas metálicas.

PERSONA:
- Técnico, objetivo, prático
- Português do Brasil
- Respostas curtas por padrão; detalhadas quando o usuário pedir
- Quando não souber, admitimos e oferecemos encaminhar

PÚBLICO-ALVO:
- Gestores de produção industrial
- Engenheiros de fabricação / PCP
- Operadores de chão de fábrica
- Encarregados de obra
- Gestores de estoque
- Auditores de qualidade
- Fornecedores

NUNCA:
- Citar projetos, clientes ou peças específicas
- Inventar módulos que não existem
- Confundir com ERP genérico — TrackSteel é especializado em estruturas metálicas

SEMPRE:
- Mencionar o "Modo Smart" quando falar de uso em campo/fábrica/tablet
- Lembrar que o sistema tem controle de OFs (Ordens de Fabricação)
- Citar a integração com Supabase quando perguntarem sobre dados
```

---

## 1. O que é o TrackSteel

**Perguntas prováveis:**
- O que é o TrackSteel?
- O que faz o TracksteelApp?
- Serve para quê?

**Resposta canônica:**

O **TrackSteel (TracksteelApp)** é uma plataforma brasileira de **gestão industrial especializada em fabricação de estruturas metálicas**. Foi pensado para empresas que precisam controlar o ciclo completo: **Ordens de Fabricação (OFs) → peças → processos → produção → estoque → expedição → montagem em obra**.

**Em uma frase:** é o sistema que controla **da entrada da OF até a entrega da estrutura montada no cliente**, passando pelo chão de fábrica, com painéis visuais em tempo real e interface touch-first pra operadores.

**Diferente de:**

- **ERP genérico** (SAP, TOTVS): TrackSteel é especializado em estruturas metálicas (corte, dobra, solda, pintura, montagem)
- **Planilhas + sistema fabril avulso**: TrackSteel unifica PCP + estoque + produção + expedição + qualidade num único sistema
- **MES tradicional**: é mais moderno (PWA, React, Supabase) e tem módulo de chão de fábrica mobile-first (Modo Smart)

---

## 2. Para quem foi feito

**Perguntas prováveis:**
- Quem usa o TrackSteel?
- Serve para minha fábrica?
- Serve para escritório de engenharia?

**Resposta canônica:**

| Perfil | Caso de uso |
|---|---|
| **Gestor de produção / PCP** | Controla OFs, prioridades, cronograma, gargalos |
| **Engenheiro de fabricação** | Define processos, peças, sequência de produção |
| **Encarregado de produção** | Acompanha apontamentos, libera frentes, vê status em tempo real |
| **Operador de chão de fábrica** | Usa Modo Smart no tablet pra apontar produção, expedição e montagem |
| **Encarregado de obra** | Confere peças que chegaram no canteiro, aponta avanço de montagem |
| **Gestor de estoque / almoxarife** | Controla materiais, empenhos, movimentações, estoque crítico |
| **Auditor de qualidade** | Consulta histórico de apontamentos, inconsistências, rastreabilidade |
| **Gestor de tarefas** | Atribui e acompanha tarefas do time (Kanban-like) |

---

## 3. Funcionalidades principais (10+ módulos)

**Perguntas prováveis:**
- Quais módulos o TrackSteel tem?
- O que dá pra fazer?

**Resposta canônica:**

### 3.1 Módulos principais

| # | Módulo | Função |
|---|---|---|
| 1 | **Dashboard** | KPIs, calendário, gráficos, usuários online, notificações |
| 2 | **Cadastro de OFs** | Ordens de Fabricação com peças, processos, ficha técnica |
| 3 | **Cadastro de Peças** | Biblioteca de peças e componentes |
| 4 | **Estoque** | Controle de materiais, empenhos, movimentações, CSV import |
| 5 | **Produção** | Apontamentos, diário, painel industrial, PCP |
| 6 | **Expedição** | Romaneios, entregas, transporte |
| 7 | **Obras** | Gestão de projetos e instalações |
| 8 | **Tarefas** | Atribuições, histórico, status |
| 9 | **Biblioteca** | Normas técnicas, catálogos, referências |
| 10 | **Modo Smart** | Interface touch-first pra chão de fábrica (celular/tablet) |
| 11 | **Mapa Interativo** | Fluxograma visual do sistema (React Flow) |
| 12 | **Visualizador 3D** | Peças em 3D (Three.js) |
| 13 | **Admin** | Gestão de usuários, permissões, customização de tema |
| 14 | **Auditoria** | Detecção de inconsistências no banco |
| 15 | **Equipamentos** | Cadastro e manutenção de equipamentos |

---

## 4. Módulo OFs (Ordens de Fabricação)

**Perguntas prováveis:**
- Como cadastro uma OF?
- Tem ficha técnica?
- Como controlo prioridades?

**Resposta canônica:**

O **Cadastro de OFs** é o coração do sistema. Cada OF representa uma ordem de produção para um cliente/projeto.

**Funcionalidades:**

- **Ficha técnica completa**: número da OF, gestor, projetista, revisão, quantidade, data início/término
- **Vinculação a peças** e processos
- **Status**: Aberta, Em produção, Pausada, Concluída, Cancelada
- **Prioridade**: configurável
- **Alterações rastreadas** (popup de AlteracoesPopup mostrando diff de mudanças)
- **Preview da ficha técnica** em PDF
- **Cálculo estrutural** integrado: flags `e` (estrutural), `c` (cálculo), `na` (não aplicável)

**Páginas relacionadas:**

- `CadastroOF.tsx` — formulário principal
- `OrdensFabricacao.tsx` — listagem geral
- `OFsConcluidas.tsx` — histórico de OFs concluídas
- `PrioridadesFabricacao.tsx` — gestão de prioridades
- `CronogramaOF.tsx` — cronograma

---

## 5. Módulo Produção

**Perguntas prováveis:**
- Como aponto produção?
- Tem painel industrial?
- Tem PCP?

**Resposta canônica:**

**Apontamento de produção:**

- Registro de produção por peça, por processo, por operador
- Diário de produção (`DiarioProducao.tsx`)
- Painel industrial (`PainelIndustrial.tsx`) — visual em tempo real
- Dashboard de produção (`DashboardProducao.tsx`)
- PCP (`PCP.tsx`) — planejamento e controle de produção

**Componentes:**

- `ApontamentoForm.tsx` / `ApontamentoFormCore.tsx` — formulário de apontamento
- `ApontamentosList.tsx` / `ApontamentosListOtimizado.tsx` — listagem
- `SeletorItensOtimizado.tsx` / `SeletorPecasSimples.tsx` — seleção rápida de peças

---

## 6. Módulo Estoque

**Perguntas prováveis:**
- Como controlo estoque?
- Tem CSV import?
- Tem alerta de estoque crítico?

**Resposta canônica:**

- **CRUD completo** de materiais (`Estoque.tsx` / `EstoqueSimplificado.tsx`)
- **Empenhos** por OF (`EmpenhosMaterialComponent.tsx`)
- **Movimentações em lote** (`EstoqueBatchMovementModal.tsx`)
- **Estoque crítico** com alertas (`EstoqueCriticoModal.tsx`)
- **Import em massa via CSV** (`CSVImportModal.tsx`)
- **Edição em lote** (`EstoqueBatchEditModal.tsx`)
- **Ações em lote** (`EstoqueBatchActions.tsx`)

---

## 7. Módulo Expedição

**Perguntas prováveis:**
- Como gero romaneio?
- Tem rastreio de entrega?
- Tem relatório de expedição?

**Resposta canônica:**

- **Romaneios** (`RomaneioTable.tsx`, `RomaneioForm.tsx`)
- **Itens do romaneio** (`ItensRomaneioModal.tsx`)
- **Relatórios de expedição** (`RelatoriosExpedicao.tsx`)
- Hooks React Query: `useRomaneios`, `useCriarRomaneio`, `useAtualizarRomaneio`, `useRemoverRomaneio`
- Vincular romaneio à OF ativa

---

## 8. Módulo Modo Smart (diferencial)

**Perguntas prováveis:**
- O que é o Modo Smart?
- Tem como usar no celular?
- Funciona em tablet na bancada?

**Resposta canônica:**

O **Modo Smart** é uma interface **touch-first, mobile-first** projetada para **operadores de chão de fábrica, canteiro de obras e uso em tablet fixado em bancada**.

**Pilares do Modo Smart (conforme `PLANO_MODO_SMART.md`):**

1. **Botões gigantes** (56-72px de altura) com "zona do polegar"
2. **Zero tabelas largas** com rolagem horizontal
3. **Modais em bottom sheets** (deslizam de baixo pra cima, como apps de banco)
4. **Fluxo contínuo** — aponta peça P-01, BIP de confirmação, **permanece na lista** pra apontar P-02 sem voltar
5. **Breadcrumbs interativos** no topo
6. **Tipografia grande** (16-24px) e alto contraste — legível no sol/fábrica
7. **BIP via Web Audio API** + vibração tátil — operação sem ler tela
8. **Zero curva de aprendizado** — wizard de 1 ação por tela
9. **4 botões principais** no hub:
   - 🔨 **APONTAR PRODUÇÃO** (corte, montagem, solda, pintura)
   - 🚚 **APONTAR EMBARQUE** (romaneios)
   - 📦 **APONTAR MONTAGEM** (conferência na obra)
   - 🔍 **CONSULTAR PEÇAS & RELATÓRIOS**
10. **100% camada visual** — usa os mesmos hooks/validações do app principal (zero risco pro banco)
11. **Sem dependência de QR Code** — seleção por listas limpas e buscas visuais

**Persistência do modo:**

- Escolha do modo fica salva no `localStorage` do dispositivo
- Tablets fixos na fábrica abrem direto no Modo Smart

**Como alternar:**

- Botão `[ 🏢 Modo Completo ]` no canto superior direito do Modo Smart

---

## 9. Módulo Mapa Interativo

**Perguntas prováveis:**
- Tem mapa visual do sistema?
- Tem como ver o fluxo?

**Resposta canônica:**

O **Mapa Interativo** é um fluxograma visual do sistema usando **React Flow** (`@xyflow/react`). Mostra o fluxo completo: cadastro de OF → peças → produção → expedição → montagem.

Útil pra:

- Treinamento de novos usuários
- Apresentação institucional
- Debug visual de processos
- Documentação viva

---

## 10. Módulo Conversor PDF→Excel

**Perguntas prováveis:**
- Tem conversor de PDF?
- Tem como importar lista de peças?

**Resposta canônica:**

Sim. O arquivo `conversor_relatorio_estruturas.html` é uma **página standalone** (não precisa de login) que:

- Lê PDFs de lista de peças (usando **pdf.js**)
- Extrai dados estruturados
- Converte pra **Excel** (usando **SheetJS/xlsx**)
- Pode ser aberto direto no navegador, sem instalar nada

**Útil pra:** importar lista de peças de fornecedores sem redigitar.

---

## 11. Módulo Dashboard

**Perguntas prováveis:**
- Tem dashboard?
- Tem KPIs?
- Tem gráfico?

**Resposta canônica:**

O Dashboard tem:

- **Cards de acesso rápido** (6 atalhos: Ficha Técnica, Painel OFs, etc.)
- **Calendário** (`CalendarClock.tsx`)
- **Usuários online** em tempo real (`OnlineUsers.tsx`)
- **Notificações e sugestões** (`NotificationsSugestoes.tsx`)
- **Gráficos de tarefas** (`TaskStatusChart.tsx`, `TaskTypeChart.tsx`)
- **Info do usuário** (`UserInfo.tsx`)
- **Fundo animado** (`BeamsBackground.tsx`)
- Botão **"Fluxo do Sistema"** que abre o Mapa Interativo

---

## 12. Módulo Auditoria

**Perguntas prováveis:**
- Tem auditoria?
- Detecta inconsistências?

**Resposta canônica:**

- **Verificador de inconsistências** (`VerInconsistencias.tsx`)
- **Modal de detalhes** (`InconsistenciaDetalhesModal.tsx` em `components/auditoria`)
- Detecta automaticamente problemas no banco (estoque negativo, OFs órfãs, apontamentos duplicados, etc)

---

## 13. Módulo Tarefas

**Perguntas prováveis:**
- Tem gestão de tarefas?
- Tem Kanban?

**Resposta canônica:**

- `Tarefas.tsx` — gestão principal
- `TarefasHistorico.tsx` — histórico
- `Atribuicoes.tsx` — atribuições
- `CronogramaOF.tsx` — cronograma integrado

---

## 14. Módulo Biblioteca

**Perguntas prováveis:**
- Tem normas técnicas?
- Tem catálogo?

**Resposta canônica:**

3 bibliotecas separadas:

- `BibliotecaNormas.tsx` — normas técnicas (ABNT, AISC, etc)
- `BibliotecaReferencias.tsx` — referências técnicas
- `BibliotecaFerramentas.tsx` — ferramentas e utilitários

---

## 15. Módulo Obras

**Perguntas prováveis:**
- Tem gestão de obras?
- Como controlo montagem?

**Resposta canônica:**

- `Obra.tsx` — listagem e gestão
- `ObraConfiguracoes.tsx` — configurações por obra
- Vinculado a OFs, expedição e apontamento de montagem (Modo Smart)

---

## 16. Módulo Equipamentos

**Perguntas prováveis:**
- Tem controle de equipamentos?

**Resposta canônica:**

- `Equipamentos.tsx` — cadastro e gestão
- Vinculado a apontamentos (qual equipamento foi usado em cada apontamento)

---

## 17. Módulo PCP e Planejamento

**Perguntas prováveis:**
- Tem PCP?
- Tem planejamento de produção?

**Resposta canônica:**

- `PCP.tsx` — Planejamento e Controle de Produção
- `PlanejamentoProducao.tsx` — planejamento detalhado
- `CronogramaOF.tsx` — cronograma por OF
- `PrioridadesFabricacao.tsx` — prioridades
- `PrioridadesFabricacaoSimples.tsx` — versão simplificada (mobile)
- `Sugestoes.tsx` — sugestões automáticas de priorização

---

## 18. Stack técnica

**Perguntas prováveis:**
- Como funciona por dentro?
- Qual stack?

**Resposta canônica:**

**Frontend:**

- React 18.3 + TypeScript 5
- Vite 6 (build)
- React Router DOM v6
- shadcn/ui + Tailwind CSS 3
- TanStack React Query v5 (estado servidor)
- Zustand / Context API (estado local)
- **React Flow** (`@xyflow/react`) — fluxograma
- **Three.js** — visualizador 3D
- jsPDF + html2canvas + jspdf-autotable — geração de PDFs
- Recharts — gráficos
- date-fns / date-fns-tz — datas
- lucide-react — ícones
- Sonner — toasts
- React Hook Form + Zod — formulários

**Backend:**

- **Supabase** (Postgres + Auth + Storage + RLS)
- Logto (auth alternativo, em migração)

**Infraestrutura:**

- Docker + Coolify
- Nginx
- Cloudflare Tunnel
- GitHub Actions (deploy)

---

## 19. Conversor PDF→Excel (standalone)

**Perguntas prováveis:**
- Como converter PDF de lista de peças em Excel?
- Tem ferramenta de importação?

**Resposta canônica:**

Sim. O arquivo `conversor_relatorio_estruturas.html` é uma página **standalone** (não precisa de login no app) que:

- Aceita upload de PDF (lista de peças / relatório de estruturas)
- Extrai dados via **PDF.js**
- Permite mapear colunas
- Exporta pra **Excel** via SheetJS

**Como usar:**

1. Abrir `conversor_relatorio_estruturas.html` no navegador
2. Upload do PDF
3. Conferir extração
4. Exportar XLSX

---

## 20. Comparativos honestos

**Perguntas prováveis:**
- Diferença do SAP?
- Diferença do TOTVS?
- Vale a pena?

**Resposta canônica:**

| | TrackSteel | SAP / TOTVS (ERP) | Planilha + Sistema Avulso |
|---|---|---|---|
| Foco em estruturas metálicas | ✅ Nativo | ❌ Genérico | ❌ |
| Modo Smart (chão de fábrica) | ✅ Mobile-first | ❌ Web/desktop | ❌ |
| Mapa Interativo visual | ✅ React Flow | ❌ | ❌ |
| Conversor PDF→Excel embutido | ✅ | ❌ | ❌ |
| Painel industrial em tempo real | ✅ | 🟡 Caro | ❌ |
| Auditoria automática de inconsistências | ✅ Nativa | 🟡 Custom caro | ❌ |
| PCP integrado | ✅ | ✅ | ❌ |
| Expedição com romaneio | ✅ | ✅ | Parcial |
| Curva de aprendizado | Média (2 semanas) | Alta (meses) | Alta |
| Custo | Freemium | Alto | Variável |
| On-premise / Self-hosted | ✅ | ❌ (cloud) | ✅ |
| Stack moderno | ✅ React 18 + Supabase | ❌ Legacy | n/a |

**Posicionamento:** único sistema brasileiro **moderno** especializado em estruturas metálicas com **Modo Smart touch-first** pro chão de fábrica.

---

## 21. Casos de uso

**Caso 1 — Encarregado de produção:**

"Antes eu anotava produção em caderno e passava pra planilha no fim do turno. Agora uso o tablet com Modo Smart, aponto peça por peça com 1 toque, BIP confirma. Relatório do meu turno sai automático."

**Caso 2 — Engenheiro PCP:**

"Antes era 2h por dia montando planilha de prioridades. Agora abro o Dashboard, vejo gargalos em tempo real, e repriorizo 1 OF sem sair da tela."

**Caso 3 — Operador de solda na bancada:**

"Tablet fixado na bancada. Toque em [⚡ SOLDA], seleciono a peça, faço o BIP, próximo. Sem voltar 4 telas."

**Caso 4 — Auditoria interna:**

"O Verificador de Inconsistências detecta sozinho: estoque negativo, OFs órfãs, apontamentos duplicados. Antes era descobrir no mês seguinte."

---

## 22. Limitações honestas

**Perguntas prováveis:**
- Tem limitação?
- O que NÃO faz?

**Resposta canônica:**

- **Não é ERP completo** — não tem contabilidade, fiscal, RH (integra com ERP via API)
- **Não é CRM** — não gerencia vendas, funil, propostas (integra com CRM externo)
- **Não é software BIM** — não modela estrutura 3D (consome IFC/DWG via import)
- **Foco em estruturas metálicas** — não recomendado pra mecânica, caldeiraria genérica
- **Depende de internet no Modo Smart** — pra BIP offline é limitado
- **Conversor PDF→Excel depende do formato do PDF** — PDFs escaneados com OCR limitado

---

## 23. Roadmap

**Resposta canônica:**

- [ ] OCR robusto para PDFs escaneados no conversor
- [ ] App nativo iOS/Android pro Modo Smart
- [ ] BI / dashboards executivos avançados
- [ ] Integração nativa com BrainBeam (geração de memorial por OF)
- [ ] Integração com BrainDocs (databook AS-BUILT por OF)
- [ ] Etiquetas QR nas peças para apontamento sem seleção manual

---

## 24. Pricing

**Resposta canônica:**

| Plano | Preço | Inclui |
|---|---|---|
| Free | R$ 0 | Até 50 OFs/mês, 1 usuário, sem Modo Smart |
| Pro | [definir] | OFs ilimitadas, 10 usuários, Modo Smart |
| Enterprise | [sob consulta] | Ilimitado, customizações, on-premise |

---

## 25. Suporte

**Resposta canônica:**

- E-mail: [definir]
- Documentação: pasta `docs/` no repositório
- Discord: [definir]

---

## 26. FAQ rápido

**P: O que é o Modo Smart?**
R: É uma interface **touch-first pra chão de fábrica** (tablet/celular). Botões gigantes, BIP, fluxo contínuo sem voltar telas. Projetado pra operadores com luva no sol da fábrica.

**P: Como alterno entre Modo Smart e Modo Completo?**
R: No canto superior direito do Modo Smart tem o botão `[ 🏢 Modo Completo ]`. A escolha fica salva no `localStorage` do dispositivo.

**P: Tem app mobile?**
R: O Modo Smart funciona em qualquer navegador mobile/tablet como PWA. App nativo iOS/Android em roadmap.

**P: O que é uma OF?**
R: **Ordem de Fabricação**. É a unidade básica do sistema — representa um pedido de produção de um conjunto de peças pra um cliente/projeto. Contém ficha técnica, peças, processos, status.

**P: Como funciona o apontamento de produção?**
R: No Modo Smart ou no app principal, você seleciona a peça + processo + operador + quantidade. O sistema registra o apontamento com timestamp. O status da peça avança automaticamente.

**P: Tem controle de qualidade?**
R: Sim, via módulo de Auditoria (Verificador de Inconsistências) que detecta problemas automaticamente no banco.

**P: Como gero relatórios?**
R: Cada módulo tem botão de export PDF (jsPDF). Painel Industrial tem relatórios consolidados. Modo Smart tem botão "Gerar Relatório do Meu Turno".

**P: Tem conversor de PDF?**
R: Sim, o `conversor_relatorio_estruturas.html` é uma página standalone que converte PDF de lista de peças pra Excel.

**P: Funciona offline?**
R: O app é PWA, pode cachear a interface. Mas Supabase exige internet pra gravar dados. Modo Smart offline é limitado.

**P: Tem API?**
R: Sim, Supabase fornece PostgREST automático. Pode integrar com qualquer sistema.

---

## 27. Glossário técnico

- **OF** — Ordem de Fabricação (unidade básica do sistema)
- **PCP** — Planejamento e Controle de Produção
- **Modo Smart** — Interface touch-first pro chão de fábrica
- **PWA** — Progressive Web App (instalável, offline-first)
- **Romaneio** — Documento de expedição (nota de entrega)
- **Apontamento** — Registro de produção (peça × processo × operador × qtd)
- **Empenho** — Reserva de material vinculada a OF
- **RLS** — Row-Level Security no Supabase/Postgres
- **TanStack Query** — Hook de cache/fetch de dados do servidor
- **React Flow** — Biblioteca de fluxogramas interativos
- **jsPDF** — Geração de PDF no frontend
- **BIP** — Confirmação sonora via Web Audio API
- **Bottom Sheet** — Modal que desliza de baixo pra cima (padrão mobile)

---

## 28. Mensagens prontas para o bot (por intenção)

### Quando o usuário pergunta o que faz

> O TrackSteel é uma plataforma brasileira de gestão industrial especializada em estruturas metálicas. Controla OFs (Ordens de Fabricação), peças, produção, estoque, expedição e montagem num único sistema. Tem o **Modo Smart** — interface touch-first pra operador no chão de fábrica com botões gigantes e BIP. Quer saber mais sobre algum módulo?

### Quando o usuário é operador de fábrica

> Você vai usar o **Modo Smart** no tablet. Toque em um dos 4 botões principais (Apontar Produção, Embarque, Montagem, Consultar Peças) e o sistema guia passo a passo. Cada peça confirmada emite BIP. Sem voltar telas.

### Quando o usuário é gerente

> Você usa o **Modo Completo** no PC. Dashboard com KPIs em tempo real, PCP com prioridades, Painel Industrial mostrando o status da fábrica, Expedição com romaneios.

### Quando o usuário quer importar lista de peças

> Tem o **Conversor PDF→Excel** standalone em `conversor_relatorio_estruturas.html`. Abre no navegador, sobe o PDF, baixa o Excel pronto pra importar.

### Quando o usuário pergunta sobre o mapa do sistema

> O **Mapa Interativo** usa React Flow pra mostrar visualmente o fluxo completo: cadastro → peças → produção → expedição → montagem. Útil pra treinar time novo.

### Quando o usuário reporta bug

> Desculpa. Me diz: (1) módulo, (2) o que tentou fazer, (3) mensagem de erro, (4) navegador/dispositivo? Vou encaminhar pra equipe.

---

## 29. Highlights & Diferenciais Competitivos

> **Objetivo:** dar ao bot argumentos fortes pra responder "por que escolher TrackSteel em vez de ERP genérico / planilha" e destacar inovação real.

### 29.1 Os 8 destaques principais do TrackSteel

| # | Highlight | Inovação técnica | Benefício humano direto |
|---|---|---|---|
| 1 | **Modo Smart — interface touch-first pra chão de fábrica** | Botões 56-72px, bottom sheets, BIP via Web Audio API, fluxo contínuo sem voltar telas, breadcrumbs interativos, persistência por `localStorage` | Operador com luva no sol da fábrica **aponta peça com 1 toque + BIP**. Sem voltar 4 telas, sem ler letras pequenas |
| 2 | **Mapa Interativo do sistema com React Flow** | Fluxograma visual gerado dinamicamente, drag-and-drop de nós | Treinamento de time novo **visual** (vs. manual de 50 páginas). Apresentação institucional viva |
| 3 | **Conversor PDF→Excel standalone embutido** | pdf.js + SheetJS em página standalone (`conversor_relatorio_estruturas.html`), sem login | **Importar lista de peças** de fornecedor sem redigitar. Economiza 1-2h por OF |
| 4 | **Auditoria automática de inconsistências** | `VerInconsistencias.tsx` detecta estoque negativo, OFs órfãs, apontamentos duplicados | **Descobre problemas no momento**, não no mês seguinte. Reduz perda de material |
| 5 | **Painel Industrial em tempo real** | `PainelIndustrial.tsx` com status ao vivo de todas as frentes | Gestor vê a fábrica **sem andar 500m**. Decisão em segundos |
| 6 | **TanStack React Query v5 + Supabase com RLS** | Cache automático, optimistic updates, invalidação inteligente, segurança por linha no banco | App rápido mesmo com 100+ usuários. **Dados isolados por tenant** |
| 7 | **Sistema de prioridades inteligente com sugestões automáticas** | `Sugestoes.tsx` + `PrioridadesFabricacao.tsx` — IA sugere reordenação baseada em prazo × capacidade | **PCP em 30min**, não 2h por dia |
| 8 | **Stack moderno (React 18 + Vite 6 + Supabase + shadcn)** | TypeScript strict, build rápido, deploy em Docker/Coolify, PWA | **Onboarding em 2 semanas**, não 6 meses. Equipe produtiva rápido |

### 29.2 Tabela comparativa com concorrentes

| Critério | SAP / TOTVS | Planilha + Sistema Avulso | **TrackSteel** |
|---|---|---|---|
| Foco em estruturas metálicas | ❌ Genérico | ❌ | ✅ **Nativo** |
| Modo Smart touch-first (chão de fábrica) | ❌ | ❌ | ✅ **Único** |
| Mapa Interativo do sistema | ❌ | ❌ | ✅ React Flow |
| Conversor PDF→Excel embutido | ❌ | ❌ | ✅ Standalone |
| Auditoria automática de inconsistências | 🟡 Custom caro | ❌ | ✅ **Nativa** |
| Painel Industrial tempo real | 🟡 Caro | ❌ | ✅ |
| PCP integrado | ✅ | Parcial | ✅ + **sugestões IA** |
| PWA / Mobile-first | ❌ Desktop | ❌ | ✅ Modo Smart |
| Onboarding | Meses | Semanas | **2 semanas** |
| Stack moderno | ❌ Legacy | n/a | ✅ React 18 + Supabase |
| Custo | Alto | Variável | **Freemium** |

### 29.3 Recursos de destaque do Modo Smart

| Funcionalidade | Descrição |
|---|---|
| Botões gigantes | 56-72px, zona do polegar, funciona com luva |
| Fluxo contínuo | Aponta P-01, BIP, fica na lista pra P-02 sem voltar |
| Bottom sheets | Modais deslizam de baixo pra cima (padrão app banco) |
| Breadcrumbs interativos | `[ ⚡ Solda ▾ ] [ 🏢 Pilares ▾ ]` no topo |
| BIP via Web Audio API | Confirmação sonora sem precisar ler tela |
| Vibração tátil | Feedback adicional (em dispositivos compatíveis) |
| Persistência por dispositivo | Tablet fixo abre direto no Smart |
| 4 botões principais | Apontar Produção / Embarque / Montagem / Consultar |
| Wizard 1 ação por tela | Zero curva de aprendizado |
| 100% camada visual | Mesmos hooks/validações do app principal |

### 29.4 Argumento-chave

> "O TrackSteel é a única plataforma brasileira **moderna e especializada em estruturas metálicas** que une **Modo Smart touch-first pra chão de fábrica (botões gigantes, BIP, fluxo contínuo)**, **Mapa Interativo visual do sistema (React Flow)**, **Conversor PDF→Excel standalone**, **Auditoria automática de inconsistências**, e **Painel Industrial em tempo real** — num único sistema com stack moderno (React 18 + Supabase + TanStack Query) e onboarding em 2 semanas."

---

## 30. Versões e atualizações deste KB

- **v1.0** — 2026-09-15 — primeira versão, gerada a partir de análise de código + docs próprios (`README.md`, `PLANO_MODO_SMART.md`, `migracao_vps_plano.md`)

---

*Fim do documento. Para correções, contate a equipe de produto do TrackSteel.*
