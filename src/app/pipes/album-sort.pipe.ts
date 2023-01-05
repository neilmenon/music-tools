import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';
import { SpotifyAlbumEntryModel } from '../models/localStorageModel';

@Pipe({
  name: 'albumSort'
})
export class AlbumSortPipe implements PipeTransform {
  currentYear: number = new Date().getFullYear()

  transform(albums: SpotifyAlbumEntryModel[], sortKey: AlbumSortKey, sortDesc: boolean): SpotifyAlbumEntryModel[] {

    switch (sortKey) {      
      case "Release Date": return sortDesc ? albums.sort((a, b) => moment(b.api.album.release_date).unix() - moment(a.api.album.release_date).unix()) :
        albums.sort((a, b) => moment(a.api.album.release_date).unix() - moment(b.api.album.release_date).unix())

      case "Duration": return sortDesc ? albums.sort((a, b) => b.custom.duration - a.custom.duration) :
        albums.sort((a, b) => a.custom.duration - b.custom.duration)

      case "# of Tracks": return sortDesc ? albums.sort((a, b) => b.api.album.total_tracks - a.api.album.total_tracks) :
        albums.sort((a, b) => a.api.album.total_tracks - b.api.album.total_tracks)

      case "Anniversary": return sortDesc ? albums.sort((a, b) => this.getNextAnniversary(b.api.album.release_date).diff(moment()) - this.getNextAnniversary(a.api.album.release_date).diff(moment())) :
        albums.sort((a, b) => this.getNextAnniversary(a.api.album.release_date).diff(moment()) - this.getNextAnniversary(b.api.album.release_date).diff(moment()))
      
      case "Popularity": return sortDesc ? albums.sort((a, b) => b.api.album.popularity - a.api.album.popularity) : 
        albums.sort((a, b) => a.api.album.popularity - b.api.album.popularity)

      default: return sortDesc ? albums.sort((a, b) => moment(b.api.added_at).unix() - moment(a.api.added_at).unix()) :
        albums.sort((a, b) => moment(a.api.added_at).unix() - moment(b.api.added_at).unix())
    }
  }

  getNextAnniversary(releaseDate: string) {
    let dateMoment: moment.Moment = moment(releaseDate)

    if (moment(releaseDate).set("year", this.currentYear).isBefore(moment())) {
      return dateMoment.set("year", this.currentYear + 1)
    }

    return dateMoment.set("year", this.currentYear)
  }
}

export const albumSortOptions = ["Added", "Release Date", "Duration", "# of Tracks", "Anniversary", "Popularity"] as const
export type AlbumSortKey = typeof albumSortOptions[number]
export type SortOrder = "asc" | "desc"
