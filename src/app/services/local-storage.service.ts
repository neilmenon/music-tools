import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SPOTIFY_AUTH_LOCAL } from '../constants/localStorageConstants';
import { SpotifyAuthModel } from '../models/localStorageModel';
import * as moment from 'moment';


@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  moment: any = moment

  constructor() { }

  getAuthDetails(): SpotifyAuthModel {
    return JSON.parse(localStorage.getItem(SPOTIFY_AUTH_LOCAL))
  }

  setAuthDetails(authDetails: SpotifyAuthModel): SpotifyAuthModel {
    authDetails.authDate = moment().format()
    authDetails.expiresUnix = moment().unix() + authDetails.data.expires_in
    localStorage.setItem(SPOTIFY_AUTH_LOCAL, JSON.stringify(authDetails))
    return this.getAuthDetails()
  }
}
