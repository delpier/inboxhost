# InboxHost v1.0 — Release Checklist

## 1. Configuração do projecto

- [ ] `app.json` — confirmar `version: "1.0.0"` e `versionCode: 1`
- [ ] `app.json` — substituir `SUBSTITUI-PELO-TEU-PROJECT-ID` pelo ID do EAS
- [ ] `constants/config.ts` — confirmar `FREE_CALENDAR_LIMIT = 3`
- [ ] `.env` — não tem segredos por agora (adicionar quando integrar AdMob/IAP)

## 2. Obter o EAS Project ID

```powershell
npm install -g eas-cli
eas login
eas build:configure   # gera o projectId automaticamente
```

Copia o `projectId` gerado para o `app.json` → `extra.eas.projectId`.

## 3. Build de teste (APK)

```powershell
# Instala no telemóvel directamente sem Play Store
eas build --platform android --profile preview
```

Testa no telemóvel antes de submeter à Play Store.

## 4. Build de produção (AAB)

```powershell
eas build --platform android --profile production
```

## 5. Ficha da Play Store (obrigatório antes de publicar)

- [ ] **Ícone** — 512×512 PNG (usa o `icon.png` gerado, redimensiona)
- [ ] **Feature Graphic** — 1024×500 PNG
- [ ] **Screenshots** — mínimo 2, recomendado 4-6
- [ ] **Título** — "InboxHost - Gestão de Reservas"
- [ ] **Descrição curta** — até 80 caracteres
- [ ] **Descrição longa** — até 4000 caracteres (ver template abaixo)
- [ ] **Categoria** — Business
- [ ] **Política de privacidade** — URL obrigatória (ver secção abaixo)
- [ ] **Email de suporte** — obrigatório

## 6. Template de descrição longa

```
InboxHost centraliza todas as tuas reservas do Airbnb, Booking.com e VRBO
num único lugar, sem necessidade de conta ou login.

✅ FUNCIONALIDADES PRINCIPAIS
• Importa calendários iCal do Airbnb, Booking.com e VRBO
• Vê todas as reservas num único ecrã
• Envia e recebe mensagens por reserva
• Funciona offline — os dados ficam no teu dispositivo
• Filtra por reservas futuras, passadas ou todas
• Suporte a Português e Inglês

⭐ INBOXHOST PRO
• Sem publicidade
• Calendários ilimitados
• Notificações de check-in (em breve)
• Sincronização automática (em breve)

Pagamento único de 2,99€ — sem subscrições.
```

## 7. Política de privacidade (obrigatória)

Cria uma página simples no GitHub Pages:

1. Cria repo `inboxhost-privacy` no GitHub
2. Activa GitHub Pages nas Settings
3. Adiciona um `index.html` com o texto da política
4. URL: `https://o-teu-username.github.io/inboxhost-privacy`

Texto mínimo da política:
- A app não recolhe dados pessoais
- Os dados ficam armazenados localmente no dispositivo
- Os calendários iCal são importados directamente das plataformas
- Não há contas de utilizador nem servidores próprios

## 8. Submeter à Play Store

```powershell
# Após download do AAB do EAS:
# Play Console → Produção → Criar versão → Upload AAB
# Ou usar EAS Submit (requer google-service-account.json):
eas submit --platform android
```

## 9. Verificação final antes de publicar

- [ ] Testado no telemóvel Android físico
- [ ] Testado offline (modo avião)
- [ ] Testado import de iCal Airbnb
- [ ] Testado compra Pro (modo teste)
- [ ] Sem erros na consola
- [ ] Ícone e splash screen correctos
- [ ] Versão e versionCode correctos
