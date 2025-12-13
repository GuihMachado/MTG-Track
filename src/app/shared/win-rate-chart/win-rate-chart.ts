import { Component, Input } from '@angular/core';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

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

  public doughnutChartType: ChartType = 'doughnut';

  get winRate(): number {
    const total = this.wins + this.losses;
    if (total === 0) return 0;
    return Math.round((this.wins / total) * 100);
  }

  public get doughnutChartData(): ChartData<'doughnut'> {
    return {
      labels: ['Vitórias', 'Derrotas'],
      datasets: [
        {
          data: [this.wins, this.losses],
          backgroundColor: ['#00ffc3', '#171717'], 
          hoverBackgroundColor: ['#00ffc3', '#171717'],
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
        backgroundColor: '#000',
        bodyColor: '#fff',
        borderColor: '#333',
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
