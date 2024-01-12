import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MessageService } from './message.service';
import { ErrorHandlerService } from './error-handler.service';
import { LocalStorageService } from './local-storage.service';
import * as moment from 'moment';
import { LastfmLocalUserModel, SpotifyLocalAlbumModel } from '../models/localStorageModel';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
import { LastfmLastPlayedCustomRecord } from '../models/lastfmModel';

@Injectable({
  providedIn: 'root'
})
export class LastfmService {
  moment = moment
  fetchProgress = new BehaviorSubject<number>(0)

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private errorService: ErrorHandlerService,
    private localStorageService: LocalStorageService,
  ) { }

  async fetchLastfmDataForSpotifyAlbums(): Promise<void> {
    let spotifyAlbumModel: SpotifyLocalAlbumModel = this.localStorageService.getSpotifySavedAlbums()
    const startingTimestamp: number = spotifyAlbumModel?.lastfmLastScanned ? spotifyAlbumModel.lastfmLastScanned - 3*60*60*24 : null
    const now: number = Math.floor(Date.now() / 1000)
    const endingTimestamp: number = startingTimestamp ? now : null
    const fetchUrl: string = "https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&limit=1000" 
      + (startingTimestamp && endingTimestamp ? `&from=${startingTimestamp}&to=${endingTimestamp}` : "")

    let recentTracksResponse: any = await lastValueFrom(this.http.get(fetchUrl))
    let lastPlayedCustomRecordList: LastfmLastPlayedCustomRecord[] = []
    let currentPage: number = 0, totalPages: number = 1
    while (true) {
      this.fetchProgress.next(Math.ceil((currentPage / totalPages) * 100))
      currentPage = parseInt(recentTracksResponse["recenttracks"]["@attr"]["page"])
      totalPages = parseInt(recentTracksResponse["recenttracks"]["@attr"]["totalPages"])
      console.log(`Parsing Last.fm tracks page ${currentPage}/${totalPages}`)
      if (!recentTracksResponse["recenttracks"]["track"]?.length)
        return
      recentTracksResponse["recenttracks"]["track"]?.forEach((trackEntry: any) => {
        const artist: string = trackEntry["artist"]["#text"]
        const album: string = trackEntry["album"]["#text"]
        const track: string = trackEntry["name"]
        const timestamp: number = trackEntry?.date?.uts ? parseInt(trackEntry["date"]["uts"]) : null
        if (timestamp) {
          let customRecordIndex: number = lastPlayedCustomRecordList.findIndex(x => x.album == album && x.artist == artist)
          if (customRecordIndex > -1) {
            // if (!lastPlayedCustomRecordList[customRecordIndex].scrobbles.find(x => x.title == track))
            lastPlayedCustomRecordList[customRecordIndex].scrobbles.push({ title: track, timestamp: timestamp })
          } else {
            lastPlayedCustomRecordList.push({ artist: artist, album: album, scrobbles: [{ title: track, timestamp: timestamp }] })
          }
        }
      })
      if (currentPage != totalPages) {
        recentTracksResponse = await lastValueFrom(this.http.get(`${fetchUrl}&page=${currentPage + 1}`))
      } else {
        break
      }
    }
    // console.log(lastPlayedCustomRecordList)
    spotifyAlbumModel.data.forEach(spotifyAlbum => {
      // if Various Artists, only try and match by album name
      let matchingLastfmRecord: LastfmLastPlayedCustomRecord = null
      if (spotifyAlbum.api.album.artists.map(x => x.name).includes("Various Artists")) {
        matchingLastfmRecord = lastPlayedCustomRecordList.find(x => 
          x.album.toLowerCase() == spotifyAlbum.api.album.name.toLowerCase()
        )
      } else {
        matchingLastfmRecord = lastPlayedCustomRecordList.find(x => 
          x.artist.toLowerCase() == spotifyAlbum.api.album.artists[0].name.toLowerCase() &&
          x.album.toLowerCase() == spotifyAlbum.api.album.name.toLowerCase()
        )
      }
      if (!matchingLastfmRecord) {
        console.warn(`Unable to find matching Last.fm record for ${spotifyAlbum.api.album.artists.map(x => x.name).join(", ")} - ${spotifyAlbum.api.album.name}`)
        return
      }

      // determine last listened date
      // defined as: listened to at least half of the album
      const albumDistinctTracksListenQualifier: number = spotifyAlbum.api.album.total_tracks >= 15 ? 5 : Math.ceil(spotifyAlbum.api.album.total_tracks / 2)
      let scrobbleIndex: number = 0, distinctTracksList: { title: string, timestamp: number }[] = [], qualifierMet: boolean = false, freebeeMet: boolean = false
      while (scrobbleIndex < matchingLastfmRecord.scrobbles.length) {
        const distinctTrack: boolean = !distinctTracksList.map(x => x.title).includes(matchingLastfmRecord.scrobbles[scrobbleIndex].title)
        if (distinctTrack) {
          distinctTracksList.push(matchingLastfmRecord.scrobbles[scrobbleIndex])
        } else {
          if (!freebeeMet) {
            distinctTracksList.push(matchingLastfmRecord.scrobbles[scrobbleIndex])
            freebeeMet = true
          } else {
            // user listened to same track without meeting the distinct tracks #, clear the list
            distinctTracksList = []
          }
        }

        // did they meet the qualifier?
        if (distinctTracksList.length >= albumDistinctTracksListenQualifier) {
          qualifierMet = true
          break
        }
        scrobbleIndex++
      }

      if (qualifierMet) {
        spotifyAlbum.custom.lastfmLastListened = (distinctTracksList.length >= 2 ? distinctTracksList[1] : distinctTracksList[0]).timestamp
      }
      spotifyAlbum.custom.lastfmScrobbles = matchingLastfmRecord.scrobbles.length
      if (spotifyAlbum.custom.lastfmLastListened != 0) {
        console.log(`Set last listened for ${spotifyAlbum.api.album.artists.map(x => x.name).join(", ")} - ${spotifyAlbum.api.album.name} to ${moment.unix(spotifyAlbum.custom.lastfmLastListened)} w/ ${spotifyAlbum.custom.lastfmScrobbles} scrobble(s)`)
      } else {
        console.warn(`Unknown last played date for ${spotifyAlbum.api.album.artists.map(x => x.name).join(", ")} - ${spotifyAlbum.api.album.name} w/ ${spotifyAlbum.custom.lastfmScrobbles} scrobble(s)`)
      }
    })
    spotifyAlbumModel.lastfmLastScanned = Math.floor(Date.now() / 1000)
    this.localStorageService.setSpotifySavedAlbums(spotifyAlbumModel.data, null, now)
  }

  translateLastfmProfile(userInfoResponse: any): LastfmLocalUserModel {
    let lastfmLocalUserModel: LastfmLocalUserModel = new LastfmLocalUserModel()
    lastfmLocalUserModel.username = userInfoResponse.user.name
    lastfmLocalUserModel.profileImage = !userInfoResponse.user?.image?.length || (userInfoResponse.user?.image?.length && userInfoResponse.user.image[userInfoResponse.user.image.length - 1]["#text"] == "") ? 
      "https://lastfm.freetls.fastly.net/i/u/avatar170s/818148bf682d429dc215c1705eb27b98.webp" : userInfoResponse.user.image[userInfoResponse.user.image.length - 1]["#text"]
    lastfmLocalUserModel.registered = userInfoResponse.user?.registered["#text"]
    return lastfmLocalUserModel
  }
}
