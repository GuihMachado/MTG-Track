import { Component } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { WinRateChart } from '../../shared/win-rate-chart/win-rate-chart';


@Component({
  selector: 'app-dashboard',
  imports: [HlmCardImports, WinRateChart],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  stats = {
    wins: 32,
    losses: 18
  };
}
