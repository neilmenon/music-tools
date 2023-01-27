import { AlbumSortKey } from "../pipes/album-sort.pipe"
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

export class UserPreferenceModel {
    spotifySort: UserPreferenceSpotifySortModel
    emails: boolean

    constructor() {
        this.spotifySort = new UserPreferenceSpotifySortModel()
        this.emails = false
    }
}

export class UserPreferenceSpotifySortModel {
    sortDesc: boolean
    sortKey: AlbumSortKey
    listView: boolean

    constructor() {
        this.sortDesc = true
        this.sortKey = "Added"
        this.listView = false
    }
}