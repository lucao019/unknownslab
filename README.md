# Unknowns Lab

Painel de ferramentas de live, overlay e análise de inputs para PUBG PC.

Desenvolvido por **lucao99999999999** para uso próprio durante transmissões e gravações de tutoriais.

---

## O que é

O Unknowns Lab começou como um overlay simples de estatísticas do PUBG para OBS. Virou um projeto maior: um **Control Center desktop** que centraliza e gerencia todas as ferramentas visuais e de análise usadas durante as lives.

A ideia é ter controle real sobre o que aparece na tela, como os inputs são capturados e exibidos, e como as sessões são analisadas — sem depender de soluções de terceiros que você não controla.

---

## Estrutura do projeto

```
unknowns-lab/
├── server.js              ← Servidor Node.js / Express (stats PUBG)
├── public/
│   ├── overlay.html       ← Overlay de stats para OBS Browser Source
│   ├── overlay.css
│   └── overlay.js
├── control-center/        ← App desktop Electron (Control Center)
│   ├── electron.js
│   ├── preload.js
│   └── src/
│       ├── index.html
│       ├── styles/        ← Design system CSS
│       ├── registry/      ← Catálogo de módulos
│       ├── manager/       ← Ciclo de vida dos módulos
│       ├── services/      ← Implementação real de cada módulo
│       └── ui/            ← Interface e componentes
└── .env                   ← PUBG_API_KEY (não comitar)
```

---

## Arquitetura

```
PUBG API
  │
  ▼
Node.js / Express  (server.js — porta 5051)
  │
  ├── GET /api/hoje  →  kills, damage, partidas, arma, jogadores online
  │
  ▼
OBS Browser Source          Electron Control Center
(public/overlay.html)       (control-center/)
                                │
                                ├── UI → preload seguro → IPC
                                └── Overlays independentes (teclado, mouse, crosshair)
```

O overlay de crosshair é uma janela transparente do Electron com canvas 2D. O painel inclui uma prévia do jogo que acompanha estilo, cor, opacidade e tamanho selecionados; arraste a alça do card para reposicioná-lo dentro do painel (a posição fica salva localmente) ou use as setas com a alça selecionada. A configuração da mira é enviada pelo Control Center via IPC e salva no perfil local do usuário. A mira só aparece enquanto a janela do PUBG (`TslGame.exe`) está ativa, acompanha o centro da área de jogo mesmo em modo janela e se oculta ao alternar para qualquer outra janela. Com o jogo fechado, os binds também atualizam a prévia quando o Control Center está em foco. Use `~` / `[` para alternar entre ponto, cruz e círculo, `´` / `]` para percorrer as cores disponíveis e Ctrl + scroll para ajustar o tamanho. O jogo precisa estar em modo janela ou janela sem bordas para que o overlay externo fique visível.

## PUBG Performance Lab

A página **Enhancements** inclui diagnóstico local e monitoramento ao vivo opcional, atualizado a cada dois segundos. No Windows, o LibreHardwareMonitor coleta os sensores disponibilizados pela CPU, GPU, memória, placa-mãe e armazenamento; `nvidia-smi` complementa as leituras NVIDIA, incluindo VRAM e velocidade atual da ventoinha. Se a ponte não iniciar, o monitor usa as APIs locais do Node.js e `nvidia-smi` como fallback e informa essa condição. Sensores sem leitura são mostrados como indisponíveis; dados não são estimados. FPS/frametime exige um provedor de captura de frames compatível e não é inferido a partir do uso da GPU. O monitor é somente leitura: não muda energia, driver nem rotação de ventoinhas. Não há resultados de benchmark pré-carregados; comparações devem usar medições reais com fonte e condições registradas.

O helper do LibreHardwareMonitor é compilado como executável Windows x64 self-contained antes do build (`npm run build`) e incluído em `extraResources`. As DLLs oficiais necessárias e a licença MPL 2.0 estão em `control-center/vendor/LibreHardwareMonitor/v0.9.6/`; o aplicativo não instala serviços nem solicita elevação automática.

