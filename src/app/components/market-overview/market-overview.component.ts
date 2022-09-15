import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { KickbaseMarket } from 'src/app/model/kickbase-market';
import { KickbasePlayer } from 'src/app/model/kickbase-player';
import { ApiService } from 'src/app/services/api.service';
import * as numeral from 'numeral';

@Component({
  selector: 'app-market-overview',
  templateUrl: './market-overview.component.html',
  styleUrls: ['./market-overview.component.scss']
})
export class MarketOverviewComponent implements OnInit {

  public currentMarket: KickbaseMarket = null;
  public playersToShow: KickbasePlayer[] = [];
  public players: KickbasePlayer[] = [];
  public manualPricePlayers: KickbasePlayer[] = [];
  public selectedLeague: number = null;
  public onlyManualPrices: boolean = true;

  @Output() loadDetails = new EventEmitter();
  @Output() onReload = new EventEmitter();

  constructor(public apiService: ApiService) {
    // self.percents = [NSMutableArray new];
  }

  ngOnInit(): void {
  }

  onOnlyManualPricesChanges() {
    this.playersToShow = this.onlyManualPrices ? this.manualPricePlayers : this.players;
  }

  onLoadAllDetailsForPlayer = (player: KickbasePlayer) => {
    this.loadDetails.emit(player);
  }
  reload() {
    this.onReload.emit();
  }

  setCurrentMarket(market: KickbaseMarket) {
    this.currentMarket = market;
    this.onlyManualPrices = true;
    this.players = new Array();
    this.manualPricePlayers = new Array();
    this.playersToShow = new Array();
    for (const pl of market.players) {
      this.players.push(pl);
      if (pl.price % 100 === 0 && pl.price !== 500000 && pl.price !== pl.marketValue) {
        if (pl.username.length > 0) {
          this.manualPricePlayers.push(pl);
        }
      }
    }
    this.playersToShow = this.manualPricePlayers;
  }

}

