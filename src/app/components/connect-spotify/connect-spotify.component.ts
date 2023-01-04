import { Component, Input } from '@angular/core';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { SpotifyService } from 'src/app/services/spotify.service';

@Component({
  selector: 'app-connect-spotify',
  templateUrl: './connect-spotify.component.html',
  styleUrls: ['./connect-spotify.component.css']
})
export class ConnectSpotifyComponent {

  constructor(
    public spotifyService: SpotifyService,
    public localStorageService: LocalStorageService
  ) {}

  get user(): SpotifyApi.UserObjectPublic { 
    return this.localStorageService.getSpotifyUserDetails()
  }
}
