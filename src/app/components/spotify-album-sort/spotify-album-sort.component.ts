import { AfterViewInit, Component, HostListener } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import * as moment from 'moment';
import { BehaviorSubject, Observable, debounceTime, distinctUntilChanged } from 'rxjs';
import { FETCH_FREQUENCIES } from 'src/app/constants/fetchFrequencies';
import { SpotifyAlbumEntryModel, UserPreferenceSpotifySortModel } from 'src/app/models/localStorageModel';
import { AlbumSortKey, albumSortOptions, calculateSuggestedScore, SortOrder } from 'src/app/pipes/album-sort.pipe';
import { PluralizePipe } from 'src/app/pipes/pluralize.pipe';
import { LastfmService } from 'src/app/services/lastfm.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { SpotifyService } from 'src/app/services/spotify.service';
import { ConnectLastfmComponent } from '../connect-lastfm/connect-lastfm.component';
import { MessageService } from 'src/app/services/message.service';
import { AlbumViewComponent } from '../album-view/album-view.component';

@Component({
  selector: 'app-spotify-album-sort',
  templateUrl: './spotify-album-sort.component.html',
  styleUrls: ['./spotify-album-sort.component.css']
})
export class SpotifyAlbumSortComponent implements AfterViewInit {
  innerWidth: number

  pluralizePipe: PluralizePipe = new PluralizePipe()
  currentYear: number = new Date().getFullYear()

  @HostListener('window:resize', ['$event'])
  onResize(event: { target: { innerWidth: number; } }) {
    this.innerWidth = event.target.innerWidth
  }

  sortPref: UserPreferenceSpotifySortModel
  sortOptions = albumSortOptions

  albumsInitial: SpotifyAlbumEntryModel[] = []
  albums: SpotifyAlbumEntryModel[] = []
  moment = moment


  filterControl: FormControl = new FormControl()

  fetchLoading: boolean
  lastfmFetchLoading: boolean
  lastFetchDate: moment.Moment
  nextFetchDate: moment.Moment
  lastfmLastFetched: moment.Moment
  nextLastfmFetchDate: moment.Moment
  lastfmUsername: string
  lastfmFetchProgress: number = 0
  fetchFrequencies = FETCH_FREQUENCIES
  spotifyFetchProgress: number = 0

