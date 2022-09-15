import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';

import { ApiService } from './services/api.service';

import * as numeral from 'numeral';
import 'numeral/locales/de'
import * as moment from 'moment';

import { KickbaseGroup } from './model/kickbase-group';
import { KickbasePlayer } from './model/kickbase-player';

import { KickbaseLeague } from './model/kickbase-league';
import { KickbaseMarket } from './model/kickbase-market';
import { KickbaseGift } from './model/kickbase-gift';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ModalComponent } from './components/modal/modal.component';
import { KickbasePlayerStats } from './model/kickbase-player-stats';
import { NgbTypeahead, NgbTypeaheadSelectItemEvent } from './typeahead/typeahead';
import { merge, Observable, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, switchMap } from 'rxjs/operators';
import { LocalApiService } from './services/local-api.service';
import { MarketOverviewComponent } from './components/market-overview/market-overview.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'app';

  bsModalRef: BsModalRef;

  public AppComponent = AppComponent;
  public minusValue: number = 0;
  public minusValueString: string = '0';
  public availableAmountString: string = '0';
  public amountPlayers: number = 0;
  public includeAdditionalAmount = false;
  public includeMinusMarketValues = false;
  public showPermanentDeletedPlayers = true;
  public printMode = false;

  public loadingLigaInsiderStats = false;
  // public token = ""

  public leagues: KickbaseLeague[];
  public currentMarket: KickbaseMarket = null;
  public currentGift: KickbaseGift = null;
  public selectedLeague: number;


  public readonly sorting_default = -1;
  public readonly sorting_mw_desc = 1;
  public readonly sorting_mw_asc = 2;
  public readonly sorting_mw_change_asc = 3;
  public readonly sorting_mw_change_desc = 4;

  public selectedSorting: number = -1;

  // public groups: KickbaseGroup[];


  public newplayername: string;
  public newplayeramount: number;

  public kickbaseGroup = new KickbaseGroup();


  public static readonly display_mode_calculator = 'calculator';
  public static readonly display_mode_market_overview = 'marketOverview';
  public displayMode = AppComponent.display_mode_calculator;

  public extraAmount = 0;
  public extraAmountString = '0';
  public amountValue = 0;

  public withoutApi = false;

  public dayUntilFriday = 0;
  public fridayDate = new Date();

  @ViewChild(MarketOverviewComponent, { static: false })
  marketOverviewComponent: MarketOverviewComponent;

  @ViewChild('instance') instance: NgbTypeahead;
  focus$ = new Subject<string>();
  click$ = new Subject<string>();

  @ViewChild('auto') auto;

  constructor(
    public apiService: ApiService,
    private modalService: BsModalService,
    public cdRef: ChangeDetectorRef,
    public localApiService: LocalApiService) {
    numeral.locale("de");
    moment.locale("de");
  }

  searchForPlayer = (text$: Observable<string>) => {


    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.click$.pipe(filter(() => !this.instance.isPopupOpen()));
    const inputFocus$ = this.focus$;

    return merge(debouncedText$, clicksWithClosedPopup$).pipe(
      filter((term: string) => {
        if (term.length === 0) {
          return false;
        } else {
          return true;
        }
      }),
      map((term: string) => {
        // because switch map will cancel all previous request
        // we just send our own "DEADBEEF" request before and after switching to search view
        // so all pending typeaheads are canceled and not shown to the user
        if (term === 'DEADBEEF') {
          return [];
        }
        const player = this.localApiService.offlinePlayers.filter(v => v.name.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10);
        return player;
      }
      )
    );
  }

  onTypeAheadSelected(event: NgbTypeaheadSelectItemEvent) {
    console.log(event.item);
    // this.newplayername = event.item.name;
    // this.newplayeramount = event.item.value;

    const player = (event.item as KickbasePlayer).copy('');
    this.kickbaseGroup.players.push(player);
    this.saveLocalPlayers();
    this.kickbaseGroup.calcValues(this.amountValue, this.includeMinusMarketValues, this.dayUntilFriday);
    this.newplayername = '';
  }

  typeaheadFormatter(player: KickbasePlayer) {
    return player.name;
  }

  selectEvent(item) {
    // do something with selected item
    console.log(item);
    const player = this.localApiService.offlinePlayers.find(t => t.nameHash === item.id).copy('');
    this.kickbaseGroup.players.push(player);
    this.saveLocalPlayers();
    this.kickbaseGroup.calcValues(this.amountValue, this.includeMinusMarketValues, this.dayUntilFriday);
    this.newplayername = '';
    this.auto.clear();
  }

  onChangeSearch(val: string) {
    // fetch remote data from here
    // And reassign the 'data' which is binded to 'data' property.
  }

  onFocused(e) {
    // do something when input is focused
  }

  ngAfterViewInit() {

  }

  ngOnInit() {
    let sorting = localStorage.getItem('sorting');
    if (sorting !== null && sorting !== undefined) {
      this.selectedSorting = Number.parseInt(sorting);
    }

    if (this.apiService.data !== null) {
      // old style
      this.displayMode = AppComponent.display_mode_calculator;
      if (this.apiService.data.loggedInWithoutApi) {
        this.withoutApi = true;
        this.loadLocalData()
      }
    }

    if (this.apiService.isLoggedIn && !this.withoutApi) {
      this.loadLeagues();
    }
    this.displayMode = AppComponent.display_mode_calculator;


    let date = moment();
    let dow = date.day();
    if (dow === 6) {
      this.dayUntilFriday = 6;
    } else {
      this.dayUntilFriday = Math.abs(5 - dow);
    }
    this.fridayDate = moment().add(this.dayUntilFriday, 'days').toDate();

    let hod = date.hour();
    if (hod >= 22 && dow !== 5) {
      this.dayUntilFriday--;
    } else if (hod >= 22 && dow === 5) {
      this.dayUntilFriday = 7;
      this.fridayDate = moment().add(this.dayUntilFriday, 'days').toDate();
    }
  }

  loadLocalDataForApi = async () => {
    this.loadingLigaInsiderStats = true;
    await this.localApiService.refreshLocalMarketValues();
    this.loadingLigaInsiderStats = false;
  }

  loadLocalData = async () => {
    this.loadingLigaInsiderStats = true;
    this.kickbaseGroup = new KickbaseGroup();
    await this.localApiService.refreshLocalMarketValues();
    const minusValueTmp = localStorage.getItem('minusValue');
    if (minusValueTmp !== null && minusValueTmp !== undefined) {

      let di = numeral(minusValueTmp);
      this.minusValue = di.value();
      this.minusValueString = di.format('0,0');
      this.onIncludeAdditionalAmountChanged();
    }



    let playersJson = localStorage.getItem('players');
    if (playersJson !== null && playersJson !== undefined) {
      const players = JSON.parse(playersJson);

      for (const json of players) {

        let player = new KickbasePlayer(null, '');
        player.name = json['name'];
        player.nameHash = json['nameHash'];
        if (player.nameHash === undefined) {
          player.nameHash = '';
        }
        player.value = Number(json['value']);
        player.marketValue = Number(json['marketValue']);
        player.stats = new KickbasePlayerStats(null);
        player.stats.realMarketValueChange = Number(json['realMarketValueChange'])
        this.localApiService.updateMarketValue(player);
        this.kickbaseGroup.players.push(player);
      }
    }
    this.kickbaseGroup.calcValues(this.amountValue, this.includeMinusMarketValues, this.dayUntilFriday);
    this.saveLocalPlayers();
    this.loadingLigaInsiderStats = false;

    // TODO: refresh market values
  }


  reload() {
    if (this.withoutApi) {
      this.loadLocalData();
    } else {
      this.loadLeagues();
    }
  }

  async login(payload) {
    console.log(payload.username);
    this.withoutApi = true;
    if (payload.username.length > 0 && payload.password.length > 0) {
      try {
        let result = await this.apiService.getToken(payload.username, payload.password);
        if (!result) {
          alert('Bitte Username und Passwort überprüfen')
        } else {
          this.withoutApi = false;
          this.displayMode = AppComponent.display_mode_calculator;
          this.loadLeagues();
        }
      } catch {
        alert('Bitte Username und Passwort überprüfen')
      }
    } else {
      alert('Bitte USername und Password angeben')
    }

  }

  loadLeagues() {
    this.withoutApi = false;
    this.apiService.getLeagues().then(
      leagues => {
        this.leagues = leagues;
        if (this.leagues.length > 0) {
          if (this.apiService.data.lastLeagueId !== -1 && this.apiService.data.lastLeagueId !== undefined) {
            this.selectedLeague = this.apiService.data.lastLeagueId;
            this.onSelectedLeagueChanged(this.apiService.data.lastLeagueId);
          } else {
            this.selectedLeague = leagues[0].id;
            this.onSelectedLeagueChanged(leagues[0].id);
          }
        }
        console.log(leagues)

      }
    ).catch(error => {
      console.log(error)
    });
  }


  onSelectedLeagueChanged = async (newValue) => {

    this.kickbaseGroup = new KickbaseGroup();
    if (newValue == "null") {
      this.selectedLeague = null;
    }
    this.apiService.setLastLeague(this.selectedLeague);
    try {
      this.currentMarket = await this.apiService.getMarket(this.selectedLeague);
      console.log(this.currentMarket);
      this.currentGift = await this.apiService.getGiftStatus(this.selectedLeague);
      let league = this.leagues.find(t => t.id == this.selectedLeague);
      let lineUp = await this.apiService.getLineup(this.selectedLeague);

      let di = numeral(league.budget);
      this.minusValue = di.value();
      this.minusValueString = di.format('0,0');
      if (this.currentMarket !== null) {
        this.extraAmount = Number(this.currentMarket.offerAmountForUser);
        let di = numeral(this.extraAmount);
        this.extraAmountString = di.format('0,0');
      }
      const permantDeletedPlayerLocal = localStorage.getItem('permantDeletedPlayer_' + this.selectedLeague.toString());
      let permantDeletedPlayers = new Array();
      if (permantDeletedPlayerLocal !== null) {
        permantDeletedPlayers = JSON.parse(permantDeletedPlayerLocal)
      }
      this.amountPlayers = 0
      for (let p of lineUp.players) {
        let marketPLayer = this.currentMarket.players.find(tmp => tmp.id == p.id)
        if (marketPLayer != null) {
          p.value = marketPLayer.value
          p.price = marketPLayer.price;
        }
        p.leagueId = this.selectedLeague;
        p.isPersitantDeleted = permantDeletedPlayers.findIndex(t => t === p.id.toString()) !== -1;
        this.kickbaseGroup.players.push(p)
        if (p.isPersitantDeleted) {
          this.amountPlayers++
        }
      }
      this.onIncludeAdditionalAmountChanged();
      this.cdRef.detectChanges();
      if (this.marketOverviewComponent !== undefined) {
        this.marketOverviewComponent.selectedLeague = this.selectedLeague;
        this.marketOverviewComponent.setCurrentMarket(this.currentMarket);
      }
    } catch (error) {
      console.log(error)
    }
  }

  onAmountChange(newValue) {
    console.log(newValue)
  }


  onLoadAllDetails = async () => {
    for (let pl of this.kickbaseGroup.players) {
      await pl.loadStats(this.selectedLeague, this.apiService);
    }
    this.refreshGroups();
  }


  onLoadAllDetailsForPlayer = async (player: KickbasePlayer) => {
    if (player.isInEditMode) {
      return;
    }
    if (this.withoutApi) {
      this.onDeactivatePlayer(player);
      return;
    }
    if (player.stats === null) {
      await player.loadStats(this.selectedLeague, this.apiService);
      this.refreshGroups();
    } else {
      this.onDeactivatePlayer(player);
    }
  }

  onPlayerValueChanged(player: KickbasePlayer) {
    if (player.isPersitantDeleted) {
      this.amountPlayers++
    } else {
      this.amountPlayers--
    }
    this.kickbaseGroup.calcValues(this.amountValue, this.includeMinusMarketValues, this.dayUntilFriday);
  }



  onMinusValueChanged(value) {
    try {
      let di = numeral(value);
      this.minusValue = di.value();
      this.minusValueString = di.format('0,0');
      if (this.withoutApi) {
        localStorage.setItem('minusValue', this.minusValue.toString())
      }
      this.onIncludeAdditionalAmountChanged();
    } catch {

    }
  }

  onIncludeAdditionalAmountChanged() {
    if (this.includeAdditionalAmount) {
      this.amountValue = Number(this.minusValue) - Number(this.extraAmount);
    } else {
      this.amountValue = Number(this.minusValue);
    }
    this.refreshGroups();
  }

  onExtraAmountChange(event) {
    try {
      let di = numeral(event);
      this.extraAmount = di.value();
      this.extraAmountString = di.format('0,0');
      this.onIncludeAdditionalAmountChanged();
    } catch {

    }


  }

  saveLocalPlayers() {
    if (!this.withoutApi) {
      return;
    }
    const test = [];
    for (const pl of this.kickbaseGroup.players) {
      test.push(pl.toJSON());
    }
    const string = JSON.stringify(test);
    localStorage.setItem('players', string)
  }


  onAddPlayer() {
    let player = new KickbasePlayer(null, this.apiService.userID);
    player.name = this.newplayername;
    player.value = Number(this.newplayeramount);

    this.kickbaseGroup.players.push(player)
    this.refreshGroups();
    this.newplayeramount = 0;
    this.newplayername = "";

    if (this.withoutApi) {
      this.saveLocalPlayers();
    }
  }

  onRemovePlayer(player: KickbasePlayer) {
    if (this.withoutApi) {
      let index = this.kickbaseGroup.players.findIndex(p => p.name == player.name);
      this.kickbaseGroup.players.splice(index, 1);
      this.saveLocalPlayers();
    } else {
      let index = this.kickbaseGroup.players.find(p => p.name == player.name);
      index.isDeleted = true;
      if (!player.isPersitantDeleted) {
        this.amountPlayers++
      }
    }
    this.refreshGroups();
  }

  onDeactivatePlayer(player: KickbasePlayer) {
    console.log(player.isDeactivated)
    if (!player.isPersitantDeleted) {
      if (player.isDeactivated) {
        this.amountPlayers--
      } else {
        this.amountPlayers++
      }

    }
    player.isDeactivated = !player.isDeactivated;
    this.refreshGroups();
  }

  refreshGroups() {
    this.kickbaseGroup.calcValues(this.amountValue, this.includeMinusMarketValues, this.dayUntilFriday);
    this.sortCurrentPlayers();
  }

  getGift = async () => {
    try {
      await this.apiService.collectGift(this.selectedLeague);
      this.reload();
    } catch (error) {
      console.log('cannot collect gift');
      console.log(error);
      const initialState = {
        list: [
          JSON.stringify(error)
        ],
        title: 'Geschenk bereits erhalten'
      };
      this.bsModalRef = this.modalService.show(ModalComponent, { initialState });
      this.bsModalRef.content.closeBtnName = 'Close';
    }
  }



  errorHandler(event) {
    console.debug(event);
    event.target.src = "https://cdn.browshot.com/static/images/not-found.png";
  }

  loginWithoutAPI() {
    this.kickbaseGroup = new KickbaseGroup();
    this.withoutApi = true;
    this.apiService.loginWithoutApi();
    this.minusValue = 0;
    this.loadLocalData();
  }

  logout() {
    this.apiService.logout();
    this.newplayername = '';
    this.kickbaseGroup = new KickbaseGroup();
  }

  onSelectedSortingChanged(sorting: number) {
    localStorage.setItem('sorting', sorting.toString());

    this.sortCurrentPlayers();
  }

  sortCurrentPlayers() {
    if (this.selectedSorting == this.sorting_mw_asc || this.selectedSorting == this.sorting_mw_desc) {
      const isAsc = this.selectedSorting == this.sorting_mw_asc;
      this.kickbaseGroup.players.sort((a, b) => {
        if (a.marketValue > b.marketValue) {
          return isAsc ? 1 : -1;
        } else if (a.marketValue < b.marketValue) {
          return isAsc ? -1 : 1;
        } else {
          return 0;
        }
      });

    }

    if (this.selectedSorting == this.sorting_mw_change_asc || this.selectedSorting == this.sorting_mw_change_desc) {
      const isAsc = this.selectedSorting == this.sorting_mw_change_asc;
      this.kickbaseGroup.players.sort((a, b) => {
        if (a.stats !== null && b.stats !== null) {
          if (a.stats.realMarketValueChange > b.stats.realMarketValueChange) {
            return isAsc ? -1 : 1;
          } else if (a.stats.realMarketValueChange < b.stats.realMarketValueChange) {
            return isAsc ? 1 : -1;
          } else {
            return 0;
          }
        } else {
          return 0;
        }
      });

    }
  }

  setPrintMode() {
    this.printMode = !this.printMode;
  }

  onFridayDateChanged(countDays: string) {
    const intValue = Number.parseInt(countDays);
    if (!isNaN(intValue)) {

      console.log(intValue);

      this.dayUntilFriday = Number.parseInt(countDays);
      this.fridayDate = moment().add(this.dayUntilFriday, 'days').toDate();
      this.refreshGroups();
    }
  }

  showPlayer(player: KickbasePlayer) {
    if (player.isDeleted) {
      return false;
    }
    if (player.isPersitantDeleted) {
      return this.showPermanentDeletedPlayers;
    }
    return true;
  }

  switchDisplay(displayMode) {
    this.displayMode = displayMode;
    this.apiService.setLastDisplay(this.displayMode);

    if (displayMode === AppComponent.display_mode_market_overview) {
      this.cdRef.detectChanges();
      if (this.marketOverviewComponent !== undefined) {
        this.marketOverviewComponent.selectedLeague = this.selectedLeague;
        this.marketOverviewComponent.setCurrentMarket(this.currentMarket);
      }
    }


  }



}
