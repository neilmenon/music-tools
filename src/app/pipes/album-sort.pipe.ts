import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';
import { SpotifyAlbumEntryModel } from '../models/localStorageModel';

@Pipe({
  name: 'albumSort'
})
export class AlbumSortPipe implements PipeTransform {
  currentYear: number = new Date().getFullYear()

  transform(albums: SpotifyAlbumEntryModel[], sortKey: AlbumSortKey, sortDesc: boolean): SpotifyAlbumEntryModel[] {
    let albumsWithLastPlayed = albums.filter(x => x.custom.lastfmLastListened)
    let albumsWithoutLastPlayed = albums.filter(x => !x.custom.lastfmLastListened)
    let albumsWithScrobbles = albums.filter(x => x.custom.lastfmScrobbles)
    let albumsWithoutScrobbles = albums.filter(x => !x.custom.lastfmScrobbles)
    switch (sortKey) {      
      case "Release Date": return sortDesc ? albums.sort((a, b) => moment(b.api.album.release_date).unix() - moment(a.api.album.release_date).unix()) :
        albums.sort((a, b) => moment(a.api.album.release_date).unix() - moment(b.api.album.release_date).unix())

      case "Duration": return sortDesc ? albums.sort((a, b) => b.custom.duration - a.custom.duration) :
        albums.sort((a, b) => a.custom.duration - b.custom.duration)

      case "# of Tracks": return sortDesc ? albums.sort((a, b) => b.api.album.total_tracks - a.api.album.total_tracks) :
        albums.sort((a, b) => a.api.album.total_tracks - b.api.album.total_tracks)

      // case "Anniversary": return sortDesc ? albums.sort((a, b) => this.getNextAnniversary(b.api.album.release_date).diff(moment()) - this.getNextAnniversary(a.api.album.release_date).diff(moment())) :
      //   albums.sort((a, b) => this.getNextAnniversary(a.api.album.release_date).diff(moment()) - this.getNextAnniversary(b.api.album.release_date).diff(moment()))
      
      case "Popularity": return sortDesc ? albums.sort((a, b) => b.api.album.popularity - a.api.album.popularity) : 
        albums.sort((a, b) => a.api.album.popularity - b.api.album.popularity)

      case "Label": return sortDesc ? albums.sort((a, b) => b.api.album.label < a.api.album.label ? -1 : 1) : 
        albums.sort((a, b) => a.api.album.label < b.api.album.label ? -1 : 1)

      case "Last Played": return sortDesc ? albumsWithLastPlayed.sort((a, b) => b.custom.lastfmLastListened - a.custom.lastfmLastListened).concat(albumsWithoutLastPlayed) :
        albumsWithoutLastPlayed.concat(albumsWithLastPlayed.sort((a, b) => a.custom.lastfmLastListened - b.custom.lastfmLastListened))

      case "Plays": return sortDesc ? albumsWithScrobbles.sort((a, b) => b.custom.lastfmScrobbles - a.custom.lastfmScrobbles).concat(albumsWithoutScrobbles) :
        albumsWithoutScrobbles.concat(albumsWithScrobbles.sort((a, b) => a.custom.lastfmScrobbles - b.custom.lastfmScrobbles))

      case "Suggested": return sortDesc ? albumsWithLastPlayed.sort(this.suggestedSortFnDesc).concat(albumsWithoutLastPlayed) :
        albumsWithoutLastPlayed.concat(albumsWithLastPlayed.sort(this.suggestedSortFnAsc))

      default: return sortDesc ? albums.sort((a, b) => moment(b.api.added_at).unix() - moment(a.api.added_at).unix()) :
        albums.sort((a, b) => moment(a.api.added_at).unix() - moment(b.api.added_at).unix())
    }
  }

  suggestedSortFnAsc = (a: SpotifyAlbumEntryModel, b: SpotifyAlbumEntryModel) => {
    const aScore: number = calculateSuggestedScore(a)
    const bScore: number = calculateSuggestedScore(b)
    return aScore < bScore ? -1 : (aScore === bScore ? 0 : 1)
  }

  suggestedSortFnDesc = (a: SpotifyAlbumEntryModel, b: SpotifyAlbumEntryModel) => {
    const aScore: number = calculateSuggestedScore(a)
    const bScore: number = calculateSuggestedScore(b)
    return bScore < aScore ? -1 : (aScore === bScore ? 0 : 1)
  }

  getNextAnniversary(releaseDate: string) {
    let dateMoment: moment.Moment = moment(releaseDate)

    if (moment(releaseDate).set("year", this.currentYear).isBefore(moment())) {
      return dateMoment.set("year", this.currentYear + 1)
    }

    return dateMoment.set("year", this.currentYear)
  }
}

export const albumSortOptions = ["Added", "Last Played", "Release Date", "Plays", "Duration", "# of Tracks", "Suggested", "Popularity", "Label"] as const
export type AlbumSortKey = typeof albumSortOptions[number]
export type SortOrder = "asc" | "desc"

export function calculateSuggestedScore(album: SpotifyAlbumEntryModel): number {
  // Suggested Score = w1 * Days Since Last Listened + w2 * log(Number of Listens)
  const w1: number = 0.5, w2: number = 0.5
  const daysSinceLastListened: number = Math.abs(moment().diff(moment.unix(album.custom.lastfmLastListened), 'days'))
  const numberOfListens: number = album.custom.lastfmScrobbles ? album.custom.lastfmScrobbles : 0

  const score: number = w1 * Math.log(daysSinceLastListened == 0 ? 1 : daysSinceLastListened) + w2 * Math.log(numberOfListens == 0 ? 1 : numberOfListens)
  return score
}
