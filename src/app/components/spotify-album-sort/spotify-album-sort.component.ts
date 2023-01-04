import { Component } from '@angular/core';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Component({
  selector: 'app-spotify-album-sort',
  templateUrl: './spotify-album-sort.component.html',
  styleUrls: ['./spotify-album-sort.component.css']
})
export class SpotifyAlbumSortComponent {

  constructor(
    private localStorageService: LocalStorageService
  ) {

  }

  get user(): SpotifyApi.UserObjectPublic { 
    return this.localStorageService.getSpotifyUserDetails()
  }

  get albums(): SpotifyApi.SavedAlbumObject[] { 
    return this.localStorageService.getSpotifySavedAlbums()?.data
  }
}
