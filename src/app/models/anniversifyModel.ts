export class AnniversifyModel {
    lastAuthenticated: string
    albumsOnly: boolean
    emailsEnabled: boolean
    playlistEnabled: boolean
    email: string
    spotifyPlaylistId: string
    errors: any[]
    lastRun: string
    timezone: string
    name: string
    libraryLastFetched: string
    notifyTime: string
    registerDate: string

    constructor() {
        this.lastAuthenticated = null
        this.albumsOnly = true
        this.emailsEnabled = true
        this.playlistEnabled = true
        this.email = null
        this.spotifyPlaylistId = null
        this.errors = null
        this.lastRun = null
        this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        this.name = null
        this.libraryLastFetched = null
        this.notifyTime = null
        this.registerDate = null
    }
}