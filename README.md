# QuestDay

Planner adaptativo e babá eletrônica para TDAH e autismo. Monta a semana sozinho no ritmo da sua energia, mostra uma coisa de cada vez e cuida do básico (água, remédios, comida, sono) sem culpa.

## O que tem

- **Agora / Semana / Cuidar / Minha Rotina / Progresso**: plano diário e semanal que se reajusta sozinho, ofensiva com dias protegidos, modo sobrevivência, férias e viagens.
- **Lume**: assistente que entende comandos em português e, com IA, mexe no app por você.
- **Conta e aparelhos**: login com e-mail/senha ou Google, dados sincronizados na nuvem, versões anteriores.
- **App instalável (PWA)**: ícone na tela inicial, funciona offline.
- **Lembretes com o app fechado**: notificações push 10 min antes de blocos e compromissos, e na hora dos remédios e refeições.
- **Google Agenda e .ics**: importa os compromissos dos próximos 14 dias da Google Agenda (OAuth, só leitura) ou de um arquivo .ics (Google, Outlook, Apple, portal da faculdade), com recorrências semanais.

## Estrutura

```
src/app.jsx        o app (React)
src/cloud.js       conta, sincronização, push, Lume pelo servidor, Google Agenda
src/shell.html     página base (CSS próprio, fontes, tags do PWA)
public/            service worker, manifest e ícones
scripts/build.mjs  gera dist/ (um index.html autocontido + arquivos do PWA)
supabase/          migrações do banco e funções do servidor (qd-lume, qd-push)
tests/             testes com Playwright
```

## Rodar

```bash
npm install
npm run build
npm run serve        # http://localhost:8000
npm test             # com o servidor acima rodando
```

Cada push na `main` publica no GitHub Pages pelo workflow `.github/workflows/pages.yml`.

## Servidor (Supabase)

Usa o mesmo projeto do Fluxo Previsto, com tabelas próprias (`qd_*`) e RLS: cada pessoa só lê e grava os próprios dados.

- `qd_data`: estado do app (uma linha por pessoa). `qd_backup`: versões anteriores.
- `qd_push_subs` e `qd_reminders`: aparelhos inscritos e lembretes agendados. O `pg_cron` chama `qd-push` a cada minuto quando há lembrete vencendo.
- `qd-lume`: traduz as mensagens do Lume para o Gemini, com a chave guardada no servidor (segredo `GEMINI_API_KEY`, o mesmo do Fluxo Previsto). Só a dona (`OWNER_ID`) e quem estiver em `qd_ai_access` pode usar.

### Configuração que só dá para fazer no painel

1. **Authentication → URL Configuration → Redirect URLs**: adicionar `https://jullross.github.io/questday/**`.
2. **Authentication → Providers → Google**: ligar com o Client ID e o Client Secret de um cliente OAuth do Google Cloud (tipo "Aplicativo da Web", URI de redirecionamento `https://ziycnzsjhnswwrpotasp.supabase.co/auth/v1/callback`).
3. **Google Agenda**: no Google Cloud, ativar a *Google Calendar API*; criar um cliente OAuth "Aplicativo da Web" com origens JavaScript `https://jullross.github.io` e `http://localhost:8000`; na tela de consentimento, adicionar o escopo `calendar.readonly` e o seu e-mail como usuário de teste. O Client ID vai em `GOOGLE_CLIENT_ID` (arquivo `.env` local, e em Settings → Secrets and variables → Actions → **Variables** no GitHub).
4. **Edge Functions → Secrets**: `GEMINI_API_KEY` (já existe, compartilhada com o Fluxo Previsto).
