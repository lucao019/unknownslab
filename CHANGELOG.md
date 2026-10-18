# Changelog — Unknowns Lab

Histórico de desenvolvimento. Cada versão representa uma etapa real, testada e confirmada.

Formato: [versão] - data | o que mudou | o que foi testado.

---

## [0.6.0] - 2026-10-18

### Renomeado
- Projeto renomeado de `lucao-pubg-stats` para **Unknowns Lab**
- `package.json` raiz: `name` atualizado para `unknowns-lab`, versão `0.6.0`
- Control Center: `name` atualizado para `unknowns-lab-control-center`
- Titlebar, título da janela e todos os textos internos atualizados
- `appId` do build atualizado para `com.lucao.unknowns-lab`
- Output do build atualizado para `H:\Unknowns-Lab-Build\`
- Artefato portátil renomeado para `Unknowns-Lab-portable.exe`

### Atualizado
- `README.md` reescrito — arquitetura, stack, mentalidade, módulos, limitações
- `CHANGELOG.md` consolidado com histórico completo

---

## [0.5.1] - 2026-10-18

### Control Center — Fase 1

Primeira versão do app desktop **Electron** para gerenciamento de módulos.

#### Adicionado
- Shell Electron com janela 1100×720, frame customizado, fundo `#0d0d0f`
- Titlebar sem bordas com botões minimize / maximize / fechar
- `preload.js` com `contextBridge` — renderer isolado do Node.js
- Design system CSS completo:
  - Paleta escura com acento amarelo `#F5C518`
  - 6 estados visuais de módulo: OFF / STARTING / ON / STOPPING / ERROR / UNAVAILABLE
  - Toggle switch, cards de módulo, stat cards, search bar, filter chips, empty state
  - Animações discretas < 300ms
- Sidebar de navegação com 5 seções: Dashboard, Overlay, Movement Lab, Input Analysis, Streaming, Settings
- **Module Registry** — catálogo de 13 módulos com metadados (id, nome, descrição, categoria, ícone, dependências, `implemented`)
- **Module Manager** — ciclo de vida real (start / stop / toggle / stopAll) com emissão de eventos
- Dashboard com stat cards (ativos, indisponíveis, erros) e grids de módulos ativos e com erro
- Busca por nome/descrição na página Overlay
- Módulos não implementados exibidos como UNAVAILABLE — toggle desabilitado, mensagem honesta
- `pubg-stats-overlay` como único módulo `implemented: true` — toggle verifica servidor real em `localhost:5051`
- Serviço `services/pubg-stats.js` — ping real ao servidor, polling a cada 60s
- `electron-builder` configurado para gerar instalador NSIS + portátil x64
- Ícone ICO gerado com 5 resoluções (256, 64, 48, 32, 16px) via `System.Drawing`

#### Testado
- Build gerado com sucesso: `PUBG-Input-Lab-portable.exe` (~77 MB)
- Executável abre e exibe interface corretamente após `Unblock-File`
- Navegação entre todas as seções funcional
- Toggle do PUBG Stats Overlay muda para ERROR sem servidor; muda para ON com servidor rodando
- Dashboard atualiza contadores em tempo real ao alterar estado de módulos
- `.gitignore` atualizado para excluir `control-center/node_modules/` e `control-center/dist/`

---

## [0.5.0] - 2026-09-29

### Adicionado
- Cache incremental de partidas usando `Map`
- Processamento único de partidas já conhecidas
- Atualização automática das estatísticas a cada 60 segundos
- Reset automático do cache na mudança de dia
- Integração com a API oficial da Steam
- Contador de jogadores simultâneos do PUBG na Steam
- Cache de 5 minutos para jogadores online
- Campo `jogadoresOnline` na API `/api/hoje`
- Exibição de jogadores online no overlay do OBS

### Melhorado
- Partidas antigas não têm mais a telemetria baixada e processada repetidamente
- Redução de requisições desnecessárias à PUBG API
- Backend mantém cache das partidas já processadas

### Testado
- Cache reutilizando partidas nas atualizações seguintes
- Nova partida detectada automaticamente sem reiniciar o servidor
- Totais recalculados após a entrada de uma nova partida
- Consulta de jogadores online pela Steam funcionando
- Fluxo Steam → Backend → API → Overlay funcionando

---

## [0.4.0] - 2026-09-29

### Overlay OBS
- Criado overlay próprio para utilização como Browser Source no OBS
- Criados `overlay.html`, `overlay.css` e `overlay.js`
- Atualização automática dos dados a cada 60 segundos
- Animação de impacto quando uma estatística muda
- Visual minimalista com fundo transparente
- Efeito de sombra animada atrás das estatísticas

### Informações exibidas
- Kills do dia
- Damage do dia
- Número de partidas
- Jogadores online no PUBG (Steam)
- Arma com mais kills e quantidade

---

## [0.3.0] - 2026-09-29

### Telemetria e armas
- Leitura da telemetria das partidas via PUBG API
- Identificação de eventos `LogPlayerKillV2`
- Contagem de kills por arma
- Arma com mais kills como stat principal
- Tabela de tradução de nomes internos para nomes de exibição (ex: `WeapHK416_C` → `M416`)
- `arma-hoje.js` para testes isolados da telemetria

---

## [0.2.0] - 2026-09-29

### Stats do dia
- Consulta à PUBG API para buscar partidas do jogador
- Filtro de partidas pelo dia atual (timezone America/Sao_Paulo)
- Acumulação de kills, damage, dbnos e tempo de sobrevivência
- Endpoint `GET /api/hoje` com resultado em JSON
- Cache com TTL de 60 segundos para evitar excesso de requisições
- `hoje.js` para testes isolados

---

## [0.1.0] - 2026-09-29

### Início do projeto
- Servidor Express na porta 5051
- Consulta básica à PUBG API para localizar o jogador `lucao99999999999`
- `teste-api.js` para validação da chave e da conexão com a API
- `.env` com `PUBG_API_KEY`
- `.gitignore` com `.env` e `node_modules/`

---

## Roadmap

| Fase | Objetivo | Estado |
|---|---|---|
| Fase 1 | Shell do Control Center + design system + Module Registry | ✅ Concluída |
| Fase 2 | Keyboard Visualizer — overlay de teclas em tempo real | 🔜 Próxima |
| Fase 3 | Mouse Visualizer + Keystroke History | 🔜 Planejada |
| Fase 4 | Movement Lab — exercícios WASD, strafe, sprint, crouch, jump | 🔜 Planejada |
| Fase 5 | Session Recorder + Event Timeline + Input Intervals | 🔜 Planejada |
| Fase 6 | OBS Integration + Tutorial Mode | 🔜 Planejada |
| Fase 7 | Testes, documentação técnica, revisão geral | 🔜 Planejada |
