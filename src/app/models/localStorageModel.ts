import { SpotifyApiTokenModel } from "./spotifyApiModel"

export class SpotifyAuthModel {
    authDate: string
    expiresUnix: number
    data: SpotifyApiTokenModel
}

export class SpotifyLocalAlbumModel {
    fetchedDate: string
    data: SpotifyAlbumEntryModel[]
}

export class SpotifyAlbumEntryModel {
    api: SpotifyApi.SavedAlbumObject
    custom: SpotifyCustomAlbumPropModel
}

export class SpotifyCustomAlbumPropModel {
    duration: number

    constructor() {
        this.duration = 0
    }
}