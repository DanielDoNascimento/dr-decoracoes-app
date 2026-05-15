# DR Decoracoes App

Aplicativo mobile em Expo/React Native para gestao de produtos, eventos e financeiro, com armazenamento local em SQLite e backup opcional no Google Sheets.

## Requisitos

- Node.js 18+
- Yarn 1.x
- App `Expo Go` instalado no celular

## Instalar dependencias

```bash
cd frontend
yarn install
```

## Configurar ambiente

Crie `frontend/.env` a partir de `frontend/.env.example`.

Variaveis principais:

- `EXPO_PUBLIC_BACKUP_URL`: URL do Web App do Google Apps Script para backup
- `EXPO_USE_FAST_RESOLVER=1`: mantem o resolver rapido do Expo

## Rodar no celular

```bash
cd frontend
npx expo start -c
```

No terminal do Expo:

1. Pressione `s` para garantir `Using Expo Go`
2. Escaneie o QR code com o `Expo Go`

Se aparecer `Using development build`, voce esta abrindo outro app instalado no celular. Nesse caso, volte para `Expo Go` pressionando `s`.

## Backup automatico

O app funciona sem internet usando SQLite local. O backup e opcional.

Para ativar:

1. Publique o script de [`docs/google-apps-script-backup.gs`](../docs/google-apps-script-backup.gs) como Web App
2. Copie a URL para `frontend/.env` em `EXPO_PUBLIC_BACKUP_URL`
3. Reinicie o Expo com `npx expo start -c`

Quando configurado, o app tenta sincronizar automaticamente:

- ao abrir o app
- ao voltar para primeiro plano
- quando a internet retorna

## Qualidade

```bash
cd frontend
yarn lint
```

## Gerar APK para compartilhar

Para instalar o app como aplicativo normal no Android, sem `Expo Go`:

```bash
cd frontend
npx eas login
yarn build:android:apk
```

O comando usa o perfil `preview` do [`eas.json`](./eas.json), que gera um APK instalavel.

Depois do build:

1. abra o link retornado pelo EAS
2. baixe o `.apk`
3. envie o arquivo para o celular da pessoa ou compartilhe o link do build

Se quiser preparar versao para Google Play depois, use:

```bash
cd frontend
yarn build:android:store
```