O painel permite selecionar arquivos `.nip`/XML do NVIDIA Profile Inspector por uma caixa de diálogo nativa. A análise aceita um perfil por arquivo; exportações com vários perfis são recusadas para evitar misturar configurações. Para identificar diferenças, selecione o original e o recebido; o app mostra nome do perfil, executáveis e valores do XML, sem aplicar mudanças. O formato não informa a justificativa da recomendação e a ausência de uma opção num arquivo não prova que ela foi removida do driver. A comparação é entre arquivos, não entre o XML e as configurações atualmente aplicadas. O **NVIDIA Control Panel** é a interface oficial do fabricante; o **NVIDIA Profile Inspector** é um utilitário de terceiros. Eles não são equivalentes.

---

## Módulos disponíveis

| Módulo | Estado | Descrição |
|---|---|---|
| PUBG Stats Overlay | ✅ Implementado | Exibe stats do dia via servidor local |
| Keyboard Visualizer | ✅ Implementado | Teclas pressionadas em tempo real |
| Mouse Visualizer | ✅ Implementado | Cliques, scroll e botões laterais do mouse |
| Crosshair | ✅ Implementado | Mira estática com presets de ponto, cruz e círculo; cor, tamanho e opacidade configuráveis e salvos |
| Keystroke History | 🔜 Fase 4 | Histórico de inputs em faixa |
| WASD / Strafe Trainer | 🔜 Fase 5 | Exercícios de movimentação |
| Session Recorder | 🔜 Fase 6 | Gravação de sessões de input |
| Event Timeline | 🔜 Fase 6 | Linha do tempo de inputs |
| OBS Integration | 🔜 Fase 7 | Controle de Browser Sources no OBS |
| Tutorial Mode | 🔜 Fase 7 | Layout para gravação de tutoriais |

Módulos marcados como 🔜 aparecem no Control Center como **INDISPONÍVEL** até sua implementação real e validação. Nenhum módulo é marcado como funcional sem estar testado.

---

## Instalação e uso

### Pré-requisitos

- Node.js 18+
- Chave da PUBG API em `.env`:
  ```
  PUBG_API_KEY=sua_chave_aqui
  ```

### Servidor de stats

```bash
node server.js
```

Acessa em `http://localhost:5051`

Overlay para OBS: `http://localhost:5051/overlay.html`
(adiciona como Browser Source, 1280x100, fundo transparente)

### Control Center

```bash
cd control-center
npm install
npm start
```

Ou usa o executável gerado em `H:\Unknowns-Lab-Build\`.

### Build do executável

```bash
cd control-center
npm run build
```

Gera instalador e versão portátil em `H:\Unknowns-Lab-Build\`.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Servidor de stats | Node.js + Express |
| Overlay OBS | HTML + CSS + JS puro |
| Control Center | Electron 34 |
| UI | CSS custom (sem framework) |
| Renderização da crosshair | Canvas 2D em janela Electron transparente |
| Comunicação UI/overlays | `contextBridge` + IPC do Electron |
| Captura do botão direito | `uiohook-napi` |
| Ícones | Lucide (SVG inline) |
| Build | electron-builder |
| API externa | PUBG API oficial |
| API externa | Steam Web API (jogadores online) |

---

## Mentalidade de desenvolvimento

- **Inspecionar antes de modificar.** Nenhum arquivo é editado sem ser lido antes.
- **Uma mudança de cada vez.** Alterações pequenas, isoladas e reversíveis.
- **Só marca como pronto o que foi testado.** Módulos planejados aparecem como INDISPONÍVEL na interface até estarem implementados e validados.
- **Sem inventar métricas.** Benchmarks de desempenho usam baseline real, não estimativas.
- **Separação de responsabilidades.** Captura de eventos, processamento, apresentação visual e configuração são camadas distintas.
- **Privacidade por padrão.** Input logging só captura o necessário, com controle explícito para iniciar e parar. Nenhum dado sensível é registrado.
- **Ferramentas externas de observação.** O projeto nunca injeta código no PUBG, manipula memória, automatiza recoil ou interfere com anti-cheat.

---

## Limitações conhecidas

- O servidor de stats depende da PUBG API oficial — sujeito a rate limit e disponibilidade externa.
- O Control Center não inicia o servidor automaticamente nesta versão — ambos precisam ser iniciados separadamente.
- Executáveis gerados sem certificado de código assinado ativam o SmartScreen no Windows. Solução: clique direito → Propriedades → Desbloquear, ou `Unblock-File` via PowerShell.
- Fonte Inter carregada via Google Fonts — requer conexão na primeira execução. Fallback: Segoe UI.

---

## Git

Branch principal: `main`
Nunca comitar: `.env`, `node_modules/`, builds, logs privados.
