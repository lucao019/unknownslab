# Changelog — Unknowns Lab

Histórico de desenvolvimento. Cada versão representa uma etapa real, testada e confirmada.

Formato: [versão] - data | o que mudou | o que foi testado.

---

## [Unreleased] - 2026-10-22

### Atualizado
- Redesign do Control Center para o tema Cyberpunk Purple, com paleta centralizada em variáveis CSS e aplicação consistente nas telas e componentes.
- Sidebar com indicadores de navegação independentes, destaque roxo animado somente no item ativo e suporte a movimento reduzido.
- Opção **UI Sounds** em Settings: som curto gerado pela Web Audio API somente em trocas efetivas de página; preferência persistida localmente.
- Escala dos overlays de teclado e mouse salva localmente com gravação agrupada e limites seguros; redimensionamento do overlay do mouse mantém a âncora visual correta.
- Script `create-shortcut.ps1` remove atalhos antigos do Unknowns Lab nas áreas de trabalho pessoal e pública antes de criar um atalho para a versão portátil.
- FCC (Free Claude Code) foi usado como apoio em algumas etapas de desenvolvimento; as alterações foram verificadas no projeto.

### Adicionado
- Estrutura visual inicial do PUBG Performance Lab com áreas de input lag, FPS, clareza visual, perfis NVIDIA e tutorial de comparação antes/depois.
- Explicação da diferença entre NVIDIA Control Panel (oficial) e NVIDIA Profile Inspector (terceiros), com estado informativo sem aplicação.
- Diagnóstico opcional e somente leitura de CPU, RAM, GPUs, monitores e armazenamento, com fontes identificadas e avisos para dados indisponíveis.
- Monitor local opcional de hardware ao vivo, atualizado a cada dois segundos pela ponte somente leitura do LibreHardwareMonitor, com sensores disponíveis de CPU, GPU, RAM, placa-mãe e armazenamento; `nvidia-smi` complementa a telemetria NVIDIA. Inclui fallback explícito se a ponte não iniciar e indica FPS/sensores indisponíveis sem estimativas.
- Leitura e comparação local de arquivos `.nip`/XML selecionados pelo diálogo nativo, mostrando perfis, executáveis e valores diferentes sem aplicar alterações; arquivos com vários perfis são recusados em vez de agrupados incorretamente.
- Crosshair em janela Electron transparente, centralizada, click-through e escondida enquanto o botão direito está pressionado.
- Presets estáticos de ponto, cruz e círculo, com controles de cor, tamanho e opacidade.
- Preservação local do preset, cor, tamanho e opacidade entre execuções.
- Mira exibida somente quando a janela do PUBG (`TslGame.exe`) está em primeiro plano.
- Configuração da crosshair encaminhada por IPC seguro e reaplicada após o overlay terminar de carregar.
- Crosshair adicionada ao catálogo de módulos do Control Center.
- Atalhos da crosshair: `~` / `[` alternam o tipo, `´` / `]` percorrem a paleta de cores e Ctrl + scroll ajusta o tamanho.
- Prévia da crosshair no painel acompanha os ajustes e usa o mesmo renderizador do overlay do jogo.
- Card de prévia arrastável dentro do painel, com posição salva localmente e suporte a teclado.
- Binds da mira também atualizam a prévia com o jogo fechado quando o Control Center está em foco.

### Corrigido
- Removida a opção de tela cheia sem bordas, que não funcionava no PUBG.
- Scroll vertical habilitado no conteúdo principal do Control Center.
- Dashboard atualiza a lista e os contadores de módulos ativos e com erro após os toggles.
- Overlays são fechados ao encerrar a janela principal; instâncias adicionais focam a janela existente.
- Tamanho da crosshair atualiza durante o arraste do slider.
- Captura do botão direito da crosshair permanece ativa ao ligar ou desligar os visualizadores de teclado e mouse.

### Segurança
- IDs de módulos validados e configuração da crosshair sanitizada no processo principal.
- Leitura de perfil limitada a arquivos escolhidos pelo usuário, apenas XML de até 2 MB, com DTD/ENTITY rejeitados e nenhum caminho arbitrário exposto ao renderer.
- URLs externas limitadas a HTTP/HTTPS e deslocamentos de overlay limitados.

### Ferramentas e validação
- Electron 45, Canvas 2D, `contextBridge`/IPC, `uiohook-napi` e `electron-builder`.
- `node --check` nos arquivos JavaScript alterados e teste do monitor de janela ativa: aprovados.
- Serviço de diagnóstico executado no Windows; validação dos IDs da interface e `git diff --check`: aprovados.
- Parser de perfil testado com o esquema XML do NVIDIA Profile Inspector: perfil, executável, SettingNameInfo/ID/valor, comparação, recusa de arquivos com vários perfis e rejeição de DTD/ENTITY aprovadas.
- Monitor ao vivo testado no PC: polling contínuo e encerramento corretos; RTX 2060 retornou uso, temperatura, VRAM e ventoinha; renderização da interface mostrou sensores disponíveis e indisponibilidade de FPS/temperatura da CPU.
- Dependências npm dentro das faixas compatíveis atualizadas e Electron atualizado para 45.0.0; build Windows x64 descompactado e publicação do helper aprovados.
- `npm audit`: repositório raiz sem vulnerabilidades; Control Center sem avisos altos após atualizar o Electron, mas ainda com 8 moderados na cadeia de ferramentas de build (`electron-builder`/`@electron/get`/`global-agent`/`sprintf-js`).
- `npm run build`: build Windows x64, incluindo NSIS e versão portátil, concluído com sucesso.
- `node --check` nos arquivos JavaScript alterados e `git diff --check`: aprovados.
- Interface conferida no navegador: navegação por clique/teclado, item ativo, ausência de linhas conectando os indicadores, preferência de som após recarregar e layout em viewport estreita aprovados. O fluxo de áudio foi validado com AudioContext simulado; a saída audível no app empacotado não foi medida.
- Comportamento do overlay confirmado em execução pelo usuário.

### Limitação
- Jogos em fullscreen exclusivo podem impedir overlays externos; usar modo janela sem bordas quando necessário.
- Leitura de FPS/frametime e temperatura da CPU depende de provedor ainda não disponível neste PC. Controle de ventoinhas não foi habilitado; requer controlador suportado e confirmação explícita para qualquer alteração.

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
