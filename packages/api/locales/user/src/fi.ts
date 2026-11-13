import type { UserTranslations } from './types.js'

/** User translations for Finnish. */
export const fi: UserTranslations = {
  'user.error.badRequest': 'Virheellinen pyyntö.',
  'user.error.notFound': 'Ei löytynyt.',
  'user.error.failedToCreateSession': 'Istunnon luonti epäonnistui.',
  'user.error.usernameRequired': 'Käyttäjänimi vaaditaan.',
  'user.error.passwordRequired': 'Salasana vaaditaan.',
  'user.error.emailInvalid': 'Sähköposti on virheellinen.',
  'user.error.usernameUnavailable': 'Käyttäjänimi ei ole saatavilla.',
  'user.error.emailAlreadyRegistered': 'Sähköposti on jo rekisteröity.',
  'user.error.failedToHashPassword': 'Salasanan tiivistäminen epäonnistui.',
  'user.error.invalidCredentials': 'Virheelliset tunnistetiedot.',
  'user.error.invalidTwoFactorToken': 'Virheellinen kaksivaiheinen tunniste.',
  'user.error.twoFactorVerificationUnavailable': 'Kaksivaiheinen vahvistus ei ole käytettävissä.',
  'user.error.loginFailed': 'Kirjautuminen epäonnistui.',
  'user.notification.newLogin': 'Uusi Kirjautuminen',
  'user.notification.newLoginBody': 'Uusi kirjautuminen laitteesta {{deviceName}}.',
  'user.error.usernameCannotBeEmpty': 'Käyttäjänimi ei voi olla tyhjä.',
  'user.error.usernameInvalid':
    'Käyttäjänimessä saa olla vain kirjaimia, numeroita, pisteitä, yhdysmerkkejä ja alaviivoja.',
  'user.error.bodyNestedUnderUser':
    'Tämä runko sijoittaa kenttänsä kohteen "user" alle; lähetä käyttäjänimi, sähköposti ja salasana ylimmällä tasolla.',
  'user.error.failedToUpdateUser': 'Käyttäjän päivitys epäonnistui.',
  'user.error.failedToDeleteUser': 'Käyttäjän poisto epäonnistui.',
  'user.error.failedToReadUser': 'Käyttäjän lukeminen epäonnistui.',
  'user.error.emailRequired': 'Sähköposti vaaditaan.',
  'user.email.passwordResetSubject': '{{appName}} - Salasanan Nollaus',
  'user.email.passwordResetText': 'Salasanan nollaustunnisteesi on: {{token}}',
  'user.email.passwordResetLink': 'Nollaa salasanasi osoitteessa: {{url}}',
  'user.email.passwordResetHtml':
    '<p>Salasanan nollaustunnisteesi on: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">Nollaa salasanasi</a></p>',
  'user.error.failedToProcessPasswordReset': 'Salasanan nollauksen käsittely epäonnistui.',
  'user.error.newPasswordRequired': 'Uusi salasana vaaditaan.',
  'user.error.currentPasswordRequired': 'Nykyinen salasana vaaditaan.',
  'user.error.currentPasswordIncorrect': 'Nykyinen salasana on väärä.',
  'user.error.failedToUpdatePassword': 'Salasanan päivitys epäonnistui.',
  'user.error.planKeyRequired': 'planKey vaaditaan.',
  'user.error.invalidPlan': 'Virheellinen paketti.',
  'user.error.failedToUpdateSubscription': 'Tilauksen päivitys epäonnistui.',
  'user.error.failedToUpdatePlan': 'Paketin päivitys epäonnistui.',
  'user.error.twoFactorNotAvailable': 'Kaksivaiheinen todennus ei ole käytettävissä.',
  'user.error.twoFactorRequiresPassword':
    'Kaksivaiheinen todennus on käytössä tällä tilillä. Jatka kirjautumalla sisään sähköpostillasi ja salasanallasi.',
  'user.error.tokenRequired': 'Tunniste vaaditaan.',
  'user.error.noPendingTwoFactorSetup':
    'Ei odottavaa kaksivaiheista asetusta. Kutsu ensin toiminnolla "setup".',
  'user.error.invalidToken': 'Virheellinen tunniste.',
  'user.error.twoFactorRequired': 'Kaksivaiheinen koodi vaaditaan.',
  'user.error.twoFactorNotEnabled': 'Kaksivaiheinen todennus ei ole käytössä.',
  'user.error.invalidAction': 'Virheellinen toiminto. Käytä "setup", "enable" tai "disable".',
  'user.error.twoFactorOperationFailed': 'Kaksivaiheisen todennuksen toiminto epäonnistui.',
  'user.error.oauthServerNotConfigured': 'OAuth-palvelin "{{server}}" ei ole määritetty.',
  'user.error.oauthVerificationFailed': 'OAuth-vahvistus epäonnistui.',
  'user.error.failedToCreateUser': 'Käyttäjän luonti epäonnistui.',
  'user.error.oauthLoginFailed': 'OAuth-kirjautuminen epäonnistui.',
  'user.error.unauthorized': 'Luvaton',
  'user.error.passwordTooLong': 'Salasanan enimmäispituus on {{max}} merkkiä',
  'user.error.passwordTooShort': 'Salasanan on oltava vähintään {{min}} merkkiä pitkä',
  'user.error.tooManyRequests': 'Liikaa yrityksiä. Odota ja yritä uudelleen.',
  'user.error.webhookUnauthorized': 'Ilmoitus luvattomasta maksusta',
  'user.error.credentialsNested':
    'Tämä kirjautumispäätepiste lukee tunnistetiedot ylimmältä tasolta, mutta tämä runko sijoittaa ne {{envelope}} elementin alle. Aseta loginEndpoint reitille, joka purkaa tämän kirjekuoren paketin, tai käytä createRequestHandler-funktiota mapRequest-kyselyn kanssa purkaaksesi req.body[ {{envelope}}]-elementin ennen handlers.logIn-funktiota.',
  'user.error.oauthStateMismatch': 'OAuth-tila ei täsmää – mahdollinen CSRF-hyökkäys',
  'user.error.avatarTooLarge': 'Avatarin pituus saa olla enintään {{max}} merkkiä.',
  'user.error.bioTooLong': 'Esittelytekstissä saa olla enintään {{max}} merkkiä.',
  'user.error.noUpdatableFields': 'Päivitettäviä kenttiä ei annettu.',
  'user.error.oauthDataInvalid': 'oauthDatan on oltava objekti.',
  'user.error.subscriptionActivationRequiresVerification':
    'Tilauksen aktivointi edellyttää kuitin vahvistusta — käytä POST /users /:id/verify-payment/:provider -komentoa.',
  'user.payment.noBillingAccount': 'Tälle käyttäjälle ei löytynyt {{provider}} -laskutustiliä.',
  'user.payment.portalFailed': '{{provider}} -laskutusportaalin avaaminen epäonnistui.',
  'user.payment.portalNotSupported': '{{provider}} ei tarjoa laskutusportaalia.',
  'user.payment.subscriptionOwnershipMismatch': 'Tämä tilaus ei kuulu tilillesi.',
  'user.payment.transactionAlreadyClaimed': 'Tämä ostos on jo liitetty toiseen tiliin.',
  'user.error.completeTargetMissing': 'Annetulla tunnuksella completeId ei ole tiliä.',
  'user.error.completeIdentityMismatch':
    'Annettu käyttäjätunnus tai sähköpostiosoite ei yksilöi completeId-tiliä.',
  'user.error.completeNotOwned':
    'CompleteId-tili kirjautuu sisään OAuthin kautta; sen tunnistetietoja ei valmistella tässä.',
  'user.error.identityRequired':
    'Käyttöönotto vaatii käyttäjätunnuksen tai sähköpostiosoitteen tilin tunnistamiseksi.',
  'user.error.usernameEmailConflict':
    'Käyttäjätunnus ja sähköpostiosoite kuuluvat kahdelle eri olemassa olevalle tilille.',
  'user.error.oauthEmailCollision':
    'Tälle sähköpostiosoitteelle on jo tili. Kirjaudu sisään alkuperäisellä menetelmälläsi ja linkitä sitten tämä palveluntarjoaja tilisi asetuksista.',
}
