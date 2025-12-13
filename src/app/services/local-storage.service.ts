import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ANNIVERSIFY_DEVICE_TOKENS_SENT, LASTFM_USER_DETAILS, SPOTIFY_ALBUM_LOCAL, SPOTIFY_AUTH_LOCAL, SPOTIFY_USER_LOCAL, USER_PREF_LOCAL } from '../constants/localStorageConstants';
import { LastfmLocalUserModel, SpotifyAlbumEntryModel, SpotifyAuthModel, SpotifyLocalAlbumModel, UserPreferenceModel } from '../models/localStorageModel';
import * as moment from 'moment';
import { MessageService } from './message.service';


@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  moment: any = moment

  constructor(
    private messageService: MessageService,
  ) { }

  getSpotifyAuthDetails(): SpotifyAuthModel {
    return JSON.parse(localStorage.getItem(SPOTIFY_AUTH_LOCAL))
  }

  setSpotifyAuthDetails(authDetails: SpotifyAuthModel): SpotifyAuthModel {
    authDetails.authDate = moment().format()
    authDetails.expiresUnix = moment().unix() + authDetails.data.expires_in
    localStorage.setItem(SPOTIFY_AUTH_LOCAL, JSON.stringify(authDetails))
    return this.getSpotifyAuthDetails()
  }

  getSpotifyUserDetails(): SpotifyApi.UserObjectPublic {
    return JSON.parse(localStorage.getItem(SPOTIFY_USER_LOCAL))
  }

  setSpotifyUserDetails(userDetails: SpotifyApi.UserObjectPublic): SpotifyApi.UserObjectPublic {
    localStorage.setItem(SPOTIFY_USER_LOCAL, JSON.stringify(userDetails))
    return this.getSpotifyUserDetails()
  }

  getSpotifySavedAlbums(): SpotifyLocalAlbumModel {
    const albums: SpotifyLocalAlbumModel = JSON.parse(localStorage.getItem(SPOTIFY_ALBUM_LOCAL))
    albums.data.forEach(album => {
      // populate average time between plays
      const albumPlayTimestamps: number[] = album.custom.albumPlayTimestamps ? album.custom.albumPlayTimestamps : []

      const averageTimeBetweenAlbumPlays: number = albumPlayTimestamps.length >= 2 ?
        albumPlayTimestamps
          .map((x, i, arr) => i == 0 ? 0 : x - arr[i - 1])
          .filter(x => x != 0)
          .reduce((a, b) => a + b, 0) / (albumPlayTimestamps.length - 1)
        : 0
      album.custom.averageTimeBetweenPlays = averageTimeBetweenAlbumPlays
    })
    return albums
  }

  setSpotifySavedAlbums(albums: SpotifyAlbumEntryModel[], spotifyFetchedDate?: string, lastfmLastScanned?: number): SpotifyLocalAlbumModel {
    let spotifyLocalModel = new SpotifyLocalAlbumModel()
    spotifyLocalModel.fetchedDate = spotifyFetchedDate ? spotifyFetchedDate: this.getSpotifySavedAlbums()?.fetchedDate
    spotifyLocalModel.lastfmLastScanned = lastfmLastScanned ? lastfmLastScanned : (this.getSpotifySavedAlbums()?.lastfmLastScanned ? this.getSpotifySavedAlbums().lastfmLastScanned : null)
    spotifyLocalModel.data = albums

    localStorage.setItem(SPOTIFY_ALBUM_LOCAL, JSON.stringify(spotifyLocalModel))
    return this.getSpotifySavedAlbums()
  }

  async clearSpotifyUserData() {
    localStorage.removeItem(SPOTIFY_AUTH_LOCAL)
    localStorage.removeItem(SPOTIFY_USER_LOCAL)
    localStorage.removeItem(ANNIVERSIFY_DEVICE_TOKENS_SENT)
    
    this.messageService.open("Disconnected your Spotify account and cleared local data.")
  }

  getUserPreferences(): UserPreferenceModel {
    return JSON.parse(localStorage.getItem(USER_PREF_LOCAL)) ? JSON.parse(localStorage.getItem(USER_PREF_LOCAL)) : this.setUserPreferences(new UserPreferenceModel)
  }

  setUserPreferences(userPref: UserPreferenceModel): UserPreferenceModel {
    localStorage.setItem(USER_PREF_LOCAL, JSON.stringify(userPref))
    return this.getUserPreferences()
  }

  setAnniversifyDeviceTokensSent(value: boolean) {
    localStorage.setItem(ANNIVERSIFY_DEVICE_TOKENS_SENT, `${ value }`)
  }

  getAnniversifyDeviceTokensSent(): boolean {
    return localStorage.getItem(ANNIVERSIFY_DEVICE_TOKENS_SENT) == "true" ? true : false
  }

  getLastfmUsername(): string {
    return (JSON.parse(localStorage.getItem(LASTFM_USER_DETAILS)) as LastfmLocalUserModel)?.username 
  }

  setLastfmUserDetails(lastfmLocalUserModel: LastfmLocalUserModel): void {
    localStorage.setItem(LASTFM_USER_DETAILS, JSON.stringify(lastfmLocalUserModel))
  }

  getLastfmUserDetails(): LastfmLocalUserModel {
    return (JSON.parse(localStorage.getItem(LASTFM_USER_DETAILS)) as LastfmLocalUserModel)
  }

  clearLastfmData(clearUser: boolean = true): void {
    if (clearUser) {
      localStorage.removeItem(LASTFM_USER_DETAILS)
    }

    // clear out all the Last.fm fields in Spotify data
    let spotifyModel = this.getSpotifySavedAlbums()
    spotifyModel.lastfmLastScanned = null
    if (spotifyModel?.data) {
      spotifyModel.data.forEach(album => { 
        album.custom.lastfmLastListened = null 
        album.custom.lastfmScrobbles = null
        album.custom.fullPlayThroughs = null
        album.custom.averageTimeBetweenPlays = null
        album.custom.albumPlayTimestamps = []
      })
    }
    localStorage.setItem(SPOTIFY_ALBUM_LOCAL, JSON.stringify(spotifyModel))
    if (clearUser) {
      this.messageService.open("Disconnected your Last.fm account and cleared local data.")
    }
  }
}
