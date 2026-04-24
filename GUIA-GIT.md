# Guia Git — Como trabalhar sem conflitos

## Divisão de responsabilidades

| Aluno | Arquivo | O que mexer |
|-------|---------|-------------|
| Aluno A | `index.html` | Estrutura das telas, modais, formulários |
| Aluno B | `style.css` | Cores, layout, fontes, visual |
| Aluno C | `script.js` | Login, calendário, reservas, admin |

> Cada aluno mexe APENAS no seu arquivo. Assim o Git nunca gera conflito.

---

## PASSO A PASSO COMPLETO

### 1. Instalar o Git (só na primeira vez)
Baixe e instale em: https://git-scm.com/downloads

---

### 2. Configurar seu nome no Git (só na primeira vez)
Abra o terminal e digite:
```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
```

---

### 3. Clonar o repositório (só na primeira vez)
```bash
git clone https://github.com/daraisadora03-dotcom/tcc-reserva-de-computadores-
cd tcc-reserva-de-computadores-
```

---

### 4. Criar sua branch (só na primeira vez)
Cada aluno cria UMA branch com seu nome:

**Aluno A:**
```bash
git checkout -b feature/html
```

**Aluno B:**
```bash
git checkout -b feature/css
```

**Aluno C:**
```bash
git checkout -b feature/javascript
```

---

### 5. Editar seu arquivo
Abra o seu arquivo no editor (VS Code, Notepad++, etc) e faça as alterações.

---

### 6. Salvar e enviar para o GitHub
Depois de fazer suas alterações, rode os comandos abaixo:

```bash
# Ver o que foi alterado
git status

# Adicionar SEU arquivo (substitua pelo nome do seu arquivo)
git add index.html
# ou
git add style.css
# ou
git add script.js

# Criar o commit com uma descrição do que você fez
git commit -m "descrição do que você alterou"

# Enviar para o GitHub
git push origin feature/html
# (substitua feature/html pelo nome da sua branch)
```

---

### 7. Abrir Pull Request no GitHub
1. Acesse o repositório no GitHub
2. Clique em **"Compare & pull request"** (aparece automaticamente após o push)
3. Escreva uma descrição do que você fez
4. Clique em **"Create pull request"**
5. Aguarde a aprovação

---

### 8. Atualizar sua branch antes de continuar trabalhando
Sempre antes de começar a trabalhar, pegue as atualizações mais recentes da main:

```bash
git checkout main
git pull origin main
git checkout feature/html  # volte para sua branch
git merge main             # traz as atualizações para sua branch
```

---

## Resumo rápido (uso diário)

```bash
# 1. Ir para sua branch
git checkout feature/html

# 2. Fazer suas alterações no arquivo...

# 3. Salvar no Git
git add nome-do-arquivo
git commit -m "o que você fez"
git push origin feature/html
```

---

## Dúvidas frequentes

**Errei a branch, como voltar?**
```bash
git checkout main
```

**Quero ver em qual branch estou?**
```bash
git branch
```

**Quero ver o histórico de commits?**
```bash
git log --oneline
```
