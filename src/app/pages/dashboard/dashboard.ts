import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { WinRateChart } from '../../shared/win-rate-chart/win-rate-chart';
import { DeckCardComponent } from './components/deck-card/deck-card.component';
import { MatchCardComponent } from '../../shared/match-card/match-card.component';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { lucideSearch } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';
import { MatchService } from '../../services/match-service';
import { MatchDto, RecentDeck, UserStats } from '../../models/match.models';


@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    HlmCardImports,
    HlmSkeletonImports,
    WinRateChart,
    DeckCardComponent,
    MatchCardComponent,
    RouterLink,
    NgIcon,
    HlmIconImports
  ],
  providers: [provideIcons({ lucideSearch })],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private matchService = inject(MatchService);

  protected currentUserId = signal(0);
  protected stats = signal<UserStats | null>(null);
  protected decks = signal<RecentDeck[]>([]);
  protected matches = signal<MatchDto[]>([]);
  protected loadingStats = signal(true);
  protected loadingDecks = signal(true);
  protected loadingMatches = signal(true);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const userId = Number(localStorage.getItem('user-id')) || 0;
    this.currentUserId.set(userId);

    this.matchService.getUserStats(userId).subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loadingStats.set(false);
      },
      error: (error) => {
        toast(error.error?.message ?? 'Erro ao carregar as estatísticas.');
        this.loadingStats.set(false);
      }
    });

    this.matchService.getRecentDecks(userId, 5).subscribe({
      next: (decks) => {
        this.decks.set(decks);
        this.loadingDecks.set(false);
      },
      error: () => {
        this.loadingDecks.set(false);
      }
    });

    this.matchService.getMatchesByUser(userId).subscribe({
      next: (matches) => {
        this.matches.set(matches.slice(0, 5));
        this.loadingMatches.set(false);
      },
      error: () => {
        this.loadingMatches.set(false);
      }
    });
  }
}
