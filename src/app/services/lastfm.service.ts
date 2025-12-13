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
    const startingTimestamp: number = spotifyAlbumModel?.lastfmLastScanned ? spotifyAlbumModel.lastfmLastScanned : null
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
    const soundtrackLikeNames: string[] = ["Soundtrack", "Music From", "Inspired By", "Motion Picture", "Film Score"]
    const mostLikelySoundtrackCompilation: boolean = spotifyAlbum.api.album.artists.map(x => x.name).includes("Various Artists") ||
      spotifyAlbum.api.album.artists.length > 2 ||
      soundtrackLikeNames.some(x => spotifyAlbum.api.album.name.toLowerCase().includes(x.toLowerCase()))
    if (mostLikelySoundtrackCompilation) {
      matchingLastfmRecord = {
          artist: "Various Arists",
          album: spotifyAlbum.api.album.name,
          scrobbles: [].concat(
            ...lastPlayedCustomRecordList
              .filter(x => x.album.toLowerCase() == spotifyAlbum.api.album.name.toLowerCase())
              .map(x => x.scrobbles)
          ).sort((a: { title: string, timestamp: number }, b: { title: string, timestamp: number }) => b.timestamp - a.timestamp)
        }
      } else {
        matchingLastfmRecord = lastPlayedCustomRecordList.find(x => 
          (
            x.artist.toLowerCase() == spotifyAlbum.api.album.artists[0].name.toLowerCase() ||
            x.artist.replace(/^The\s/, "").toLowerCase() == spotifyAlbum.api.album.artists[0].name.replace(/^The\s/, "").toLowerCase()
          ) &&
          x.album.toLowerCase() == spotifyAlbum.api.album.name.toLowerCase()
        )
      }
      if (!matchingLastfmRecord) {
        console.warn(`Unable to find matching Last.fm record for ${spotifyAlbum.api.album.artists.map(x => x.name).join(", ")} - ${spotifyAlbum.api.album.name}`)
        return
      }

      // determine last listened date + # of distinct album plays
      const totalTracksForPlayThroughs = spotifyAlbum.custom?.discs > 0 ? spotifyAlbum.api.album.total_tracks / spotifyAlbum.custom.discs : spotifyAlbum.api.album.total_tracks
      const albumDistinctTracksListenQualifier: number = Math.ceil(totalTracksForPlayThroughs * 0.65) // Math.ceil(totalTracksForPlayThroughs / 2) + 1 // totalTracksForPlayThroughs >= 15 ? 5 : 
      const freebeeMax: number = Math.ceil(totalTracksForPlayThroughs / 10)
      let scrobbleIndex: number = 0, 
          distinctTracksList: { title: string, timestamp: number }[] = [], 
          distinctTracksListFinal: { title: string, timestamp: number }[] = [], 
          qualifierMet: boolean = false, 
          freebeeCount: number = 0,
          albumPlays: number = 0,
          albumPlayTimestamps: number[] = []
      while (scrobbleIndex < matchingLastfmRecord.scrobbles.length) {
        // check if time between current and last unique play is not greater than 2 days
        // if it is greater, did they really listen to the album through in one sitting?
        const timeBetweenCurrentAndLastOk: boolean = distinctTracksList.length == 0 ? true : 
          Math.abs(distinctTracksList[distinctTracksList.length - 1].timestamp - matchingLastfmRecord.scrobbles[scrobbleIndex].timestamp) <= 1.5*60*60*24
        if (!timeBetweenCurrentAndLastOk) {
          distinctTracksList = []
        }
        const distinctTrack: boolean = !distinctTracksList.map(x => x.title).includes(matchingLastfmRecord.scrobbles[scrobbleIndex].title)
        if (distinctTrack) {
          distinctTracksList.push(matchingLastfmRecord.scrobbles[scrobbleIndex])
        } else {
          if (freebeeCount < freebeeMax) {
            distinctTracksList.push(matchingLastfmRecord.scrobbles[scrobbleIndex])
            freebeeCount++
          } else {
            // user listened to same track without meeting the distinct tracks #, clear the list
            distinctTracksList = []
          }
        }

        // did they meet the qualifier?
        if (distinctTracksList.length >= albumDistinctTracksListenQualifier) {
          if (!qualifierMet) {
            qualifierMet = true
            distinctTracksListFinal = distinctTracksList
          }
          albumPlays++
          albumPlayTimestamps.push(distinctTracksList[distinctTracksList.length - 1].timestamp)
          distinctTracksList = []
        }
        scrobbleIndex++
      }

      // if user is neilmenon, filter out any timestamps before November 6, 2020 from albumPlayTimestamps
      if (this.localStorageService.getLastfmUsername()?.toLowerCase() == "neilmenon") {
        const cutoffTimestamp: number = moment("November 6, 2020").unix()
        albumPlayTimestamps = albumPlayTimestamps.filter(x => x >= cutoffTimestamp)
      }

      if (qualifierMet && distinctTracksListFinal.length > 0) {
        spotifyAlbum.custom.lastfmLastListened = (distinctTracksListFinal.length >= 2 ? distinctTracksListFinal[1] : distinctTracksListFinal[0]).timestamp
        spotifyAlbum.custom.albumPlayTimestamps = Array.from(new Set([...spotifyAlbum.custom.albumPlayTimestamps, ...albumPlayTimestamps])).sort((a, b) => a - b)
      }
      spotifyAlbum.custom.lastfmScrobbles = spotifyAlbum.custom.lastfmScrobbles != null ? spotifyAlbum.custom.lastfmScrobbles + matchingLastfmRecord.scrobbles.length : matchingLastfmRecord.scrobbles.length
      if (spotifyAlbum.custom.lastfmLastListened != 0) {
        console.log(`Set last listened for ${spotifyAlbum.api.album.artists.map(x => x.name).join(", ")} - ${spotifyAlbum.api.album.name} to ${moment.unix(spotifyAlbum.custom.lastfmLastListened)} w/ ${spotifyAlbum.custom.lastfmScrobbles} scrobble(s)`)
      } else {
        console.warn(`Unknown last played date for ${spotifyAlbum.api.album.artists.map(x => x.name).join(", ")} - ${spotifyAlbum.api.album.name} w/ ${spotifyAlbum.custom.lastfmScrobbles} scrobble(s)`)
      }
      spotifyAlbum.custom.fullPlayThroughs = spotifyAlbum.custom.fullPlayThroughs != null ? spotifyAlbum.custom.fullPlayThroughs + albumPlays : albumPlays
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
