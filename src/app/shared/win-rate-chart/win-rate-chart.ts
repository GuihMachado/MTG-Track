import { Component, Input, PLATFORM_ID, ViewChild, effect, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { ThemeService } from '../theme/theme.service';
import { cssVar } from '../theme/css-vars';

@Component({
  selector: 'app-win-rate-chart',
  standalone: true,
  imports: [ BaseChartDirective ],
  templateUrl: './win-rate-chart.html',
  styleUrl: './win-rate-chart.css',
})
export class WinRateChart {
  @Input() wins: number = 0;
  @Input() losses: number = 0;

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  private platformId = inject(PLATFORM_ID);
  private theme = inject(ThemeService);

  public doughnutChartType: ChartType = 'doughnut';

  constructor() {
    // Canvas não lê var(): recolore quando o tema troca.
    effect(() => {
      this.theme.theme();
      if (!isPlatformBrowser(this.platformId)) return;
      this.applyThemeColors();
      this.chart?.update();
    });
  }

  get winRate(): number {
    const total = this.wins + this.losses;
    if (total === 0) return 0;
    return Math.round((this.wins / total) * 100);
  }

  private colors = { win: '#34D39E', loss: '#2A2438' };

  private applyThemeColors(): void {
    this.colors = {
      win: cssVar('--chart-win') || this.colors.win,
      loss: cssVar('--chart-loss') || this.colors.loss,
    };
    const tooltip = this.doughnutChartOptions?.plugins?.tooltip;
    if (tooltip) {
      tooltip.backgroundColor = cssVar('--chart-tooltip-bg');
      tooltip.bodyColor = cssVar('--chart-tooltip-fg');
      tooltip.borderColor = cssVar('--chart-tooltip-border');
    }
  }

  public get doughnutChartData(): ChartData<'doughnut'> {
    return {
      labels: ['Vitórias', 'Derrotas'],
      datasets: [
        {
          data: [this.wins, this.losses],
          backgroundColor: [this.colors.win, this.colors.loss],
          hoverBackgroundColor: [this.colors.win, this.colors.loss],
          borderWidth: 0,
        },
      ],
    };
  }

  public doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1E1A2A',
        bodyColor: '#EDEAF5',
        borderColor: '#3A3350',
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw || 0;
            return ` ${label}: ${value} partidas`;
          }
        }
      }
    },
  };

}
