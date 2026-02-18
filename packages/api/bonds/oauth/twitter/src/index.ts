/**
 * Twitter OAuth provider for molecule.dev.
 *
 * ## Setup
 *
 * 1. Log into [Twitter](https://twitter.com) (or sign up).
 *
 * 2. Open the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard).
 *
 * 3. Create a new project/app and follow Twitter's steps. You may need to verify your account with a phone number.
 *
 * 4. Fill out your app's information and you should eventually arrive at a screen with an ID, secret, and bearer token. These are not the OAuth client ID and secret, but you should still store them somewhere safe.
 *
 * 5. Upload your app's logo and description if necessary.
 *
 *     5.1. Return to Twitter's Developer Portal Dashboard.
 *
 *     5.2. Open your app under "Projects & Apps".
 *
 *     5.3. Click the "Edit" button.
 *
 *     5.4. Upload an image.
 *
 *     5.5. Update your app's description.
 *
 *     5.6. Click the "Save" button.
 *
 * 6. Under "User authentication settings", click the "Set up" button to begin enabling OAuth.
 *
 * 7. Enable "OAuth 2.0".
 *
 * 8. Choose "Web App" for "Type of App".
 *
 * 9. Under "Callback URI / Redirect URL", add two entries:
 *
 *     - For development: `http://localhost:3000`
 *
 *     - For production: Your app's origin. This should typically match your API's `APP_ORIGIN` environment variable.
 *
 * 10. Fill out the remaining information as necessary and click the "Save" button.
 *
 * 11. You should be taken to a screen containing your OAuth client ID and secret.
 *
 *     11.1. Set the client ID to your API's `OAUTH_TWITTER_CLIENT_ID` environment variable and your app's `REACT_APP_OAUTH_TWITTER_CLIENT_ID` environment variable.
 *
 *     11.2. Set the client secret to your API's `OAUTH_TWITTER_CLIENT_SECRET` environment variable.
 *
 * 12. Restart your API and/or rebuild your app so that they have the environment variables.
 *
 * > **Your users should now be able to log in via Twitter!**
 *
 * @module
 */

export * from './types.js'
export * from './verify.js'
