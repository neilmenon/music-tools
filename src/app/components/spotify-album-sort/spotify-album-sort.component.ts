import { Component, HostListener } from '@angular/core';
import * as moment from 'moment';
import { AlbumSortKey, albumSortOptions, SortOrder } from 'src/app/pipes/album-sort.pipe';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Component({
  selector: 'app-spotify-album-sort',
  templateUrl: './spotify-album-sort.component.html',
  styleUrls: ['./spotify-album-sort.component.css']
})
export class SpotifyAlbumSortComponent {
  innerWidth: number

  @HostListener('window:resize', ['$event'])
  onResize(event: { target: { innerWidth: number; } }) {
    this.innerWidth = event.target.innerWidth
  }

  sortKey: AlbumSortKey = "Added"
  sortDesc: boolean = true
  sortOptions = albumSortOptions

  constructor(
    private localStorageService: LocalStorageService
  ) {
    this.innerWidth = window.innerWidth
  }

  get user(): SpotifyApi.UserObjectPublic { 
    return this.localStorageService.getSpotifyUserDetails()
  }

  get albums(): SpotifyApi.SavedAlbumObject[] { 
    return this.localStorageService.getSpotifySavedAlbums()?.data
  }

  extractAlbumImage(images: SpotifyApi.ImageObject[]): string {
    return images.find(x => x.width == 300) ? images.find(x => x.width == 300).url : images[0].url
  }

  formatArtists(artists: SpotifyApi.ArtistObjectSimplified[]): string {
    return artists.map(x => x.name).join(", ")
  }

  mobileView(): boolean {
    return this.innerWidth <= 450
  }

  getSortDisplayValue(album: SpotifyApi.SavedAlbumObject): string {
    switch(this.sortKey) {
      case "Release Date": return moment(album.album.release_date).format("MM-DD-yyyy")
      default: return moment(album.added_at).format("MM-DD-yyyy hh:mm A")
    }
  }
}
