import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NotificationService } from '../../shared/notification/notification.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCrown } from '@ng-icons/lucide';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { MatchService } from '../../services/match-service';
import { RankingEntry } from '../../models/match.models';

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [
    CommonModule,
    NgIcon,
    HlmIconImports,
    HlmTableImports,
    HlmSkeletonImports,
    HlmEmptyImports
  ],
  providers: [provideIcons({ lucideCrown })],
  templateUrl: './ranking.html',
  styleUrl: './ranking.css'
})
export class Ranking implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private matchService = inject(MatchService);
  private notify = inject(NotificationService);

  protected ranking = signal<RankingEntry[]>([]);
  protected loading = signal(true);
  protected currentUserId = signal(0);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.currentUserId.set(Number(localStorage.getItem('user-id')) || 0);

    this.matchService.getRanking(50).subscribe({
      next: (ranking) => {
        this.ranking.set(ranking);
        this.loading.set(false);
      },
      error: (error) => {
        this.notify.apiError(error, { fallback: 'Não foi possível carregar o ranking.' });
        this.loading.set(false);
      }
    });
  }

  crownClass(position: number): string {
    switch (position) {
      case 0: return 'text-accent';
      case 1: return 'text-foreground-subtle';
      case 2: return 'text-warning';
      default: return '';
    }
  }
}
