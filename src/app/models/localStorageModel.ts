import { SpotifyApiTokenModel } from "./spotifyApiModel"

export class SpotifyAuthModel {
    authDate: string
    expiresUnix: number
    data: SpotifyApiTokenModel
}

export class SpotifyLocalAlbumModel {
    fetchedDate: string
    data: SpotifyApi.SavedAlbumObject[]
}