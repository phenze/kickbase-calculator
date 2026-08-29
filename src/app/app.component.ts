import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  ChangeDetectionStrategy,
  TemplateRef,
  inject,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from './core/services/api.service';

import { HelpComponent } from './features/help/help.component';
import { MarketOverviewComponent } from './features/market-overview/market-overview.component';
import { PlayerItemComponent } from './shared/components/player-item/player-item.component';
import { ThemeToggleComponent } from './shared/components/theme-toggle/theme-toggle.component';
import { FormattedNumberDirective } from './shared/directives/formatted-number.directive';
import { EuroPipe } from './shared/pipes/euro.pipe';

import { DisplayMode } from './core/models/display-mode';
import { SortMode } from './core/models/sort-mode';
import { ChangelogService } from './core/services/changelog.service';
import {
  readBooleanSetting,
  readNumberSetting,
  readStringSetting,
  writeSetting,
} from './core/utils/local-storage';
import { addDays, calculateMatchdayCountdown } from './core/utils/matchday';
import { sortPlayers } from './core/utils/player-sorting';
import { KickbaseGroup } from './core/models/kickbase-group';
import { KickbasePlayer } from './core/models/kickbase-player';
import { KickbaseLeague } from './core/models/kickbase-league';
import { KickbaseMarket } from './core/models/kickbase-market';
import { KickbaseGift } from './core/models/kickbase-gift';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ModalComponent } from './shared/components/modal/modal.component';
import { LoginComponent, LoginPayload } from './features/login/login.component';
import { UpdateService } from './core/services/update.service';
import { ErrorService } from './core/services/error.service';

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
  interface Window {
    PayPal?: PayPalNamespace;
  }
}

window.PayPal = window.PayPal || {};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    DatePipe,
    FormsModule,
    FormattedNumberDirective,
    EuroPipe,
    HelpComponent,
    LoginComponent,
    MarketOverviewComponent,
    PlayerItemComponent,
    ThemeToggleComponent,
  ],
})
export class AppComponent implements OnInit, AfterViewInit {
  bsModalRef: BsModalRef | undefined;

  protected readonly DisplayMode = DisplayMode;
  public minusValue: number = 0;
  public offerOffset: string = '0';
  public includeAdditionalAmount = false;
  public loadStatsAlways = true;
  public keepPlayersInitially = false;
  public includeMinusMarketValues = false;
  public showPermanentDeletedPlayers = true;
  public printMode = false;
  public doLogin = false;

  public loadingData = false;
  public loadingAllDetailsManual = false;

  public leagues: KickbaseLeague[] = [];
  public currentMarket: KickbaseMarket | null = null;
  public currentGift: KickbaseGift | null = null;
  public selectedLeague: number | null = null;
  public achievementsDisabled = false;
  public includeAchievements = true;

  protected readonly SortMode = SortMode;
  public selectedSorting: number = SortMode.default;

  public isGroupedView: boolean = true;
  public isCardExpanded: boolean = true;

  public kickbaseGroup = new KickbaseGroup();

  public displayMode: DisplayMode = DisplayMode.calculator;

  public extraAmount = 0;
  public amountValue = 0;

  public dayUntilFriday = 0;
  public fridayDate = new Date();

  public marketOverviewPlayers: KickbasePlayer[] = [];

  public readonly currentVersion = '6.7.2';
  public changelogHtml: string = '';
  public isLoadingChangelog: boolean = false;

  public readonly apiService = inject(ApiService);
  public readonly cdRef = inject(ChangeDetectorRef);
  public readonly updateService = inject(UpdateService);
  public readonly errorService = inject(ErrorService);
  private readonly modalService = inject(BsModalService);
  private readonly changelogService = inject(ChangelogService);

  @ViewChild('releaseNotesModal') releaseNotesModal!: TemplateRef<any>;
  public modalRef?: BsModalRef;

  get amountPlayers(): number {
    if (!this.kickbaseGroup?.players) return 0;
    return this.kickbaseGroup.players.filter((p) => p.isDeleted || p.isKept || p.isFixedSquad)
      .length;
  }

  reloadPage(): void {
    document.location.reload();
  }

