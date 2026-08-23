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

import { KickbasePlayer } from 'src/app/model/kickbase-player';
import { ApiService } from 'src/app/services/api.service';

import { PlayerItemComponent } from '../player-item/player-item.component';

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
  public onlyManualPrices = localStorage.getItem('onlyManualPrices') === 'true';
  public onlyKickbasePlayers = localStorage.getItem('onlyKickbasePlayers') === 'true';

  @Input() sortedPlayers: KickbasePlayer[] = [];
  @Input() selectedLeague: number | null = null;

  @Output() loadDetails = new EventEmitter<KickbasePlayer>();
  @Output() onReload = new EventEmitter<void>();

  ngOnChanges(): void {
    this.filterPlayersToShow();
  }

  onOnlyManualPricesChanges(): void {
    localStorage.setItem('onlyManualPrices', this.onlyManualPrices.toString());
    this.filterPlayersToShow();
  }

  onOnlyKickbasePlayersChanged(): void {
    localStorage.setItem('onlyKickbasePlayers', this.onlyKickbasePlayers.toString());
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

    this.playersToShow = filteredPlayers;
  }
}
