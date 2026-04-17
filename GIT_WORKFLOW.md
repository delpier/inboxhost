# Git Workflow — InboxHost

## Branch Strategy

```
main          ← produção (só recebe PRs de release/*)
develop       ← integração contínua
feature/xxx   ← novas funcionalidades
fix/xxx       ← correcções de bugs
release/x.x   ← preparação de release
```

## Fluxo do dia-a-dia

### 1. Começar uma nova funcionalidade
```bash
git checkout develop
git pull origin develop
git checkout -b feature/nome-da-feature
```

### 2. Trabalhar e guardar progresso
```bash
git add .
git commit -m "feat: descrição clara do que foi feito"
git push origin feature/nome-da-feature
```

### 3. Quando a feature está pronta — Pull Request
- Vai ao GitHub → New Pull Request
- Base: `develop` ← Compare: `feature/nome-da-feature`
- Descreve o que foi feito e testa localmente antes

### 4. Preparar uma release
```bash
git checkout develop
git checkout -b release/1.1
# Ajusta versão em app.json e package.json
git commit -m "chore: bump version to 1.1"
git checkout main
git merge release/1.1
git tag v1.1
git push origin main --tags
```

### 5. Corrigir um bug em produção
```bash
git checkout main
git checkout -b fix/descricao-do-bug
# Corrige o bug
git commit -m "fix: descrição do bug corrigido"
# PR para main E para develop
```

## Convenção de commits

| Prefixo   | Quando usar                              |
|-----------|------------------------------------------|
| `feat:`   | Nova funcionalidade                      |
| `fix:`    | Correcção de bug                         |
| `chore:`  | Manutenção (deps, configs, versões)      |
| `docs:`   | Documentação                             |
| `style:`  | Formatação, sem alteração de lógica      |
| `refactor:` | Refactoring sem nova feature ou fix    |
| `test:`   | Adição ou alteração de testes            |

## Proteger o branch main

No GitHub → Settings → Branches → Add rule:
- Branch name: `main`
- ✅ Require a pull request before merging
- ✅ Require at least 1 approval

## Segredos e variáveis de ambiente

- Copia `.env.example` para `.env` e preenche os valores
- **Nunca** faças commit do `.env`
- Para o EAS Build, usa: `eas secret:create --scope project --name NOME --value VALOR`
