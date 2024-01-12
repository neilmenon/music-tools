export const config = {
    spotify: {
        clientId: "${{ secrets.SPOTIFY_CLIENT_ID }}",
        authCodeUrl: "${{ secrets.AUTH_CODE_URL }}",
        redirectUri: "${{ secrets.SPOTIFY_REDIRECT_URI }}",
        scopes: {
            "spotify-album-sort": "${{ secrets.SPOTIFY_SCOPES_LIBRARY_SORT }}",
            "anniversify": "${{ secrets.SPOTIFY_SCOPES_ANNIVERSIFY }}"
        },
    },
    anniversify: {
        apiRoot: "${{ secrets.ANNIVERSIFY_API_ROOT }}",
        emailSender: "${{ secrets.ANNIVERSIFY_EMAIL_SENDER }}",
        vapidPublicKey: "${{ secrets.VAPID_PUBLIC_KEY }}",
    },
    lastfm: {
        apiKey: "${{ secrets.LASTFM_API_KEY }}"
    }
}