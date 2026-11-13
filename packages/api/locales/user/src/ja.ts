import type { UserTranslations } from './types.js'

/** User translations for Japanese. */
export const ja: UserTranslations = {
  'user.error.badRequest': '不正なリクエストです。',
  'user.error.notFound': '見つかりません。',
  'user.error.failedToCreateSession': 'セッションの作成に失敗しました。',
  'user.error.usernameRequired': 'ユーザー名は必須です。',
  'user.error.passwordRequired': 'パスワードは必須です。',
  'user.error.emailInvalid': 'メールアドレスが無効です。',
  'user.error.usernameUnavailable': 'このユーザー名は使用できません。',
  'user.error.emailAlreadyRegistered': 'このメールアドレスはすでに登録されています。',
  'user.error.failedToHashPassword': 'パスワードのハッシュ化に失敗しました。',
  'user.error.invalidCredentials': '資格情報が無効です。',
  'user.error.invalidTwoFactorToken': '二要素認証トークンが無効です。',
  'user.error.twoFactorVerificationUnavailable': '二要素認証が利用できません。',
  'user.error.loginFailed': 'ログインに失敗しました。',
  'user.notification.newLogin': '新しいログイン',
  'user.notification.newLoginBody': '{{deviceName}}から新しいログインがありました。',
  'user.error.usernameCannotBeEmpty': 'ユーザー名を空にすることはできません。',
  'user.error.usernameInvalid':
    'ユーザー名に使えるのは英字、数字、ピリオド、ハイフン、アンダースコアのみです。',
  'user.error.bodyNestedUnderUser':
    'このボディはフィールドを "user" の下に入れています。ユーザー名、メールアドレス、パスワードは最上位に置いて送信してください。',
  'user.error.failedToUpdateUser': 'ユーザーの更新に失敗しました。',
  'user.error.failedToDeleteUser': 'ユーザーの削除に失敗しました。',
  'user.error.failedToReadUser': 'ユーザーの読み取りに失敗しました。',
  'user.error.emailRequired': 'メールアドレスは必須です。',
  'user.email.passwordResetSubject': '{{appName}} - パスワードリセット',
  'user.email.passwordResetText': 'パスワードリセットトークン: {{token}}',
  'user.email.passwordResetLink': 'パスワードをリセット: {{url}}',
  'user.email.passwordResetHtml': '<p>パスワードリセットトークン: <strong>{{token}}</strong></p>',
  'user.email.passwordResetHtmlLink': '<p><a href="{{url}}">パスワードをリセット</a></p>',
  'user.error.failedToProcessPasswordReset': 'パスワードリセットの処理に失敗しました。',
  'user.error.newPasswordRequired': '新しいパスワードは必須です。',
  'user.error.currentPasswordRequired': '現在のパスワードは必須です。',
  'user.error.currentPasswordIncorrect': '現在のパスワードが正しくありません。',
  'user.error.failedToUpdatePassword': 'パスワードの更新に失敗しました。',
  'user.error.planKeyRequired': 'planKeyは必須です。',
  'user.error.invalidPlan': '無効なプランです。',
  'user.error.failedToUpdateSubscription': 'サブスクリプションの更新に失敗しました。',
  'user.error.failedToUpdatePlan': 'プランの更新に失敗しました。',
  'user.error.twoFactorNotAvailable': '二要素認証は利用できません。',
  'user.error.twoFactorRequiresPassword':
    'このアカウントでは二要素認証が有効になっています。続行するにはメールアドレスとパスワードでサインインしてください。',
  'user.error.tokenRequired': 'トークンは必須です。',
  'user.error.noPendingTwoFactorSetup':
    '保留中の二要素認証設定がありません。まず「setup」アクションを呼び出してください。',
  'user.error.invalidToken': '無効なトークンです。',
  'user.error.twoFactorRequired': '二要素認証コードが必要です。',
  'user.error.twoFactorNotEnabled': '二要素認証が有効になっていません。',
  'user.error.invalidAction':
    '無効なアクションです。「setup」、「enable」、または「disable」を使用してください。',
  'user.error.twoFactorOperationFailed': '二要素認証の操作に失敗しました。',
  'user.error.oauthServerNotConfigured': 'OAuthサーバー「{{server}}」が設定されていません。',
  'user.error.oauthVerificationFailed': 'OAuth認証に失敗しました。',
  'user.error.failedToCreateUser': 'ユーザーの作成に失敗しました。',
  'user.error.oauthLoginFailed': 'OAuthログインに失敗しました。',
  'user.error.unauthorized': '許可されていない',
  'user.error.passwordTooLong': 'パスワードは最大{{max}}文字までです。',
  'user.error.passwordTooShort': 'パスワードは少なくとも{{min}}文字である必要があります',
  'user.error.tooManyRequests':
    '試行回数が多すぎます。しばらくお待ちいただき、もう一度お試しください。',
  'user.error.webhookUnauthorized': '不正支払い通知',
  'user.error.credentialsNested':
    'このログインエンドポイントは最上位レベルで認証情報を読み取りますが、このボディはそれらを{{envelope}}の下にネストします。loginEndpoint をこのエンベロープを展開するルートに設定するか、mapRequest で createRequestHandler を使用して、handlers.logIn の前に req.body[ {{envelope}}] を展開してください。',
  'user.error.oauthStateMismatch': 'OAuthの状態不一致 - CSRF攻撃の可能性',
  'user.error.avatarTooLarge': 'アバターは{{max}}文字以下でなければなりません。',
  'user.error.bioTooLong': '自己紹介文は{{max}}文字以下でなければなりません。',
  'user.error.noUpdatableFields': '更新可能なフィールドは提供されていません。',
  'user.error.oauthDataInvalid': 'oauthDataはオブジェクトである必要があります。',
  'user.error.subscriptionActivationRequiresVerification':
    'サブスクリプションの有効化には領収書の検証が必要です。POST /users /:id/verify-payment/:provider を使用してください。',
  'user.payment.noBillingAccount':
    'このユーザーの{{provider}}請求アカウントが見つかりませんでした。',
  'user.payment.portalFailed': '{{provider}}請求ポータルを開くことができませんでした。',
  'user.payment.portalNotSupported': '{{provider}}は請求ポータルを提供していません。',
  'user.payment.subscriptionOwnershipMismatch':
    'このサブスクリプションはあなたのアカウントには紐づいていません。',
  'user.payment.transactionAlreadyClaimed': 'この購入は既に別のアカウントに関連付けられています。',
  'user.error.completeTargetMissing':
    'completeIdとして指定されたIDを持つアカウントは存在しません。',
  'user.error.completeIdentityMismatch':
    '提供されたユーザー名またはメールアドレスでは、completeIdアカウントを特定できません。',
  'user.error.completeNotOwned':
    'completeIdアカウントはOAuth経由でサインインします。その認証情報はここでは提供されません。',
  'user.error.identityRequired':
    'プロビジョニングには、アカウントを識別するためのユーザー名またはメールアドレスが必要です。',
  'user.error.usernameEmailConflict':
    'ユーザー名とメールアドレスは、それぞれ別の既存のアカウントに属しています。',
  'user.error.oauthEmailCollision':
    'このメールアドレスには既にアカウントが存在します。元のログイン方法でログイン後、アカウント設定からこのプロバイダをリンクしてください。',
}
