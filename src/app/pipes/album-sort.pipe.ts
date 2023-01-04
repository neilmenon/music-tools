import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({
  name: 'albumSort'
})
export class AlbumSortPipe implements PipeTransform {

  transform(albums: SpotifyApi.SavedAlbumObject[], sortKey: AlbumSortKey, sortDesc: boolean): SpotifyApi.SavedAlbumObject[] {
    switch (sortKey) {      
      case "Release Date": return sortDesc ? albums.sort((a, b) => moment(b.album.release_date).unix() - moment(a.album.release_date).unix()) :
        albums.sort((a, b) => moment(a.album.release_date).unix() - moment(b.album.release_date).unix())
      
      default: return sortDesc ? albums.sort((a, b) => moment(b.added_at).unix() - moment(a.added_at).unix()) :
        albums.sort((a, b) => moment(a.added_at).unix() - moment(b.added_at).unix())
    }
  }

}

export const albumSortOptions = ["Added", "Release Date", "Duration", "# of Tracks"] as const
export type AlbumSortKey = typeof albumSortOptions[number] // "Added" | "Release Date" | "Duration" | "# of Tracks"
export type SortOrder = "asc" | "desc"
