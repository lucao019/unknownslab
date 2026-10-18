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
```

---

## Módulos disponíveis

| Módulo | Estado | Descrição |
|---|---|---|
| PUBG Stats Overlay | ✅ Implementado | Exibe stats do dia via servidor local |
| Keyboard Visualizer | 🔜 Fase 2 | Teclas pressionadas em tempo real |
| Mouse Visualizer | 🔜 Fase 2 | Cliques e scroll do mouse |
| Keystroke History | 🔜 Fase 3 | Histórico de inputs em faixa |
| WASD / Strafe Trainer | 🔜 Fase 4 | Exercícios de movimentação |
| Session Recorder | 🔜 Fase 5 | Gravação de sessões de input |
| Event Timeline | 🔜 Fase 5 | Linha do tempo de inputs |
| OBS Integration | 🔜 Fase 6 | Controle de Browser Sources no OBS |
| Tutorial Mode | 🔜 Fase 6 | Layout para gravação de tutoriais |

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
