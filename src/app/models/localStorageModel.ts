import { AlbumSortKey } from "../pipes/album-sort.pipe"
import { SpotifyApiTokenModel } from "./spotifyApiModel"

export class SpotifyAuthModel {
    authDate: string
    expiresUnix: number
    data: SpotifyApiTokenModel
}

export class SpotifyLocalAlbumModel {
    fetchedDate: string
    lastfmLastScanned: number
    data: SpotifyAlbumEntryModel[]
}

export class SpotifyAlbumEntryModel {
    api: SpotifyApi.SavedAlbumObject
    custom: SpotifyCustomAlbumPropModel
}

export class SpotifyCustomAlbumPropModel {
    duration: number
    discs: number
    lastfmLastListened: number
    lastfmScrobbles: number
    fullPlayThroughs: number
    averageTimeBetweenPlays: number
    albumPlayTimestamps: number[]
    adjustedFullPlayTracks: number

    constructor() {
        this.duration = 0
        this.discs = 0
        this.lastfmLastListened = null
        this.lastfmScrobbles = null
        this.fullPlayThroughs = null
        this.averageTimeBetweenPlays = null
        this.albumPlayTimestamps = []
        this.adjustedFullPlayTracks = 0
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

export class LastfmLocalUserModel {
    username: string
    profileImage: string
    registered: number

    constructor() {
        this.username = null
        this.profileImage = null
        this.registered = null
    }
}

export type MusicTool = "spotify-album-sort" | "anniversify"