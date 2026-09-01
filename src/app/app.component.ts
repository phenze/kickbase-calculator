import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
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
  protected readonly SortMode = SortMode;

  // --- Eingaben und Optionen des Rechners ---
  public readonly minusValue = signal(0);
  public readonly offerOffset = signal('0');
  public readonly extraAmount = signal(0);
  public readonly expectedIncome = signal(0);
  public readonly includeAdditionalAmount = signal(false);
  public readonly includeExpectedIncome = signal(false);
  public readonly includeMinusMarketValues = signal(false);
  public readonly includeAchievements = signal(true);
  public readonly includeLoginBonus = signal(true);
  public readonly loadStatsAlways = signal(true);
  public readonly keepPlayersInitially = signal(false);
  public readonly selectedSorting = signal<number>(SortMode.default);
  public readonly dayUntilFriday = signal(0);
  public readonly fridayDate = signal(new Date());

  /** Kontostand abzueglich der erwarteten Ausgaben, falls diese einbezogen werden. */
  public readonly amountValue = computed(() => {
    let total = Number(this.minusValue());
    if (this.includeAdditionalAmount()) {
      total -= Number(this.extraAmount());
    }
    if (this.includeExpectedIncome()) {
      total += Number(this.expectedIncome());
    }
    return total;
  });

  // --- Ansichtszustand ---
  public readonly displayMode = signal<DisplayMode>(DisplayMode.calculator);
  public readonly isGroupedView = signal(true);
  public readonly isCardExpanded = signal(true);
  public readonly printMode = signal(false);
  public readonly showPermanentDeletedPlayers = signal(true);
  public readonly loadingData = signal(false);
  public readonly loadingLeagues = signal(false);
  public readonly loadingAllDetailsManual = signal(false);
  public readonly doLogin = signal(false);

  // --- Geladene Daten ---
  public readonly leagues = signal<KickbaseLeague[]>([]);
  public readonly selectedLeague = signal<number | null>(null);
  public readonly currentGift = signal<KickbaseGift | null>(null);
  public readonly achievementsDisabled = signal(false);
  public readonly marketOverviewPlayers = signal<KickbasePlayer[]>([]);
  public currentMarket: KickbaseMarket | null = null;
  public kickbaseGroup = new KickbaseGroup();

  public readonly currentVersion = '6.8.0';
  public readonly changelogHtml = signal('');
  public readonly isLoadingChangelog = signal(false);

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
    this.selectedSorting.set(readNumberSetting('sorting', this.selectedSorting()));
    this.isGroupedView.set(readBooleanSetting('groupedView', this.isGroupedView()));
    this.includeLoginBonus.set(readBooleanSetting('includeLoginBonus', this.includeLoginBonus()));
    this.loadStatsAlways.set(readBooleanSetting('loadStatsAlways', this.loadStatsAlways()));
    this.keepPlayersInitially.set(
      readBooleanSetting('keepPlayersInitially', this.keepPlayersInitially()),
    );
    this.offerOffset.set(readStringSetting('offerOffset', this.offerOffset()));

    if (this.apiService.isLoggedIn()) {
      this.loadLeagues();
    }
    this.displayMode.set(DisplayMode.calculator);

    const countdown = calculateMatchdayCountdown(new Date());
    this.dayUntilFriday.set(countdown.days);
    this.fridayDate.set(countdown.fridayDate);
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
    const leagueId = this.selectedLeague();
    if (leagueId === null) {
      return;
    }

    this.loadingData.set(true);

    try {
      if (fullRefresh || this.currentMarket === null) {
        this.currentMarket = await firstValueFrom(this.apiService.getMarket(leagueId));
      }
      if (this.currentMarket === null) {
        return;
      }

      for (const player of this.currentMarket.players) {
        if (this.loadStatsAlways()) {
          await player.loadStats(leagueId, this.apiService);
        }

        player.calcValues();
        player.isKept = true;
        player.calcColors(0);
      }

      this.sortCurrentPlayers();
    } finally {
      this.loadingData.set(false);
      this.cdRef.detectChanges();
    }
  };

  reload() {
    this.loadLeagues();
  }

  async login(payload: LoginPayload) {
    if (payload.username.length > 0 && payload.password.length > 0) {
      try {
        this.doLogin.set(true);
        const result = await firstValueFrom(
          this.apiService.login(payload.username, payload.password),
        );
        if (!result) {
          alert('Bitte Username und Passwort überprüfen');
        } else {
          this.displayMode.set(DisplayMode.calculator);
          await this.loadLeagues();
        }
      } catch {
        this.errorService.showError('Fehler beim Login. Bitte überprüfen Sie Ihre Zugangsdaten.');
      } finally {
        this.doLogin.set(false);
      }
    } else {
      this.errorService.showError('Bitte Username und Password angeben');
      this.doLogin.set(false);
    }
  }

  loadLeagues = async (): Promise<void> => {
    this.loadingLeagues.set(true);
    this.cdRef.detectChanges();
    try {
      const leagues = await firstValueFrom(this.apiService.getLeagues());
      this.leagues.set(leagues);

      if (leagues.length > 0) {
        const rawLastId = this.apiService.appSettings().lastLeagueId;
        const parsedLastId =
          rawLastId !== undefined && rawLastId !== null ? Number(rawLastId) : null;

        const leagueExists = leagues.some((l: KickbaseLeague) => Number(l.id) === parsedLastId);

        if (parsedLastId !== null && !isNaN(parsedLastId) && parsedLastId !== -1 && leagueExists) {
          this.selectedLeague.set(parsedLastId);
          await this.onSelectedLeagueChanged(parsedLastId);
        } else {
          this.selectedLeague.set(null);
          await this.onSelectedLeagueChanged(null);
        }
      } else {
        this.selectedLeague.set(null);
        await this.onSelectedLeagueChanged(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.loadingLeagues.set(false);
      this.cdRef.detectChanges();
    }
  };

  onSelectedLeagueChanged = async (newValue: number | null): Promise<void> => {
    this.loadingData.set(true);
    this.kickbaseGroup = new KickbaseGroup();

    if (newValue === null) {
      this.selectedLeague.set(null);
      this.currentMarket = null;
      this.currentGift.set(null);
      this.loadingData.set(false);
      return;
    }

    this.selectedLeague.set(newValue);
    this.apiService.setLastLeague(newValue);

    try {
      this.currentMarket = await firstValueFrom(this.apiService.getMarket(newValue));
      this.currentGift.set(null);

      const league = this.leagues().find((item) => Number(item.id) === newValue);

      if (league === undefined) {
        return;
      }

      const leagueOverview = await firstValueFrom(this.apiService.getLeagueOverview(league.id));
      league.amd = leagueOverview.amd;

      this.achievementsDisabled.set(league.amd ?? false);
      this.includeAchievements.set(!this.achievementsDisabled());

      const lineUp = await firstValueFrom(this.apiService.getLineup(newValue));

      this.minusValue.set(league.budget ?? 0);

      if (this.currentMarket !== null) {
        this.extraAmount.set(Number(this.currentMarket.offerAmountForUser));
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
        player.isKept = this.keepPlayersInitially();

        this.kickbaseGroup.players.push(player);
      }

      if (this.loadStatsAlways()) {
        await this.onLoadAllDetails(false);
      }

      this.onIncludeAdditionalAmountChanged();
    } catch (error) {
      console.error('Fehler beim Wechseln der Liga:', error);
    } finally {
      this.loadingData.set(false);
      this.cdRef.detectChanges();
    }
  };

  onIncludeAchievementsChanged() {
    this.refreshGroups();
  }

  onLoadAllDetails = async (refresh: boolean) => {
    const leagueId = this.selectedLeague();
    if (leagueId === null) {
      return;
    }
    this.loadingAllDetailsManual.set(true);
    if (this.displayMode() === DisplayMode.marketOverview) {
      if (this.currentMarket === null) {
        this.loadingAllDetailsManual.set(false);
        return;
      }
      for (let pl of this.currentMarket.players) {
        await pl.loadStats(leagueId, this.apiService);
        if (refresh) {
          pl.calcValues();
          pl.isKept = true;
          pl.calcColors(0);
        }
      }
    } else {
      for (let pl of this.kickbaseGroup.players) {
        await pl.loadStats(leagueId, this.apiService);
        if (refresh) {
          this.refreshGroups();
        }
      }
    }
    this.loadingAllDetailsManual.set(false);
  };

  onLoadAllDetailsForPlayer = async (player: KickbasePlayer) => {
    const leagueId = this.selectedLeague();
    if (leagueId === null) {
      return;
    }
    if (player.isInEditMode) {
      return;
    }

    if (player.stats === null) {
      player.loadingDetails = true;
      await player.loadStats(leagueId, this.apiService);
      player.calcValues();
      player.calcColors(0);
      this.refreshGroups();
      player.loadingDetails = false;
    } else {
      this.onDeactivatePlayer(player);
    }
  };

  onIncludeLoginBonusChanged() {
    writeSetting('includeLoginBonus', this.includeLoginBonus());
    this.refreshGroups();
  }

  onPlayerValueChanged(player: KickbasePlayer) {
    this.kickbaseGroup.calcValues(
      this.amountValue(),
      this.includeMinusMarketValues(),
      this.dayUntilFriday(),
      !this.includeAchievements(),
      this.includeLoginBonus(),
    );
  }

  onIncludeAdditionalAmountChanged() {
    this.refreshGroups();
  }

  onExpectedIncomeChange(value: number | string | null) {
    this.expectedIncome.set(Number(value ?? 0));
    try {
      this.onIncludeExpectedIncomeChanged();
    } catch {}
  }

  onIncludeExpectedIncomeChanged() {
    this.refreshGroups();
  }

  onLoadStatsAlwaysChanged() {
    writeSetting('loadStatsAlways', this.loadStatsAlways());
  }

  onKeepPlayersInitiallyChanged() {
    writeSetting('keepPlayersInitially', this.keepPlayersInitially());

    // Die Umschaltung soll sofort sichtbar sein und nicht erst beim naechsten
    // Ligawechsel greifen - sie setzt die Verkaufsauswahl also neu.
    for (const player of this.kickbaseGroup.players) {
      player.isKept = this.keepPlayersInitially();
    }

    this.refreshGroups();
  }

  onExtraAmountChange(value: number | string | null) {
    // Die FormattedNumber-Direktive meldet ein leeres Feld als null.
    this.extraAmount.set(Number(value ?? 0));
    try {
      this.onIncludeAdditionalAmountChanged();
    } catch {}
  }

  onOfferOffsetChange(event: string) {
    try {
      const value: string = event;
      this.offerOffset.set(value.replace(',', '.'));
      writeSetting('offerOffset', this.offerOffset());
      this.kickbaseGroup.calcColors(this.amountValue());
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
      this.amountValue(),
      this.includeMinusMarketValues(),
      this.dayUntilFriday(),
      !this.includeAchievements(),
      this.includeLoginBonus(),
    );
    this.sortCurrentPlayers();
  }

  getGift = async () => {
    const leagueId = this.selectedLeague();
    if (leagueId === null) {
      return;
    }
    try {
      await firstValueFrom(this.apiService.collectGift(leagueId));
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
    this.selectedSorting.set(sorting);
    this.sortCurrentPlayers();
  }

  sortCurrentPlayers(): void {
    const isMarketOverview = this.displayMode() === DisplayMode.marketOverview;

    const sourcePlayers = isMarketOverview
      ? (this.currentMarket?.players ?? [])
      : this.kickbaseGroup.players;

    const sorted = sortPlayers(sourcePlayers, this.selectedSorting());

    if (isMarketOverview) {
      this.marketOverviewPlayers.set(sorted);
    } else {
      this.kickbaseGroup.players = sorted;
    }
  }

  setPrintMode() {
    this.printMode.set(!this.printMode());
  }

  onFridayDateChanged(countDays: string) {
    const intValue = Number.parseInt(countDays, 10);
    if (!isNaN(intValue)) {
      this.dayUntilFriday.set(intValue);
      this.fridayDate.set(addDays(new Date(), this.dayUntilFriday()));
      this.refreshGroups();
    }
  }

  showPlayer(player: KickbasePlayer) {
    if (player.isDeleted) {
      return false;
    }
    if (player.isFixedSquad) {
      return this.showPermanentDeletedPlayers();
    }
    return true;
  }

  switchDisplay = async (displayMode: DisplayMode): Promise<void> => {
    this.displayMode.set(displayMode);
    this.apiService.setLastDisplay(this.displayMode());

    if (displayMode === DisplayMode.marketOverview) {
      this.selectedSorting.set(SortMode.default);

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
    writeSetting('groupedView', this.isGroupedView());
    if (this.isGroupedView()) {
      this.showPermanentDeletedPlayers.set(true);
    }
    this.cdRef.detectChanges();
  }

  shouldShowPositionDivider(
    players: KickbasePlayer[],
    currentIndex: number,
    isFixedSquadSection: boolean,
  ): boolean {
    if (this.selectedSorting() !== SortMode.position) {
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

    if (this.changelogHtml()) {
      return;
    }

    this.isLoadingChangelog.set(true);
    try {
      this.changelogHtml.set(await firstValueFrom(this.changelogService.loadAsHtml()));
    } catch {
      this.changelogHtml.set('<p class="text-danger">Changelog konnte nicht geladen werden.</p>');
    } finally {
      this.isLoadingChangelog.set(false);
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
