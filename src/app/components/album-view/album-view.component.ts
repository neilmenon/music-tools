import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import * as moment from 'moment';
import { SpotifyAlbumEntryModel } from 'src/app/models/localStorageModel';
import { albumSortOptions } from 'src/app/pipes/album-sort.pipe';

@Component({
  selector: 'app-album-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './album-view.component.html',
  styleUrl: './album-view.component.css'
})
export class AlbumViewComponent {
  album: SpotifyAlbumEntryModel
  albumSortOptions = albumSortOptions
  sortDisplayValues: { option: string, value: string }[] = []
  moment = moment

  constructor(@Inject(MAT_DIALOG_DATA) public data: { album: SpotifyAlbumEntryModel, sortDisplayValues?: { option: string, value: string }[] }) {
    this.album = data.album
    this.sortDisplayValues = data.sortDisplayValues ? data.sortDisplayValues : []
  }

  get formattedArtistName(): string {
    return this.album.api.album.artists.map(x => x.name).join(", ")
  }

  extractAlbumImage(images: SpotifyApi.ImageObject[]): string {
    return images.find(x => x.width == 300) ? images.find(x => x.width == 300).url : images[0].url
  }
}
