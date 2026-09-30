# Changelog

Todas as alterações notáveis deste projeto são documentadas aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento semântico.

## [1.0.0] - 2026-09-30

### Adicionado

- PWA instalável: `manifest.json`, ícones pixel art (16–512 + maskable + apple-touch) e `sw.js` com cache offline
- Banner "INSTALAR" no jogo usando `beforeinstallprompt`, com instrução manual no iOS e lembrete de não incomodar depois de fechar
- Barra de rolagem customizada (setinhas + thumb arrastável) nas listas das sheets e correção das listas cortadas no desktop
- Dev server com livereload e bypass automático do service worker (`npm run dev`)
- Validação de manifest, ícones, HTML e precache (`npm run validate`)
- Script de release com bump de versão, changelog, commit e tag (`npm run release`)
