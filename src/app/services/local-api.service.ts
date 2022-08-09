import { Injectable } from '@angular/core';
import { KickbasePlayer } from '../model/kickbase-player';
import { KickbasePlayerStats } from '../model/kickbase-player-stats';
import { Md5 } from '../model/MD5';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class LocalApiService {


  public offlinePlayers: KickbasePlayer[] = new Array();
  public typeaheadData = new Array();


  constructor(public apiService: ApiService) { }


  refreshLocalMarketValues = async () => {
    const winner = await this.apiService.getMarketWinner();
    const looser = await this.apiService.getMarketLooser();
    const all = await this.apiService.getMarketAll();

    this.parseLigaInsiderResponse(winner);
    this.parseLigaInsiderResponse(looser);
    this.parseLigaInsiderResponse(all, true);
  }

  parseLigaInsiderResponse(document, isAll: boolean = false) {

    for (const pl of document) {
      const player = new KickbasePlayer(null, '');
      player.name = pl['name'];
      const hash: any = Md5.hashStr(player.name, false);
      player.nameHash = hash;
      // when getting all players (for those who have no market change)
      // there the grid is different
      let realChange = 0;
      let marktValue = 0;
      if (!isAll) {
        realChange = Number(pl['marketValueChange']);
        marktValue = Number(pl['marketValue']);
      } else {
        marktValue = Number(pl['marketValueChange']);
      }

      player.marketValue = marktValue;
      player.value = marktValue;
      player.stats = new KickbasePlayerStats(null);
      player.stats.marketValue = marktValue;
      player.stats.realMarketValueChange = realChange;

      player.calcValues();
      const index = this.offlinePlayers.findIndex(t => t.name === player.name);
      if (index === -1) {
        this.offlinePlayers.push(player);
        this.typeaheadData.push({
          id: player.nameHash,
          name: player.name
        });
      }

    }
  }

  updateMarketValue(player: KickbasePlayer) {
    if (player.nameHash.length === 0) {
      const hash: any = Md5.hashStr(player.name, false);
      player.nameHash = hash;
    }

    const newPLayer = this.offlinePlayers.find(t => t.nameHash === player.nameHash);
    // console.log('===asd===')
    // console.log(newPLayer);
    // console.log('===')
    // console.log(player);
    if (newPLayer !== undefined && newPLayer !== null) {
      if (player.marketValue !== newPLayer.marketValue) {
        console.log('Update local player ' + player.name);
        player.marketValue = newPLayer.marketValue;
        // player.value = newPLayer.value;
        player.stats.realMarketValueChange = newPLayer.stats.realMarketValueChange;
        player.calcValues();
      }
    }


  }



}
