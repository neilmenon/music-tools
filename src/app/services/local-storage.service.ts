import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SPOTIFY_ALBUM_LOCAL, SPOTIFY_AUTH_LOCAL, SPOTIFY_USER_LOCAL } from '../constants/localStorageConstants';
import { SpotifyAlbumEntryModel, SpotifyAuthModel, SpotifyLocalAlbumModel } from '../models/localStorageModel';
import * as moment from 'moment';
import { MessageService } from './message.service';


@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  moment: any = moment

  constructor(private messageService: MessageService) { }

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
    return JSON.parse(localStorage.getItem(SPOTIFY_ALBUM_LOCAL))
  }

  setSpotifySavedAlbums(albums: SpotifyAlbumEntryModel[]): SpotifyLocalAlbumModel {
    let spotifyLocalModel = new SpotifyLocalAlbumModel()
    spotifyLocalModel.fetchedDate = moment().format()
    spotifyLocalModel.data = albums

    localStorage.setItem(SPOTIFY_ALBUM_LOCAL, JSON.stringify(spotifyLocalModel))
    return this.getSpotifySavedAlbums()
  }

  clearSpotifyUserData() {
    localStorage.removeItem(SPOTIFY_AUTH_LOCAL)
    localStorage.removeItem(SPOTIFY_USER_LOCAL)
    
    this.messageService.open("Disconnected your Spotify account and cleared local data.")
  }
}
