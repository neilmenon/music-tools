import { SpotifyApiTokenModel } from "./spotifyApiModel"

export class SpotifyAuthModel {
    authDate: string
    expiresUnix: number
    data: SpotifyApiTokenModel
}