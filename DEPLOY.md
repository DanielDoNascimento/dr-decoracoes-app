# Guia de Deploy — D&R Decorações

Tudo gratuito. Tempo estimado: 30–40 minutos.

---

## Visão geral

```
APK (celular)  →  Render (backend)  →  MongoDB Atlas (banco)
```

---

## Parte 1 — MongoDB Atlas (banco de dados grátis)

### 1.1 Criar conta
1. Acesse **https://www.mongodb.com/atlas**
2. Clique em **"Try Free"**
3. Preencha nome, e-mail e senha → **"Create your Atlas account"**
4. Confirme o e-mail que chegou na sua caixa

### 1.2 Criar cluster gratuito
1. Após o login, vai aparecer uma tela de "Deploy your cluster"
2. Escolha **M0 (Free)** — já deve vir selecionado
3. Provider: **AWS** | Region: **São Paulo (sa-east-1)** se disponível, ou qualquer um
4. Cluster Name: `dr-decoracoes` (ou qualquer nome)
5. Clique **"Create Deployment"**
6. Aguarde ~2 minutos enquanto o cluster é criado

### 1.3 Criar usuário do banco
1. Na tela que aparece, em **"Username"** coloque: `dr_admin`
2. Clique **"Autogenerate Secure Password"** → **copie e guarde essa senha**
3. Clique **"Create Database User"**

### 1.4 Liberar acesso de rede
1. Clique em **"Choose a connection method"** → depois **"Network Access"** no menu esquerdo
2. Clique **"Add IP Address"**
3. Clique **"Allow Access From Anywhere"** → **Confirm**
   > Isso é necessário para o Render conseguir conectar.

### 1.5 Pegar a connection string
1. No menu esquerdo, clique em **"Database"** → depois no botão **"Connect"** do seu cluster
2. Escolha **"Drivers"**
3. Driver: **Python** | Version: **3.12 or later**
4. Copie a string que aparece, parecida com:
   ```
   mongodb+srv://dr_admin:<password>@dr-decoracoes.xxxxx.mongodb.net/
   ```
5. Substitua `<password>` pela senha que você copiou no passo 1.3
6. **Guarde essa string** — você vai usar na Parte 2

---

## Parte 2 — Render (servidor backend grátis)

### 2.1 Criar conta
1. Acesse **https://render.com**
2. Clique **"Get Started for Free"**
3. Recomendo entrar com **GitHub** (mais fácil) — clique em **"GitHub"**
4. Autorize o Render a acessar sua conta

### 2.2 Conectar o repositório
1. No dashboard do Render, clique **"New +"** → **"Web Service"**
2. Em "Source Code", clique **"Connect account"** se necessário
3. Encontre o repositório `dr-decoracoes-app` e clique **"Connect"**

### 2.3 Configurar o serviço
Preencha os campos assim:

| Campo | Valor |
|---|---|
| Name | `dr-decoracoes-api` |
| Region | Oregon (US West) — ou qualquer um |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | **Docker** |
| Instance Type | **Free** |

> Se não aparecer a opção Docker automaticamente, aguarde o Render detectar o `Dockerfile` na pasta `backend/`.

### 2.4 Adicionar variáveis de ambiente
Ainda na mesma tela, role até **"Environment Variables"** e adicione:

| Key | Value |
|---|---|
| `MONGO_URL` | a string do Atlas que você copiou no passo 1.5 |
| `DB_NAME` | `dr_decoracoes` |
| `API_KEY` | invente uma senha forte, ex: `DrDecoracoes2025@#!` |
| `CORS_ORIGINS` | deixe vazio por enquanto |

### 2.5 Criar o serviço
1. Clique **"Deploy Web Service"**
2. Aguarde o build (~3–5 minutos). Você vai ver logs rolando.
3. Quando aparecer **"Your service is live"** ou `==> Build successful`, está pronto.
4. **Copie a URL** que aparece no topo — parecida com:
   ```
   https://dr-decoracoes-api.onrender.com
   ```

### 2.6 Testar o backend
Abra no navegador:
```
https://dr-decoracoes-api.onrender.com/api/health
```
Deve aparecer:
```json
{"status": "ok", "service": "D&R Decorações API"}
```

> ⚠️ **Atenção:** O Render gratuito "dorme" após 15 minutos sem uso.
> A primeira requisição depois de inativo demora ~30 segundos.
> Isso é normal no plano free.

---

## Parte 3 — Configurar o APK para produção

### 3.1 Atualizar o arquivo .env
Abra o arquivo `frontend/.env` e preencha com os valores reais:

```env
EXPO_USE_FAST_RESOLVER=1
EXPO_PUBLIC_API_URL=https://dr-decoracoes-api.onrender.com
EXPO_PUBLIC_API_KEY=DrDecoracoes2025@#!
EXPO_PUBLIC_BACKUP_URL=https://script.google.com/...
```

> Substitua a URL do Render e a API_KEY pelos valores que você definiu.
> O `EXPO_PUBLIC_API_KEY` precisa ser **exatamente igual** ao `API_KEY` que você colocou no Render.

### 3.2 Buildar o APK
No terminal, dentro da pasta `frontend/`:

```bash
cd frontend
yarn build:android:apk
```

Isso vai:
1. Enviar o código para os servidores da Expo (EAS)
2. Buildar o APK com as variáveis de produção embutidas
3. Gerar um link para download do `.apk`

> Você precisa estar logado no EAS: `npx eas login`
> Se nunca usou, crie conta em https://expo.dev (grátis)

### 3.3 Instalar nos celulares
1. Baixe o `.apk` pelo link gerado
2. Envie o arquivo para os celulares (WhatsApp, Google Drive, etc.)
3. Nos celulares: **Configurações → Segurança → Instalar apps desconhecidos → Permitir**
4. Toque no arquivo `.apk` para instalar

---

## Resumo das senhas/URLs para guardar

| Item | Valor |
|---|---|
| MongoDB usuário | `dr_admin` |
| MongoDB senha | *(a que você gerou)* |
| MONGO_URL | `mongodb+srv://dr_admin:SENHA@...` |
| API_KEY (backend) | *(a que você inventou)* |
| URL do backend | `https://dr-decoracoes-api.onrender.com` |

---

## Problemas comuns

**App abre mas não carrega dados**
→ O backend está dormindo. Aguarde 30 segundos e tente novamente.

**Erro "Acesso não autorizado"**
→ O `EXPO_PUBLIC_API_KEY` no `.env` está diferente do `API_KEY` no Render.

**Build falhou no Render**
→ Verifique se o campo "Root Directory" está como `backend` e o Runtime como `Docker`.

**APK não instala no celular**
→ Ative "Fontes desconhecidas" nas configurações de segurança do Android.
