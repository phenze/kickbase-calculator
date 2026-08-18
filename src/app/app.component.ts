import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';

import { ApiService } from './services/api.service';

import numeral from 'numeral';
import 'numeral/locales/de'

import { KickbaseGroup } from './model/kickbase-group';
import { KickbasePlayer } from './model/kickbase-player';

import { KickbaseLeague } from './model/kickbase-league';
import { KickbaseMarket } from './model/kickbase-market';
import { KickbaseGift } from './model/kickbase-gift';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ModalComponent } from './components/modal/modal.component';
import { MarketOverviewComponent } from './components/market-overview/market-overview.component';
import { LoginPayload } from './components/login/login.component';

interface PayPalDonationButton {
  render(selector: string): void;
}

interface PayPalNamespace {
  Donation?: {
    Button: new (options: {
      env: string;
      hosted_button_id: string;
      image: {
        src: string;
        alt: string;
        title: string;
      };
    }) => PayPalDonationButton;
  };
}

declare global {
  interface Window { PayPal?: PayPalNamespace; }
}

window.PayPal = window.PayPal || {};

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'app';

  bsModalRef: BsModalRef | undefined;

  public AppComponent = AppComponent;
  public minusValue: number = 0;
  public minusValueString: string = '0';
  public availableAmountString: string = '0';
  public amountPlayers: number = 0;
  public offerOffset: string = '0';
  public includeAdditionalAmount = false;
  public loadStatsAlways = true;
  public includeMinusMarketValues = false;
  public showPermanentDeletedPlayers = true;
  public printMode = false;
  public doLogin = false;

  public loadingData = false;
  public loadingAllDetailsManual = false;
  // public token = ""

  public leagues: KickbaseLeague[] = [];
  public currentMarket: KickbaseMarket | null = null;
  public currentGift: KickbaseGift | null = null;
  public selectedLeague: number | null = null;


  public readonly sorting_default = -1;
  public readonly sorting_mw_desc = 1;
  public readonly sorting_mw_asc = 2;
  public readonly sorting_mw_change_asc = 3;
  public readonly sorting_mw_change_desc = 4;

  public selectedSorting: number = -1;

  // public groups: KickbaseGroup[];


  public newplayername = '';
  public newplayeramount = 0;

  public kickbaseGroup = new KickbaseGroup();


  public static readonly display_mode_calculator = 'calculator';
  public static readonly display_mode_market_overview = 'marketOverview';
  public displayMode = AppComponent.display_mode_calculator;

  public extraAmount = 0;
  public extraAmountString = '0';
  public amountValue = 0;

  public dayUntilFriday = 0;
  public fridayDate = new Date();

  @ViewChild(MarketOverviewComponent, { static: false })
  marketOverviewComponent?: MarketOverviewComponent;

  constructor(
    public apiService: ApiService,
    private modalService: BsModalService,
    public cdRef: ChangeDetectorRef) {
    numeral.locale("de");
  }


  ngAfterViewInit() {
    this.createPayPalButton();
  }

  ngOnInit() {
    let sorting = localStorage.getItem('sorting');
    if (sorting !== null && sorting !== undefined) {
      this.selectedSorting = Number.parseInt(sorting);
    }

    const loadStatsAlwaysTmp = localStorage.getItem('loadStatsAlways');
    if (loadStatsAlwaysTmp !== null && loadStatsAlwaysTmp !== undefined) {
      this.loadStatsAlways = loadStatsAlwaysTmp === 'true' ? true : false;
    }

    const offerOffsetTmp = localStorage.getItem('offerOffset');
    if (offerOffsetTmp !== null && offerOffsetTmp !== undefined) {
      this.offerOffset = offerOffsetTmp;
    }

    if (this.apiService.data !== null) {
      // old style
      this.displayMode = AppComponent.display_mode_calculator;
    }

    if (this.apiService.isLoggedIn) {
      this.loadLeagues();
    }
    this.displayMode = AppComponent.display_mode_calculator;


    const date = new Date();
    const dow = date.getDay();
    if (dow === 6) {
      this.dayUntilFriday = 6;
    } else {
      this.dayUntilFriday = Math.abs(5 - dow);
    }
    this.fridayDate = this.addDays(new Date(), this.dayUntilFriday);

    const hod = date.getHours();
    if (hod >= 22 && dow !== 5) {
      this.dayUntilFriday--;
    } else if (hod >= 22 && dow === 5) {
      this.dayUntilFriday = 7;
      this.fridayDate = this.addDays(new Date(), this.dayUntilFriday);
    }

  }

  createPayPalButton() {
    const donationButton = window.PayPal?.Donation?.Button;
    if (donationButton === undefined) {
      return;
    }
    const donateButton = new donationButton({
      env: 'production',
      hosted_button_id: 'XV5QAMT6RUMB8',
      image: {
        src: 'https://www.paypalobjects.com/de_DE/DE/i/btn/btn_donate_LG.gif',
        alt: 'Spenden mit dem PayPal-Button',
        title: 'PayPal - The safer, easier way to pay online!',
      }
    });
    donateButton.render('#donate-button')
  }



  reloadMarket = async (fullRefresh: boolean) => {
    if (this.selectedLeague === null) {
      return;
    }
    this.loadingData = true;
    if (fullRefresh) {
      this.currentMarket = await this.apiService.getMarket(this.selectedLeague);
    }
    if (this.currentMarket === null) {
      this.loadingData = false;
      return;
    }
    for (let pl of this.currentMarket.players) {
      if (this.loadStatsAlways) {
        await pl.loadStats(this.selectedLeague, this.apiService);
      }
      pl.calcValues();
      pl.isDeactivated = true;
      pl.calcColors(0);
    }
    this.loadingData = false;
    this.cdRef.detectChanges();
    if (this.marketOverviewComponent !== undefined) {
      this.marketOverviewComponent.selectedLeague = this.selectedLeague
      this.marketOverviewComponent.setCurrentMarket(this.currentMarket);
    }
    this.sortCurrentPlayers();
  }


  reload() {
    this.loadLeagues();
  }

  async login(payload: LoginPayload) {
    if (payload.username.length > 0 && payload.password.length > 0) {
      try {
        this.doLogin = true;
        let result = await this.apiService.getToken(payload.username, payload.password);
        if (!result) {
          alert('Bitte Username und Passwort überprüfen')
        } else {
          this.displayMode = AppComponent.display_mode_calculator;
          this.loadLeagues();
        }
        this.doLogin = false;
      } catch {
        alert('Bitte Username und Passwort überprüfen')
        this.doLogin = false;
      }
    } else {
      alert('Bitte Username und Password angeben')
      this.doLogin = false;
    }

  }

  loadLeagues = async () => {
    await this.apiService.getLeagues().then(
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

      }
    ).catch(error => {
      console.log(error)
    });
  }


  onSelectedLeagueChanged = async (newValue: number | string | null) => {
    this.loadingData = true;
    this.kickbaseGroup = new KickbaseGroup();
    if (newValue === 'null' || newValue === null) {
      this.selectedLeague = null;
      this.loadingData = false;
      return;
    }
    this.selectedLeague = typeof newValue === 'number' ? newValue : Number.parseInt(newValue, 10);
    this.apiService.setLastLeague(this.selectedLeague);
    try {
      this.currentMarket = await this.apiService.getMarket(this.selectedLeague);
      this.currentGift = null;// await this.apiService.getGiftStatus(this.selectedLeague);
      const league = this.leagues.find(t => t.id == this.selectedLeague);
      if (league === undefined) {
        this.loadingData = false;
        return;
      }
      const lineUp = await this.apiService.getLineup(this.selectedLeague);

      const di = numeral(league.budget);
      this.minusValue = di.value() ?? 0;
      this.minusValueString = di.format('0,0');
      if (this.currentMarket !== null) {
        this.extraAmount = Number(this.currentMarket.offerAmountForUser);
        const extraAmountNumeral = numeral(this.extraAmount);
        this.extraAmountString = extraAmountNumeral.format('0,0');
      }
      const permantDeletedPlayerLocal = localStorage.getItem('permantDeletedPlayer_' + this.selectedLeague.toString());
      let permantDeletedPlayers: string[] = [];
      if (permantDeletedPlayerLocal !== null) {
        const parsedDeletedPlayers = JSON.parse(permantDeletedPlayerLocal) as unknown;
        permantDeletedPlayers = Array.isArray(parsedDeletedPlayers) ? parsedDeletedPlayers.map(value => String(value)) : [];
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
      if (this.loadStatsAlways) {
        await this.onLoadAllDetails(false);
      }
      this.onIncludeAdditionalAmountChanged();
      this.loadingData = false;
      this.cdRef.detectChanges();
      if (this.marketOverviewComponent !== undefined) {
        this.marketOverviewComponent.selectedLeague = this.selectedLeague;
        this.marketOverviewComponent.setCurrentMarket(this.currentMarket);
      }
    } catch (error) {
      console.log(error)
      this.loadingData = false;
    }
  }

  onAmountChange(newValue: number | string) {
    console.log(newValue)
  }


  onLoadAllDetails = async (refresh: boolean) => {
    if (this.selectedLeague === null) {
      return;
    }
    this.loadingAllDetailsManual = true;
    if (this.displayMode === AppComponent.display_mode_market_overview) {
      if (this.currentMarket === null) {
        this.loadingAllDetailsManual = false;
        return;
      }
      for (let pl of this.currentMarket.players) {
        await pl.loadStats(this.selectedLeague, this.apiService);
        if (refresh) {
          pl.calcValues();
          pl.isDeactivated = true;
          pl.calcColors(0);
        }
      }
    } else {
      for (let pl of this.kickbaseGroup.players) {
        await pl.loadStats(this.selectedLeague, this.apiService);
        if (refresh) {
          this.refreshGroups();
        }
      }
    }
    this.loadingAllDetailsManual = false;
  }


  onLoadAllDetailsForPlayer = async (player: KickbasePlayer) => {
    if (this.selectedLeague === null) {
      return;
    }
    if (player.isInEditMode) {
      return;
    }

    if (player.stats === null) {
      await player.loadStats(this.selectedLeague, this.apiService);
      player.calcValues();
      player.calcColors(0);
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



  onMinusValueChanged(value: number | string) {
    try {
      const di = numeral(value);
      this.minusValue = di.value() ?? 0;
      this.minusValueString = di.format('0,0');
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

  onLoadStatsAlwaysChanged() {
    localStorage.setItem('loadStatsAlways', this.loadStatsAlways.toString())
  }

  onExtraAmountChange(event: number | string) {
    try {
      const di = numeral(event);
      this.extraAmount = di.value() ?? 0;
      this.extraAmountString = di.format('0,0');
      this.onIncludeAdditionalAmountChanged();
    } catch {

    }


  }

  onOfferOffsetChange(event: string) {
    try {
      const value: string = event;
      this.offerOffset = value.replace(',', '.');
      localStorage.setItem('offerOffset', this.offerOffset.toString());
      this.kickbaseGroup.calcColors(this.amountValue);
    } catch {

    }


  }




  onAddPlayer() {
    let player = new KickbasePlayer(null, this.apiService.userID);
    player.name = this.newplayername;
    player.value = Number(this.newplayeramount);

    this.kickbaseGroup.players.push(player)
    this.refreshGroups();
    this.newplayeramount = 0;
    this.newplayername = "";

  }

  onRemovePlayer(player: KickbasePlayer) {
    const index = this.kickbaseGroup.players.find(p => p.name == player.name);
    if (index === undefined) {
      return;
    }
    index.isDeleted = true;
    if (!player.isPersitantDeleted) {
      this.amountPlayers++
    }
    this.refreshGroups();
  }

  onDeactivatePlayer(player: KickbasePlayer) {
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
    if (this.selectedLeague === null) {
      return;
    }
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



  errorHandler(event: Event) {
    console.debug(event);
    const target = event.target as HTMLImageElement | null;
    if (target !== null) {
      target.src = "https://cdn.browshot.com/static/images/not-found.png";
    }
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
    let playersToSort = this.kickbaseGroup.players;
    if (this.displayMode === AppComponent.display_mode_market_overview && this.marketOverviewComponent?.currentMarket !== null && this.marketOverviewComponent?.currentMarket !== undefined) {
      playersToSort = this.marketOverviewComponent.currentMarket.players;
    }
    if (this.selectedSorting == this.sorting_mw_asc || this.selectedSorting == this.sorting_mw_desc) {
      const isAsc = this.selectedSorting == this.sorting_mw_asc;
      playersToSort.sort((a, b) => {
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
      playersToSort.sort((a, b) => {
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
    if (this.selectedSorting == this.sorting_default) {
      playersToSort.sort((a, b) => {
        if (a.expiry === b.expiry) {
          return 0;
        }
        return a.expiry > b.expiry ? 1 : -1;
      });

    }
    if (this.displayMode === AppComponent.display_mode_market_overview) {
      this.marketOverviewComponent?.setSortedPlayers(playersToSort);
    }
  }

  setPrintMode() {
    this.printMode = !this.printMode;
  }

  onFridayDateChanged(countDays: string) {
    const intValue = Number.parseInt(countDays);
    if (!isNaN(intValue)) {

      this.dayUntilFriday = Number.parseInt(countDays);
      this.fridayDate = this.addDays(new Date(), this.dayUntilFriday);
      this.refreshGroups();
    }
  }

  private addDays(baseDate: Date, days: number): Date {
    const updatedDate = new Date(baseDate);
    updatedDate.setDate(updatedDate.getDate() + days);
    return updatedDate;
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

  switchDisplay = async (displayMode: string) => {
    this.displayMode = displayMode;
    this.apiService.setLastDisplay(this.displayMode);

    if (displayMode === AppComponent.display_mode_market_overview) {
      this.selectedSorting = this.sorting_default;
      await this.reloadMarket(false);
    }

  }



}
