export const config = {
    spotify: {
        clientId: "",
        authCodeUrl: "http://localhost:9000/resources/spotify_auth.php",
        redirectUri: "http://localhost:4200",
        scopes: {
            librarySort: "user-library-read",
            anniversify: "user-library-read ugc-image-upload playlist-modify-public playlist-modify-private"
        },
    },
    anniversify: {
        apiRoot: "",
        emailSender: ""
    },
}