export class LastfmLastPlayedCustomRecord {
    artist: string
    album: string
    scrobbles: { title: string, timestamp: number }[]

    constructor() {
        this.artist = null
        this.album = null
        this.scrobbles = null
    }
}