# Unknowns Lab

Painel de ferramentas de live, overlay e análise de inputs para PUBG PC.

Desenvolvido por **lucao99999999999** para uso próprio durante transmissões e gravações de tutoriais.

---

## O que é

O Unknowns Lab começou como um overlay simples de estatísticas do PUBG para OBS. Virou um projeto maior: um **Control Center desktop** que centraliza e gerencia todas as ferramentas visuais e de análise usadas durante as lives.

A versão atual combina os overlays e atalhos da mira com o **PUBG Performance Lab**: diagnóstico local do PC, leitura de sensores em tempo real e análise comparativa de perfis NVIDIA. A ideia é medir e explicar mudanças com fontes identificadas, sem inventar ganhos nem aplicar ajustes de sistema silenciosamente.

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

A página **Enhancements** concentra ferramentas de diagnóstico e análise:

- **Diagnóstico local:** informações de CPU, memória, GPUs, monitores e armazenamento, com indicação da fonte e dos dados indisponíveis.
- **Monitor ao vivo:** amostras a cada dois segundos. No Windows, o LibreHardwareMonitor lê os sensores oferecidos pelo hardware; `nvidia-smi` complementa a telemetria NVIDIA, incluindo VRAM e rotação atual da ventoinha. Se a ponte não iniciar, o app informa o fallback para as APIs do Node.js e `nvidia-smi`.
- **Sensores sem leitura:** aparecem como indisponíveis, sem estimativas. Neste PC, a temperatura da CPU não foi disponibilizada como leitura válida.
- **Somente leitura:** o monitor não altera energia, driver nem velocidade da ventoinha. FPS e frametime ainda não têm um provedor validado e não são deduzidos da carga da GPU.
- **Perfis NVIDIA:** comparação local de um perfil `.nip`/XML escolhido pelo usuário. Exibe nome, executáveis e valores alterados, mas não aplica configurações nem verifica o perfil ativo no driver. Arquivos com múltiplos perfis são recusados para evitar comparações ambíguas.
- **NVIDIA Control Panel e NVIDIA Profile Inspector:** o primeiro é a ferramenta oficial da NVIDIA; o segundo é um utilitário de terceiros. Não são equivalentes, e os valores de um arquivo exportado não comprovam o estado atualmente aplicado.
- **Comparação antes/depois:** o tutorial orienta registrar condições e medições reais. Não há resultados de benchmark pré-carregados nem promessa de ganho de desempenho.

O helper usa o LibreHardwareMonitor 0.9.6, com licença MPL 2.0 em `control-center/vendor/LibreHardwareMonitor/v0.9.6/`. O build publica a ponte Windows x64 como executável self-contained e a inclui no app. A aplicação não instala serviço nem solicita elevação automática.

### O que vem pela frente

Esta é uma direção de trabalho, não uma promessa de prazo:

1. **Validar fontes para FPS e frametime:** integrar um provedor confiável, se compatível, e exibir claramente limitações e dados ausentes.
2. **Ampliar a análise de desempenho:** guardar medições antes/depois com fonte, horário e condições para comparar resultados reais.
3. **Implementar análise de inputs:** histórico, gravação de sessão, intervalos e linha do tempo só serão ativados depois de implementados, revisados quanto à privacidade e testados.
4. **Evoluir a integração de streaming e treino:** conexão com OBS e exercícios de movimento permanecem planejados, não são recursos funcionais nesta versão.

Controle de ventoinhas não faz parte do monitor: leituras continuam somente observação e nenhum comando de velocidade é enviado.

### Recursos disponíveis e planejados

| Recurso | Estado |
|---|---|
| PUBG Stats Overlay para OBS | Implementado; usa o servidor local de stats |
| Visualizadores de teclado e mouse | Implementados |
| Crosshair configurável, binds e prévia arrastável | Implementado |
| Ajuste e persistência da escala dos overlays de teclado e mouse | Implementado |
| Tema Cyberpunk Purple, navegação independente e sons opcionais de interface | Implementado |
| Diagnóstico e sensores de hardware ao vivo | Implementados; dependem dos sensores disponíveis no PC |
| Comparação de arquivos NVIDIA `.nip`/XML | Implementada; leitura/comparação, sem aplicação |
| Medição de FPS/frametime | Planejada; provedor ainda não validado |
| Keystroke History e Session Recorder | Planejados; indisponíveis até implementação e validação |
| Event Timeline e Input Intervals | Planejados; dependem da gravação de sessão |
| Treinadores WASD/strafe e integração OBS | Planejados; ainda não implementados |

Os itens planejados não devem ser interpretados como recursos já disponíveis no app.

---

## Instalação e uso

### Pré-requisitos

- Node.js 18 ou superior
- .NET 10 SDK apenas para compilar o Control Center e a ponte de sensores
- Windows x64 para usar e empacotar o Control Center e os sensores LibreHardwareMonitor
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
npm ci
npm start
```

O app distribuído inclui a ponte de sensores; o .NET SDK não é necessário para apenas executar uma versão já compilada. O executável descompactado validado está em `H:\Unknowns-Lab-Build\win-unpacked\Unknowns Lab.exe`.

Em **Settings**, a opção **UI Sounds** ativa ou desativa o som curto ao trocar de página; a preferência fica salva localmente. A escala dos overlays de teclado e mouse também é preservada entre execuções.

### Build do executável

```bash
cd control-center
npm run build
```

O script publica primeiro o helper com `dotnet publish` e depois gera o instalador e a versão portátil em `H:\Unknowns-Lab-Build\`. O build Windows x64 mais recente foi concluído com sucesso.

Para substituir atalhos antigos do Unknowns Lab na Área de Trabalho e criar um único atalho para a versão portátil, execute na raiz do repositório:

```powershell
.\create-shortcut.ps1
```

Se existir um atalho antigo na Área de Trabalho pública, o Windows pode solicitar permissão de administrador para removê-lo.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Servidor de stats | Node.js + Express |
| Overlay OBS | HTML + CSS + JS puro |
| Control Center | Electron 45 |
| UI | CSS custom (sem framework) |
| Renderização da crosshair | Canvas 2D em janela Electron transparente |
| Comunicação UI/overlays | `contextBridge` + IPC do Electron |
| Captura do botão direito | `uiohook-napi` |
| Sensores ao vivo | LibreHardwareMonitor 0.9.6 e `nvidia-smi` (somente leitura) |
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
- **Apoio de desenvolvimento.** Algumas etapas foram realizadas com apoio do FCC (Free Claude Code); as mudanças foram aplicadas e verificadas nesta base de código.

---

## Limitações conhecidas

- O servidor de stats depende da PUBG API oficial — sujeito a rate limit e disponibilidade externa.
- O Control Center não inicia o servidor automaticamente nesta versão — ambos precisam ser iniciados separadamente.
- FPS/frametime e temperatura da CPU não têm uma fonte válida disponível nesta máquina. O monitor mostra indisponibilidade em vez de estimar valores.
- A auditoria npm do Control Center ainda reporta vulnerabilidades moderadas transitivas na cadeia de build (`electron-builder` e dependências). O projeto raiz não reporta vulnerabilidades na última verificação.
- Executáveis gerados sem certificado de código assinado ativam o SmartScreen no Windows. Solução: clique direito → Propriedades → Desbloquear, ou `Unblock-File` via PowerShell.
- Fonte Inter carregada via Google Fonts — requer conexão na primeira execução. Fallback: Segoe UI.

---

## Git

Branch principal: `main`
Nunca comitar: `.env`, `node_modules/`, builds, logs privados.