  ngAfterViewInit() {
    this.createPayPalButton();
    this.checkAutoShowReleaseNotes();
  }

  ngOnInit() {
    this.selectedSorting = readNumberSetting('sorting', this.selectedSorting);
    this.isGroupedView = readBooleanSetting('groupedView', this.isGroupedView);
    this.loadStatsAlways = readBooleanSetting('loadStatsAlways', this.loadStatsAlways);
    this.keepPlayersInitially = readBooleanSetting(
      'keepPlayersInitially',
      this.keepPlayersInitially,
    );
    this.offerOffset = readStringSetting('offerOffset', this.offerOffset);

    if (this.apiService.isLoggedIn()) {
      this.loadLeagues();
    }
    this.displayMode = DisplayMode.calculator;

    const countdown = calculateMatchdayCountdown(new Date());
    this.dayUntilFriday = countdown.days;
    this.fridayDate = countdown.fridayDate;
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
      },
    });
    donateButton.render('#donate-button');
  }

  reloadMarket = async (fullRefresh: boolean): Promise<void> => {
    if (this.selectedLeague === null) {
      return;
    }

    this.loadingData = true;

    try {
      if (fullRefresh || this.currentMarket === null) {
        this.currentMarket = await firstValueFrom(this.apiService.getMarket(this.selectedLeague));
      }
      if (this.currentMarket === null) {
        return;
      }

      for (const player of this.currentMarket.players) {
        if (this.loadStatsAlways) {
          await player.loadStats(this.selectedLeague, this.apiService);
        }

        player.calcValues();
        player.isKept = true;
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
        const result = await firstValueFrom(
          this.apiService.login(payload.username, payload.password),
        );
        if (!result) {
          alert('Bitte Username und Passwort überprüfen');
        } else {
          this.displayMode = DisplayMode.calculator;
          await this.loadLeagues();
        }
      } catch {
        this.errorService.showError('Fehler beim Login. Bitte überprüfen Sie Ihre Zugangsdaten.');
      } finally {
        this.doLogin = false;
      }
    } else {
      this.errorService.showError('Bitte Username und Password angeben');
      this.doLogin = false;
    }
  }

  loadLeagues = async (): Promise<void> => {
    this.loadingData = true;
    try {
      const leagues = await firstValueFrom(this.apiService.getLeagues());
      this.leagues = leagues;

      if (this.leagues.length > 0) {
        const rawLastId = this.apiService.appSettings().lastLeagueId;
        const parsedLastId =
          rawLastId !== undefined && rawLastId !== null ? Number(rawLastId) : null;

        const leagueExists = leagues.some((l: KickbaseLeague) => Number(l.id) === parsedLastId);

        if (parsedLastId !== null && !isNaN(parsedLastId) && parsedLastId !== -1 && leagueExists) {
          this.selectedLeague = parsedLastId;
          await this.onSelectedLeagueChanged(parsedLastId);
        } else {
          this.selectedLeague = null;
          await this.onSelectedLeagueChanged(null);
        }
      } else {
        this.selectedLeague = null;
        await this.onSelectedLeagueChanged(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.loadingData = false;
      this.cdRef.detectChanges();
    }
  };

  onSelectedLeagueChanged = async (newValue: number | null): Promise<void> => {
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
      this.currentMarket = await firstValueFrom(this.apiService.getMarket(newValue));
      this.currentGift = null;

      const league = this.leagues.find((item) => Number(item.id) === newValue);

      if (league === undefined) {
        return;
      }

      const leagueOverview = await firstValueFrom(this.apiService.getLeagueOverview(league.id));
      league.amd = leagueOverview.amd;

      this.achievementsDisabled = league.amd ?? false;
      this.includeAchievements = !this.achievementsDisabled;

      const lineUp = await firstValueFrom(this.apiService.getLineup(newValue));

      this.minusValue = league.budget ?? 0;

      if (this.currentMarket !== null) {
        this.extraAmount = Number(this.currentMarket.offerAmountForUser);
      }

      const deletedPlayersStorage = localStorage.getItem(`permantDeletedPlayer_${newValue}`);

      let permanentlyDeletedPlayers: string[] = [];

      if (deletedPlayersStorage !== null) {
        const parsedDeletedPlayers: unknown = JSON.parse(deletedPlayersStorage);

        permanentlyDeletedPlayers = Array.isArray(parsedDeletedPlayers)
          ? parsedDeletedPlayers.map((value) => String(value))
          : [];
      }

      for (const player of lineUp.players) {
        const marketPlayer = this.currentMarket?.players.find(
          (marketItem) => String(marketItem.id) === String(player.id),
        );

        if (marketPlayer !== undefined) {
          player.value = marketPlayer.value;
          player.price = marketPlayer.price;
        }

        player.leagueId = newValue;
        player.isFixedSquad = permanentlyDeletedPlayers.includes(String(player.id));
        player.isKept = this.keepPlayersInitially;

        this.kickbaseGroup.players.push(player);
      }

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

  onIncludeAchievementsChanged() {
    this.refreshGroups();
  }

  onLoadAllDetails = async (refresh: boolean) => {
    if (this.selectedLeague === null) {
      return;
    }
    this.loadingAllDetailsManual = true;
    if (this.displayMode === DisplayMode.marketOverview) {
      if (this.currentMarket === null) {
        this.loadingAllDetailsManual = false;
        return;
      }
      for (let pl of this.currentMarket.players) {
        await pl.loadStats(this.selectedLeague, this.apiService);
        if (refresh) {
          pl.calcValues();
          pl.isKept = true;
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
  };

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
  };

  onPlayerValueChanged(player: KickbasePlayer) {
    this.kickbaseGroup.calcValues(
      this.amountValue,
      this.includeMinusMarketValues,
      this.dayUntilFriday,
      !this.includeAchievements,
    );
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
    writeSetting('loadStatsAlways', this.loadStatsAlways);
  }

  onKeepPlayersInitiallyChanged() {
    writeSetting('keepPlayersInitially', this.keepPlayersInitially);

    // Die Umschaltung soll sofort sichtbar sein und nicht erst beim naechsten
    // Ligawechsel greifen - sie setzt die Verkaufsauswahl also neu.
    for (const player of this.kickbaseGroup.players) {
      player.isKept = this.keepPlayersInitially;
    }

    this.refreshGroups();
  }

  onExtraAmountChange(event: number | string) {
    try {
      this.onIncludeAdditionalAmountChanged();
    } catch {}
  }

  onOfferOffsetChange(event: string) {
    try {
      const value: string = event;
      this.offerOffset = value.replace(',', '.');
      writeSetting('offerOffset', this.offerOffset);
      this.kickbaseGroup.calcColors(this.amountValue);
    } catch {}
  }

  onRemovePlayer(player: KickbasePlayer) {
    const index = this.kickbaseGroup.players.find((p) => p.name === player.name);
    if (index === undefined) {
      return;
    }
    index.isDeleted = true;
    this.refreshGroups();
  }

  onDeactivatePlayer(player: KickbasePlayer) {
    player.isKept = !player.isKept;
    this.refreshGroups();
  }

  refreshGroups() {
    this.kickbaseGroup.calcValues(
      this.amountValue,
      this.includeMinusMarketValues,
      this.dayUntilFriday,
      !this.includeAchievements,
    );
    this.sortCurrentPlayers();
  }

  getGift = async () => {
    if (this.selectedLeague === null) {
      return;
    }
    try {
      await firstValueFrom(this.apiService.collectGift(this.selectedLeague));
      this.reload();
    } catch (error) {
      console.log('cannot collect gift');
      console.log(error);
      const initialState = {
        list: [JSON.stringify(error)],
        title: 'Geschenk bereits erhalten',
      };
      this.bsModalRef = this.modalService.show(ModalComponent, { initialState });
      if (this.bsModalRef.content) {
        this.bsModalRef.content.closeBtnName = 'Close';
      }
    }
  };

  errorHandler(event: Event) {
    console.debug(event);
    const target = event.target as HTMLImageElement | null;
    if (target !== null) {
      target.src = 'https://cdn.browshot.com/static/images/not-found.png';
    }
  }

  logout() {
    this.apiService.logout();
    this.kickbaseGroup = new KickbaseGroup();
  }

  onSelectedSortingChanged(sorting: number) {
    writeSetting('sorting', sorting);
    this.selectedSorting = sorting;
    this.sortCurrentPlayers();
  }

  sortCurrentPlayers(): void {
    const isMarketOverview = this.displayMode === DisplayMode.marketOverview;

    const sourcePlayers = isMarketOverview
      ? (this.currentMarket?.players ?? [])
      : this.kickbaseGroup.players;

    const sorted = sortPlayers(sourcePlayers, this.selectedSorting);

    if (isMarketOverview) {
      this.marketOverviewPlayers = sorted;
    } else {
      this.kickbaseGroup.players = sorted;
    }
  }

  setPrintMode() {
    this.printMode = !this.printMode;
  }

  onFridayDateChanged(countDays: string) {
    const intValue = Number.parseInt(countDays, 10);
    if (!isNaN(intValue)) {
      this.dayUntilFriday = intValue;
      this.fridayDate = addDays(new Date(), this.dayUntilFriday);
      this.refreshGroups();
    }
  }

  showPlayer(player: KickbasePlayer) {
    if (player.isDeleted) {
      return false;
    }
    if (player.isFixedSquad) {
      return this.showPermanentDeletedPlayers;
    }
    return true;
  }

  switchDisplay = async (displayMode: DisplayMode): Promise<void> => {
    this.displayMode = displayMode;
    this.apiService.setLastDisplay(this.displayMode);

    if (displayMode === DisplayMode.marketOverview) {
      this.selectedSorting = SortMode.default;

      await this.reloadMarket(true);
    }
  };

  getActivePlayersCount(): number {
    if (!this.kickbaseGroup?.players) return 0;
    return this.kickbaseGroup.players.filter((p) => !p.isFixedSquad).length;
  }

  getDisabledPlayersCount(): number {
    if (!this.kickbaseGroup?.players) return 0;
    return this.kickbaseGroup.players.filter((p) => p.isFixedSquad).length;
  }

  onGroupedViewChanged() {
    writeSetting('groupedView', this.isGroupedView);
    if (this.isGroupedView) {
      this.showPermanentDeletedPlayers = true;
    }
    this.cdRef.detectChanges();
  }

  shouldShowPositionDivider(
    players: KickbasePlayer[],
    currentIndex: number,
    isFixedSquadSection: boolean,
  ): boolean {
    if (this.selectedSorting !== SortMode.position) {
      return false;
    }

    const currentPlayer = players[currentIndex];

    // Finde den vorherigen Spieler, der in DIESER Sektion angezeigt wird
    let previousPlayer: KickbasePlayer | null = null;
    for (let i = currentIndex - 1; i >= 0; i--) {
      const p = players[i];
      if (this.showPlayer(p) && p.isFixedSquad === isFixedSquadSection) {
        previousPlayer = p;
        break;
      }
    }

    // Wenn es keinen vorherigen sichtbaren Spieler in dieser Sektion gibt -> Header anzeigen
    if (!previousPlayer) {
      return true;
    }

    // Header nur anzeigen, wenn sich die Position zum vorherigen sichtbaren Spieler unterscheidet
    return currentPlayer.position !== previousPlayer.position;
  }

  public async openReleaseNotes(): Promise<void> {
    this.modalRef = this.modalService.show(this.releaseNotesModal, { class: 'modal-xl' });

    if (this.changelogHtml) {
      return;
    }

    this.isLoadingChangelog = true;
    try {
      this.changelogHtml = await firstValueFrom(this.changelogService.loadAsHtml());
    } catch {
      this.changelogHtml = '<p class="text-danger">Changelog konnte nicht geladen werden.</p>';
    } finally {
      this.isLoadingChangelog = false;
      this.cdRef.detectChanges();
    }
  }

  private checkAutoShowReleaseNotes(): void {
    const lastSeenVersion = readStringSetting('last_seen_version', '');
    if (lastSeenVersion !== this.currentVersion) {
      this.openReleaseNotes();
      writeSetting('last_seen_version', this.currentVersion);
    }
  }
}
