import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AnniversifyModel } from '../models/anniversifyModel';
import { lastValueFrom } from 'rxjs';
import { config } from '../config/config';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AnniversifyService {

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) { }

  async getDetails(): Promise<AnniversifyModel> {
    return await lastValueFrom(this.http.get<AnniversifyModel>(config.anniversify.apiRoot))
  }

  async setDetails(details: AnniversifyModel, isCreate: boolean): Promise<AnniversifyModel> {
    let payload: any = { 
      "UserDetails": JSON.parse(JSON.stringify(details)),
      'SpotifyAuth': null
    }
    if (!this.localStorageService.getAnniversifyDeviceTokensSent()) {
      payload['SpotifyAuth'] = JSON.parse(JSON.stringify(this.localStorageService.getSpotifyAuthDetails()?.data))
    }
    
    let response;
    if (isCreate) {
      response = await lastValueFrom(this.http.post<AnniversifyModel>(config.anniversify.apiRoot, payload))
    } else {
      response = await lastValueFrom(this.http.put<AnniversifyModel>(config.anniversify.apiRoot, payload))
    }

    this.localStorageService.setAnniversifyDeviceTokensSent(true)
    return response
  }

  async deleteDetails() {
    return await lastValueFrom(this.http.delete(config.anniversify.apiRoot))
  }
}