  constructor(
    private localStorageService: LocalStorageService,
    private spotifyService: SpotifyService,
    private lastfmService: LastfmService,
    private dialog: MatDialog,
    private messageService: MessageService,
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
        yy: '%dy'
      }
    });

    this.albumsInitial = this.localStorageService.getSpotifySavedAlbums() ? this.localStorageService.getSpotifySavedAlbums().data : []
    this.lastFetchDate = this.localStorageService.getSpotifySavedAlbums()?.fetchedDate ? moment(this.localStorageService.getSpotifySavedAlbums().fetchedDate) : null
    this.nextFetchDate = this.lastFetchDate ? moment(this.lastFetchDate).add(this.fetchFrequencies.spotify.value, this.fetchFrequencies.spotify.unit as any) : null
    this.lastfmLastFetched = this.localStorageService.getSpotifySavedAlbums()?.lastfmLastScanned ? moment.unix(this.localStorageService.getSpotifySavedAlbums().lastfmLastScanned) : null
    this.nextLastfmFetchDate = this.lastfmLastFetched ? moment(this.lastfmLastFetched).add(this.fetchFrequencies.lastfm.value, this.fetchFrequencies.lastfm.unit as any) : null
    this.albums = this.albumsInitial

    this.filterControl.valueChanges.pipe(debounceTime(200), distinctUntilChanged()).subscribe(() => {
      this.albums = this.filterControl.value?.trim()?.length ? 
        this.albumsInitial.filter(x => 
          `${ x.api.album.name } ${ this.formatArtists(x.api.album.artists) }`.toLowerCase().includes(this.filterControl.value.toLowerCase()) ||
          this.filterControl.value === x.api.album.id
        ) : 
        this.albumsInitial
    })

    this.sortPref = this.localStorageService.getUserPreferences().spotifySort
    this.lastfmUsername = this.localStorageService.getLastfmUsername()
    this.lastfmService.fetchProgress.subscribe(value => this.lastfmFetchProgress = value)
    this.spotifyService.fetchProgress.subscribe(value => this.spotifyFetchProgress = value)
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.scrollToHorizontalSortOptions(this.sortPref.sortKey), 200)
  }

  get user(): SpotifyApi.UserObjectPublic { 
    return this.localStorageService.getSpotifyUserDetails()
  }

  get canRefetchLibrary(): boolean {
    return !this.lastFetchDate || (this.lastFetchDate && moment().diff(this.lastFetchDate, this.fetchFrequencies.spotify.unit as any) >= this.fetchFrequencies.spotify.value)
  }

  get canRefetchLastfmData(): boolean {
    return !this.lastfmLastFetched || (this.lastfmLastFetched && moment().diff(this.lastfmLastFetched, this.fetchFrequencies.lastfm.unit as any) >= this.fetchFrequencies.lastfm.value)
  }

  getFetchSpotifyTooltip(): string {
    return this.canRefetchLibrary ? `Re-fetch data now! This can be done every ${this.fetchFrequencies.spotify.value} ${this.fetchFrequencies.spotify.unit}. Last fetched: ${this.lastFetchDate ? `${this.lastFetchDate.format()} - ${this.lastFetchDate.locale('en-US')?.fromNow()}` : 'never'}` : `You may refetch your data every ${this.fetchFrequencies.spotify.value} ${this.fetchFrequencies.spotify.unit}. Next fetch avaiable ${this.nextFetchDate ? 'in ' + moment.duration(this.nextFetchDate.diff(moment())).locale('en-US').humanize(): 'now'}.`
  }

  getFetchLastfmTooltip(): string {
    return this.canRefetchLastfmData ? `Re-fetch Last.fm data now! This can be done every ${this.fetchFrequencies.lastfm.value} ${this.fetchFrequencies.lastfm.unit}. Last fetched: ${this.lastfmLastFetched ? `${this.lastfmLastFetched.format()} - ${this.lastfmLastFetched.locale('en-US')?.fromNow()}` : 'never'}` : `You may refetch your Last.fm data every ${this.fetchFrequencies.lastfm.value} ${this.fetchFrequencies.lastfm.unit}. Next fetch avaiable ${this.nextLastfmFetchDate ? 'in ' + moment.duration(this.nextLastfmFetchDate.diff(moment())).locale('en-US').humanize(): 'now'}.`
  }

  async fetchData() {
    let fullLastfmFetch 
    if (this.lastfmUsername) {
      fullLastfmFetch = confirm("Do a full refresh of Last.fm data (OK=Yes/Cancel=No)? This takes longer and is usually for one-time fixes.")
    }
    if (this.mobileView()) {
      this.messageService.open("Fetching Spotify library. Keep this screen open during the entirely of the fetch!", "center", true)
    }
    this.fetchLoading = true
    await this.spotifyService.getUserAlbums()
    this.fetchLoading = false
    if (this.lastfmUsername) {
      if (this.mobileView()) {
        this.messageService.open("Fetching Last.fm data. Keep this screen open during the entirely of the fetch!", "center", true)
      }
      if (fullLastfmFetch) {
        this.localStorageService.clearLastfmData(false)
      }
      this.lastfmFetchLoading = true
      await this.lastfmService.fetchLastfmDataForSpotifyAlbums()
      this.lastfmFetchLoading = false
    }
    window.location.reload()
  }

  connectLastfm() {
    this.dialog.open(ConnectLastfmComponent)
  }

  openAlbumDialog(album: SpotifyAlbumEntryModel) {
    // build display values for every sort option using existing formatter
    const sortDisplayValues = albumSortOptions
      .filter(opt => opt !== 'Suggested')
      .map(opt => ({
      option: opt,
      value: this.getSortDisplayValue(album, opt as AlbumSortKey)
    }))

    this.dialog.open(AlbumViewComponent, {
      data: {
        album: album,
        sortDisplayValues: sortDisplayValues
      },
      width: this.mobileView() ? '100%' : '350px'
    })
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

  getSortDisplayValue(entry: SpotifyAlbumEntryModel, overrideSortKey?: AlbumSortKey): string {
    const key = overrideSortKey ? overrideSortKey : this.sortPref.sortKey
    switch(key) {
      case "Release Date": return moment(entry.api.album.release_date).format("MM-DD-yyyy")
      case "Duration": return this.formatDuration(entry.custom.duration)
      case "# of Tracks": return this.pluralizePipe.transform(entry.api.album.total_tracks, "track")
      // case "Anniversary": return `${ this.getOrdinal(this.currentYear - moment(entry.api.album.release_date).year()) } • ${ moment(entry.api.album.release_date).format("MMM D") } • ${ moment(entry.api.album.release_date).set("year", this.currentYear).fromNow() }` 
      case "Popularity": return `Score: ${ entry.api.album.popularity }`
      case "Label": return entry.api.album.label
      case "Last Played": return !entry.custom.lastfmLastListened ? "Never / Unknown" : `${moment.unix(entry.custom.lastfmLastListened).format("MM-DD-yyyy")} • ${moment.unix(entry.custom.lastfmLastListened).fromNow()}`
      case "Scrobbles": return !entry.custom.lastfmScrobbles ? "Unknown" : entry.custom.lastfmScrobbles.toLocaleString()
      case "Playthroughs": return !entry.custom.fullPlayThroughs ? "Never / Unknown" : `${entry.custom.fullPlayThroughs}`
      case "Suggested": return !entry.custom.lastfmLastListened ? "Unknown" : `<i class="fas fa-star"></i> ${calculateSuggestedScore(entry).toFixed(1)} • <i class="fas fa-clock"></i> ${moment.unix(entry.custom.lastfmLastListened).fromNow()} • <i class="fas fa-play"></i> ${entry.custom.lastfmScrobbles.toLocaleString()}`
      case "Time b/w Plays": return !entry.custom.averageTimeBetweenPlays ? "Not Enough Data / Unknown" : this.humanizeDurationToHours(Math.abs(entry.custom.averageTimeBetweenPlays))
      default: return moment(entry.api.added_at).format("MM-DD-yyyy hh:mm A")
    }
  }

  getSortDescription(): string {
    switch(this.sortPref.sortKey) { 
      case "Popularity": return `Uses Spotify's score. Your Spotify library is ${ Math.round(this.albums.map(x => x.api.album.popularity).reduce((a, b) => a + b) / this.albums.length) }% mainstream.`
      case "Last Played": return !this.lastfmLastFetched && this.lastfmUsername ? `Not seeing your Last.fm data? Use the fetch button to perform the initial fetch.` : `An album is considered played if you've listened to approximately 3/4ths of it, without too many repeats of the same track, and within a couple days. Pretty straightforward, right? 🙃`
      case "Scrobbles": return !this.lastfmLastFetched && this.lastfmUsername ? `Not seeing your Last.fm data? Use the fetch button to perform the initial fetch.` : null 
      case "Playthroughs": return !this.lastfmLastFetched && this.lastfmUsername ? `Not seeing your Last.fm data? Use the fetch button to perform the initial fetch.` : "Number of times you've listened to this album all the way through." 
      case "Suggested": return !this.lastfmLastFetched && this.lastfmUsername ? `Not seeing your Last.fm data? Use the fetch button to perform the initial fetch.` : "Gives a score that is a healthy balance between your <u>most played</u> albums and <u>albums you haven't listened to in a while</u>. The <u>higher</u> the score, the more suggested the album is."
      // case "Anniversary": return "Shows when the next anniversary for the album is, so you can listen on that day!"
      case "Time b/w Plays": return !this.lastfmLastFetched && this.lastfmUsername ? `Not seeing your Last.fm data? Use the fetch button to perform the initial fetch.` : "The average time between your full plays of this album. One of the few stats that indicates your favorites without relying on play counts!"
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

  /**
   * Humanize a Unix duration (seconds or ms) into
   * years, months, days, hours, minutes — showing at most
   * the 2 most significant non-zero units.
   *
   * Assumptions:
   * - 1 year = 365 days
   * - 1 month = 30 days
   */
  humanizeDurationToHours(unixDuration: number): string {
    let seconds =
      unixDuration > 1e12
        ? Math.floor(unixDuration / 1000)
        : Math.floor(unixDuration);

      const MINUTE = 60;
      const HOUR = 60 * MINUTE;
      const DAY = 24 * HOUR;
      const MONTH = 30 * DAY;
      const YEAR = 365 * DAY;

      const units = [
        { label: 'year',  value: Math.floor(seconds / YEAR) },
        { label: 'month', value: Math.floor((seconds %= YEAR) / MONTH) },
        { label: 'day',   value: Math.floor((seconds %= MONTH) / DAY) },
        { label: 'hour',  value: Math.floor((seconds %= DAY) / HOUR) },
        { label: 'minute', value: Math.floor((seconds %= HOUR) / MINUTE) },
      ];

      const nonZero = units.filter(u => u.value > 0);

      // Keep only the 2 most significant units
      const selected = nonZero.slice(0, 2);

      // Always show at least minutes
      if (selected.length === 0) {
        selected.push({ label: 'minute', value: 0 });
      }

      return selected
        .map(u => `${u.value} ${u.label}${u.value !== 1 ? 's' : ''}`)
        .join(' ');
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

  toggleListView() {
    this.sortPref.listView = !this.sortPref.listView
    this.updateUserPref()
  }

  changeSortKey(option: AlbumSortKey) {
    this.sortPref.sortKey == option ? this.sortPref.sortDesc = !this.sortPref.sortDesc : null
    this.sortPref.sortKey = option
    this.updateUserPref()
  }

  updateUserPref() {
    let userPref = this.localStorageService.getUserPreferences()
    userPref.spotifySort = this.sortPref
    this.localStorageService.setUserPreferences(userPref)
  }

  openSpotifyLink(url: string) {
    window.open(url, "_blank")
  }

  isLastfmSortOption(option: string): boolean {
    return ['Last Played', 'Plays', 'Suggested', 'Playthroughs', 'Time b/w Plays'].includes(option)
  }

  scrollToHorizontalSortOptions(option: string) {
    let el: HTMLElement = document.querySelector(`mat-chip-option[title="${option}"]`)
    const elRight = el.offsetLeft + el.offsetWidth
    const elNextRight = (el.nextSibling as HTMLElement)?.offsetLeft + (el.nextSibling as HTMLElement)?.offsetWidth
    const elLeft = el.offsetLeft
    const elPrevLeft = (el.previousSibling as HTMLElement)?.offsetLeft

    const elParentRight = (el.parentNode as HTMLElement).offsetLeft + (el.parentNode as HTMLElement).offsetWidth
    const elParentLeft = (el.parentNode as HTMLElement).offsetLeft;

    setTimeout(() => {
      // (el.parentNode as HTMLElement).scrollLeft = elLeft - elParentLeft - 20
      // check if right side of the element is not in view
      if (elNextRight > elParentRight + (el.parentNode as HTMLElement).scrollLeft) {
        (el.parentNode as HTMLElement).scrollLeft = elRight - elParentRight + 50
      }
  
      // check if left side of the element is not in view
      else if (elPrevLeft < elParentLeft + (el.parentNode as HTMLElement).scrollLeft) {
        (el.parentNode as HTMLElement).scrollLeft = elLeft - elParentLeft - 50
      }
    }, 500)

  }

  showConnectMessage(option: string) {
    if (!this.lastfmUsername && this.isLastfmSortOption(option)) {
      this.messageService.open("Connect (or create) a Last.fm account to use this sort option!")
    }
  }

  randomAlbumClicked() {
    const randomAlbumId = this.albumsInitial[Math.floor(Math.random() * this.albumsInitial.length)].api.album.id
    this.filterControl.setValue(`${randomAlbumId}`)
  }

  clearFilter() {
    this.filterControl.setValue('')
  }
}
