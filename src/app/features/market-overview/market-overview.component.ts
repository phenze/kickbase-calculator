import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { KickbasePlayer } from '../../core/models/kickbase-player';
import { ApiService } from '../../core/services/api.service';
import { readBooleanSetting, writeSetting } from '../../core/utils/local-storage';

import { PlayerItemComponent } from '../../shared/components/player-item/player-item.component';

@Component({
  selector: 'app-market-overview',
  templateUrl: './market-overview.component.html',
  styleUrls: ['./market-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [FormsModule, AngularSvgIconModule, PlayerItemComponent],
})
export class MarketOverviewComponent implements OnChanges {
  public apiService = inject(ApiService);

  public playersToShow: KickbasePlayer[] = [];
  public onlyManualPrices = readBooleanSetting('onlyManualPrices', false);
  public onlyKickbasePlayers = readBooleanSetting('onlyKickbasePlayers', false);
  public onlyUntilMwUpdate = readBooleanSetting('onlyUntilMwUpdate', false);

  @Input() sortedPlayers: KickbasePlayer[] = [];
  @Input() selectedLeague: number | null = null;

  @Output() loadDetails = new EventEmitter<KickbasePlayer>();
  @Output() onReload = new EventEmitter<void>();

  ngOnChanges(): void {
    this.filterPlayersToShow();
  }

  onOnlyManualPricesChanges(): void {
    writeSetting('onlyManualPrices', this.onlyManualPrices);
    this.filterPlayersToShow();
  }

  onOnlyKickbasePlayersChanged(): void {
    writeSetting('onlyKickbasePlayers', this.onlyKickbasePlayers);
    this.filterPlayersToShow();
  }

  onOnlyUntilMwUpdateChanged(): void {
    writeSetting('onlyUntilMwUpdate', this.onlyUntilMwUpdate);
    this.filterPlayersToShow();
  }

  onLoadAllDetailsForPlayer(player: KickbasePlayer): void {
    this.loadDetails.emit(player);
  }

  reload(): void {
    this.onReload.emit();
  }

  private filterPlayersToShow(): void {
    let filteredPlayers = [...this.sortedPlayers];

    if (this.onlyManualPrices) {
      filteredPlayers = filteredPlayers.filter(
        (player) =>
          player.price % 100 === 0 &&
          player.price !== 500000 &&
          player.price !== player.marketValue &&
          player.username.length > 0,
      );
    }

    if (this.onlyKickbasePlayers) {
      filteredPlayers = filteredPlayers.filter((player) => player.username === '');
    }

    if (this.onlyUntilMwUpdate) {
      filteredPlayers = filteredPlayers.filter((player) => player.isUntilMarketValueUpdate);
    }

    this.playersToShow = filteredPlayers;
  }
}
