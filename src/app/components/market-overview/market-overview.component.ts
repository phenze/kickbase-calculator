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
  // public manualPricePlayers: KickbasePlayer[] = [];
  public selectedLeague: number = null;
  public onlyManualPrices: boolean = false;
  public onlyKickbasePlayers: boolean = false;

  @Output() loadDetails = new EventEmitter();
  @Output() onReload = new EventEmitter();

  constructor(public apiService: ApiService) {
    // self.percents = [NSMutableArray new];
  }

  ngOnInit(): void {
    let onlyKickbasePlayersTmp = localStorage.getItem('onlyKickbasePlayers');
    if (onlyKickbasePlayersTmp !== null && onlyKickbasePlayersTmp !== undefined) {
      this.onlyKickbasePlayers = onlyKickbasePlayersTmp === 'true' ? true : false;
    }

    let onlyManualPricesTmp = localStorage.getItem('onlyManualPrices');
    if (onlyManualPricesTmp !== null && onlyManualPricesTmp !== undefined) {
      this.onlyManualPrices = onlyManualPricesTmp === 'true' ? true : false;
    }
  }


  onOnlyManualPricesChanges() {
    localStorage.setItem('onlyManualPrices', this.onlyManualPrices.toString())
    this.filterPlayersToShow();
  }

  onOnlyKickbasePlayersChanged() {
    localStorage.setItem('onlyKickbasePlayers', this.onlyKickbasePlayers.toString())
    this.filterPlayersToShow();
  }

  onLoadAllDetailsForPlayer = (player: KickbasePlayer) => {
    this.loadDetails.emit(player);
  }
  reload() {
    this.onReload.emit();
  }

  setSortedPlayers(players: KickbasePlayer[]) {
    this.players = players;
    this.filterPlayersToShow();
    // this.players = players;
    // this.playersToShow = players;
    console.log('setSortedPlayers')
  }

  filterPlayersToShow() {
    // this.players = new Array();
    // this.manualPricePlayers = new Array();
    this.playersToShow = new Array();
    for (const pl of this.players) {
      if (this.onlyManualPrices) {
        if (pl.price % 100 === 0 && pl.price !== 500000 && pl.price !== pl.marketValue) {
          if (pl.username.length > 0) {
            this.playersToShow.push(pl);
          }
        }
      } else {
        this.playersToShow.push(pl);
      }
    }
    if (this.onlyKickbasePlayers) {
      this.playersToShow = this.playersToShow.filter(t => t.username === '');
    }
  }

  setCurrentMarket(market: KickbaseMarket) {
    this.currentMarket = market;
  }

}

