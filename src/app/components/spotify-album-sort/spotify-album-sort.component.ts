import { Component, HostListener } from '@angular/core';
import * as moment from 'moment';
import { SpotifyAlbumEntryModel } from 'src/app/models/localStorageModel';
import { AlbumSortKey, albumSortOptions, SortOrder } from 'src/app/pipes/album-sort.pipe';
import { PluralizePipe } from 'src/app/pipes/pluralize.pipe';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Component({
  selector: 'app-spotify-album-sort',
  templateUrl: './spotify-album-sort.component.html',
  styleUrls: ['./spotify-album-sort.component.css']
})
export class SpotifyAlbumSortComponent {
  innerWidth: number

  pluralizePipe: PluralizePipe = new PluralizePipe()
  currentYear: number = new Date().getFullYear()

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

    moment.locale('en-short', {
      relativeTime: {
        future: 'in %s',
        past: '%s',
        s:  '%ds',
        ss: '%ds',
        m:  '1m',
        mm: '%dm',
        h:  '1h',
        hh: '%dh',
        d:  '1d',
        dd: '%dd',
        M:  '1mo',
        MM: '%dmo',
        y:  '1y',
        yy: '%dY'
      }
    });
  }

  get user(): SpotifyApi.UserObjectPublic { 
    return this.localStorageService.getSpotifyUserDetails()
  }

  get albums(): SpotifyAlbumEntryModel[] { 
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

  getSortDisplayValue(entry: SpotifyAlbumEntryModel): string {
    switch(this.sortKey) {
      case "Release Date": return moment(entry.api.album.release_date).format("MM-DD-yyyy")
      case "Duration": return this.formatDuration(entry.custom.duration)
      case "# of Tracks": return this.pluralizePipe.transform(entry.api.album.total_tracks, "track")
      case "Anniversary": return `${ this.getOrdinal(this.currentYear - moment(entry.api.album.release_date).year()) } • ${ moment(entry.api.album.release_date).format("MMM D") } • ${ moment(entry.api.album.release_date).set("year", this.currentYear).fromNow() }` 
      case "Popularity": return `Score: ${ entry.api.album.popularity }`
      default: return moment(entry.api.added_at).format("MM-DD-yyyy hh:mm A")
    }
  }

  getSortDescription(sortKey: AlbumSortKey): string {
    switch(this.sortKey) { 
      case "Popularity": return `Your Spotify library is ${ Math.round(this.albums.map(x => x.api.album.popularity).reduce((a, b) => a + b) / this.albums.length) }% mainstream.`
      default: return ""
    }
  }

  formatDuration(duration: number): string {
    let durationMoment: moment.Duration = moment.duration(duration)

    if (duration > (3600 * 1000)) {
      return `${ durationMoment.hours() } hr ${ durationMoment.minutes() } min`
    }

    return `${ durationMoment.minutes() } min ${ durationMoment.seconds() } sec`
  }

  getOrdinal(n: number) {
    let ord = 'th'
  
    if (n % 10 == 1 && n % 100 != 11)
    {
      ord = 'st'
    }
    else if (n % 10 == 2 && n % 100 != 12)
    {
      ord = 'nd'
    }
    else if (n % 10 == 3 && n % 100 != 13)
    {
      ord = 'rd'
    }
  
    return n + ord
  }
}
