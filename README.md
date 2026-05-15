# dr-decoracoes-app

## Rodar localmente (offline)

### Frontend (Expo)
1. Crie `frontend/.env` a partir de `frontend/.env.example`:
   - `EXPO_PUBLIC_BACKUP_URL` deve apontar para o Web App do Google Apps Script quando o backup estiver configurado
2. Instale dependências:
   ```bash
   cd frontend
   yarn install
   ```
3. Inicie o app:
   ```bash
   npx expo start -c
   ```
4. App funciona totalmente offline com SQLite local

## Backup no Google Sheets (Apps Script)
1. Abra a planilha de backup e crie um Apps Script.
2. Cole o conteúdo de `docs/google-apps-script-backup.gs`.
3. Publique como Web App (acesso: qualquer pessoa com o link).
4. Cole a URL do Web App em `frontend/.env`:
   - `EXPO_PUBLIC_BACKUP_URL=https://script.google.com/.../exec`

## Backend (opcional)
1. Crie `backend/.env` a partir de `backend/.env.example`.
2. Ajuste:
   - `MONGO_URL`
   - `DB_NAME`
   - `API_KEY` para proteger a API fora do ambiente local
3. Instale dependências:
   ```bash
   cd backend
   python -m pip install -r requirements.txt
   ```
4. Execute:
   ```bash
   python server.py
   ```

## Qualidade
- Frontend:
  ```bash
  cd frontend
  npm run lint
  ```
- Backend:
  ```bash
  python -m pytest
  ```

## Gerar APK para instalar no celular
1. Entre em `frontend` e autentique no Expo/EAS:
   ```bash
   cd frontend
   npx eas login
   ```
2. Gere um APK instalavel:
   ```bash
   yarn build:android:apk
   ```
3. Ao final, o EAS vai retornar um link para download do `.apk`.
4. Envie esse link ou o arquivo APK para o celular da pessoa que vai instalar.

Observacao:
- O perfil `preview` gera APK instalavel direto no Android.
- O perfil `production` fica reservado para build de loja (`.aab`).

## Convenções do repositório
- O frontend usa `yarn` como gerenciador principal.
- Arquivos sensíveis e caches locais (`frontend/.env`, `.metro-cache`, `.expo`) não devem ser versionados.
