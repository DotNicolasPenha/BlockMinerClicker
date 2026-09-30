# Block Miner Clicker

Um jogo idle clicker inspirado em mineração, com estética pixel art retro. Quebre blocos, colete recursos, compre upgrades e suba de patente para desbloquear mineradores automáticos e itens raros.

## Como jogar

- **Clique no bloco** para quebrá-lo e ganhar recursos
- **Combo**: clique rapidamente para acumular combo e causar mais dano
- **Loja**: compre picaretas mais fortes, encantamentos e mineradores automáticos
- **Patente**: reconstrua o mundo para ganhar diamantes permanentes e bônus de progressão
- **Coleção**: encontre itens raros enquanto minera

## Funcionalidades

- 30 tipos de blocos com texturas únicas (Grama → Bloco Eterno)
- 10 picaretas colecionáveis
- 8 encantamentos (crítico, combo, fragmentação, etc.)
- 8 mineradores automáticos (idle)
- 8 patentes com 5 subníveis cada (Bronze → Lendário)
- 30 itens colecionáveis em 6 raridades
- Sistema de combo com barra visual
- Efeitos visuais: partículas, screen shake, textos flutuantes
- Áudio procedural (Web Audio API)
- Auto-save no navegador (localStorage)

## Layout

- **Mobile** (< 768px): tela cheia com painéis em sheet bottom
- **Tablet** (768-1023px): canvas ampliado
- **Desktop** (≥ 1024px): sidebar à direita com abas para loja/patente/coleção

## PWA (instalável e offline)

O jogo é um Progressive Web App: abra o site no Chrome/Edge/Safari e use
"Adicionar à tela inicial" para instalá-lo como aplicativo, com ícone próprio e
funcionamento offline (service worker cacheia a página, ícones e fontes).

Arquivos:

- `manifest.json` — nome, ícones, orientação e modo de exibição
- `sw.js` — service worker (cache offline + atualização em `VERSION`)
- `icons/` — ícones 16/32/64/192/512 + apple-touch + maskable

Para atualizar o cache após mudanças, incremente `VERSION` em `sw.js`
(ou deixe o `npm run release` fazer isso). Requer HTTPS ou `localhost`
(o service worker não roda em `file://`).

## Rotina de alterações

Sem dependências externas — só Node.js:

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor local em `http://127.0.0.1:5173` com auto-reload; limpa service worker e caches a cada mudança (use `?keepsw` para testar o offline) |
| `npm run validate` | Valida `manifest.json`, ícones, referências do HTML e o `PRECACHE` do `sw.js` |
| `npm run release -- minor` | Valida, incrementa a versão, atualiza `VERSION` no `sw.js`, escreve o `CHANGELOG.md`, faz commit e tag |
| `npm run release -- --dry-run` | Mostra o que o release faria, sem alterar nada |

Fluxo git:

1. Altere o código (uma coisa por commit)
2. Prefixe a mensagem: `feat:`, `fix:`, `chore:`, `docs:`
3. `npm run validate` antes de commitar
4. `npm run release -- patch|minor|major` quando for publicar — ele gera
   `release: vX.Y.Z` + tag `vX.Y.Z` + seção no changelog
5. `git push && git push --tags`

## Tecnologias

HTML + CSS + JavaScript puro (sem dependências). Renderização em canvas 2D com pixel art.

## Licença

MIT
