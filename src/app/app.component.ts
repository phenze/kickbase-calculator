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
  public achievementsDisabled = false;


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

  public marketOverviewPlayers: KickbasePlayer[] = [];

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

  reloadMarket = async (fullRefresh: boolean): Promise<void> => {
    if (this.selectedLeague === null) {
      return;
    }

    this.loadingData = true;

    try {
      if (fullRefresh || this.currentMarket === null) {
        this.currentMarket = await this.apiService.getMarket(
            this.selectedLeague
        );
      }
      if (this.currentMarket === null) {
        return;
      }


      for (const player of this.currentMarket.players) {
        if (this.loadStatsAlways) {
          await player.loadStats(this.selectedLeague, this.apiService);
        }

        player.calcValues();
        player.isDeactivated = true;
        player.calcColors(0);
      }

      this.sortCurrentPlayers();
    } finally {
      this.loadingData = false;
      this.cdRef.detectChanges();
    }
  };


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


  onSelectedLeagueChanged = async (
      newValue: number | null
  ): Promise<void> => {
    this.loadingData = true;
    this.kickbaseGroup = new KickbaseGroup();

    if (newValue === null) {
      this.selectedLeague = null;
      this.currentMarket = null;
      this.currentGift = null;
      this.loadingData = false;
      return;
    }

    this.selectedLeague = newValue;
    this.apiService.setLastLeague(newValue);

    try {
      // Markt der neu ausgewählten Liga laden
      this.currentMarket = await this.apiService.getMarket(newValue);
      this.currentGift = null;

      const league = this.leagues.find(
          item => Number(item.id) === newValue
      );

      if (league === undefined) {
        return;
      }

      this.achievementsDisabled = league.amd ?? false;

      const lineUp = await this.apiService.getLineup(newValue);

      const budget = numeral(league.budget);
      this.minusValue = budget.value() ?? 0;
      this.minusValueString = budget.format('0,0');

      if (this.currentMarket !== null) {
        this.extraAmount = Number(
            this.currentMarket.offerAmountForUser
        );

        const extraAmountNumeral = numeral(this.extraAmount);
        this.extraAmountString = extraAmountNumeral.format('0,0');
      }

      const deletedPlayersStorage = localStorage.getItem(
          `permantDeletedPlayer_${newValue}`
      );

      let permanentlyDeletedPlayers: string[] = [];

      if (deletedPlayersStorage !== null) {
        const parsedDeletedPlayers: unknown =
            JSON.parse(deletedPlayersStorage);

        permanentlyDeletedPlayers = Array.isArray(parsedDeletedPlayers)
            ? parsedDeletedPlayers.map(value => String(value))
            : [];
      }

      this.amountPlayers = 0;

      for (const player of lineUp.players) {
        const marketPlayer = this.currentMarket?.players.find(
            marketItem => marketItem.id === player.id
        );

        if (marketPlayer !== undefined) {
          player.value = marketPlayer.value;
          player.price = marketPlayer.price;
        }

        player.leagueId = newValue;
        player.isPersitantDeleted =
            permanentlyDeletedPlayers.includes(String(player.id));

        this.kickbaseGroup.players.push(player);

        if (player.isPersitantDeleted) {
          this.amountPlayers++;
        }
      }

      // Nur zusätzliche Details laden, wenn aktiviert.
      // Die Marktübersicht wurde bereits vorher aktualisiert.
      if (this.loadStatsAlways) {
        await this.onLoadAllDetails(false);
      }

      this.onIncludeAdditionalAmountChanged();

    } catch (error) {
      console.error('Fehler beim Wechseln der Liga:', error);
    } finally {
      this.loadingData = false;
      this.cdRef.detectChanges();
    }
  };

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
    this.kickbaseGroup.calcValues(
      this.amountValue,
      this.includeMinusMarketValues,
      this.dayUntilFriday,
      this.achievementsDisabled
    );
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
    this.kickbaseGroup.calcValues(
      this.amountValue,
      this.includeMinusMarketValues,
      this.dayUntilFriday,
      this.achievementsDisabled);
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

  sortCurrentPlayers(): void {
    const isMarketOverview =
        this.displayMode === AppComponent.display_mode_market_overview;

    const sourcePlayers = isMarketOverview
        ? this.currentMarket?.players ?? []
        : this.kickbaseGroup.players;

    const playersToSort = [...sourcePlayers];

    if (
        this.selectedSorting === this.sorting_mw_asc ||
        this.selectedSorting === this.sorting_mw_desc
    ) {
      const ascending =
          this.selectedSorting === this.sorting_mw_asc;

      playersToSort.sort((a, b) => {
        if (a.marketValue === b.marketValue) {
          return 0;
        }

        const result =
            a.marketValue < b.marketValue ? -1 : 1;

        return ascending ? result : -result;
      });
    }

    if (
        this.selectedSorting === this.sorting_mw_change_asc ||
        this.selectedSorting === this.sorting_mw_change_desc
    ) {
      const ascending =
          this.selectedSorting === this.sorting_mw_change_asc;

      playersToSort.sort((a, b) => {
        const aChange = a.stats?.realMarketValueChange;
        const bChange = b.stats?.realMarketValueChange;

        if (aChange === undefined || bChange === undefined) {
          return 0;
        }

        if (aChange === bChange) {
          return 0;
        }

        const result = aChange < bChange ? -1 : 1;

        return ascending ? result : -result;
      });
    }

    if (this.selectedSorting === this.sorting_default) {
      playersToSort.sort((a, b) => {
        const aIsUserPlayer = a.username.length > 0;
        const bIsUserPlayer = b.username.length > 0;

        // 1. Spieler von Mitspielern nach hinten stellen
        if (aIsUserPlayer && !bIsUserPlayer) {
          return 1; // 'a' kommt nach 'b'
        }
        if (!aIsUserPlayer && bIsUserPlayer) {
          return -1; // 'a' kommt vor 'b'
        }

        // Falls Mitspieler-Spieler zuerst kommen sollen, kehre die Returns oben um (-1 statt 1 / 1 statt -1)

        // 2. Innerhalb derselben Gruppe nach Ablaufzeit (expiry) aufsteigend sortieren
        const aExpiry = a.expiry ?? Number.MAX_SAFE_INTEGER;
        const bExpiry = b.expiry ?? Number.MAX_SAFE_INTEGER;

        if (aExpiry === bExpiry) {
          return 0;
        }

        return aExpiry > bExpiry ? 1 : -1;
      });
    }

    if (isMarketOverview) {
      this.marketOverviewPlayers = playersToSort;
    } else {
      this.kickbaseGroup.players = playersToSort;
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

  switchDisplay = async (displayMode: string): Promise<void> => {
    this.displayMode = displayMode;
    this.apiService.setLastDisplay(this.displayMode);

    if (displayMode === AppComponent.display_mode_market_overview) {
      this.selectedSorting = this.sorting_default;

      await this.reloadMarket(true);
    }
  };

}
