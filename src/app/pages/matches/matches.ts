import { Component, OnInit, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../shared/notification/notification.service';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { MatchService } from '../../services/match-service';
import { MatchDto, UserStats } from '../../models/match.models';
import { MatchCardComponent } from '../../shared/match-card/match-card.component';

type MatchFilter = 'all' | 'wins' | 'losses' | 'fun' | 'open';

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [
    RouterLink,
    HlmSkeletonImports,
    HlmEmptyImports,
    HlmButtonImports,
    MatchCardComponent
  ],
  templateUrl: './matches.html',
  styleUrl: './matches.css'
})
export class Matches implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private matchService = inject(MatchService);
  private notify = inject(NotificationService);

  protected readonly filters: { id: MatchFilter; label: string }[] = [
    { id: 'all', label: 'Todas' },
    { id: 'wins', label: 'Vitórias' },
    { id: 'losses', label: 'Derrotas' },
    { id: 'fun', label: '4Fun' },
    { id: 'open', label: 'Em andamento' },
  ];

  protected matches = signal<MatchDto[]>([]);
  /** Placar geral do jogador — a faixa no topo da tela. */
  protected stats = signal<UserStats | null>(null);
  protected loading = signal(true);
  protected currentUserId = signal(0);
  protected filter = signal<MatchFilter>('all');

  protected filtered = computed(() => {
    const userId = this.currentUserId();

    switch (this.filter()) {
      case 'wins':
        return this.matches().filter(m => m.winner?.id === userId);
      case 'losses':
        return this.matches().filter(m => m.winner !== null && m.winner.id !== userId);
      case 'fun':
        return this.matches().filter(m => m.isFun);
      case 'open':
        return this.matches().filter(m => m.winner === null);
      default:
        return this.matches();
    }
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.currentUserId.set(Number(localStorage.getItem('user-id')) || 0);
    this.loadMatches();
    this.loadStats();
  }

  /** Falha em silêncio: a lista de partidas é o conteúdo, o placar é resumo. */
  private loadStats(): void {
    this.matchService.getUserStats(this.currentUserId()).subscribe({
      next: stats => this.stats.set(stats),
      error: () => undefined,
    });
  }

  /** Encerrar uma partida muda a lista e o placar. */
  protected onFinished(): void {
    this.loadMatches();
    this.loadStats();
  }

  protected loadMatches(): void {
    this.matchService.getMatchesByUser(this.currentUserId()).subscribe({
      next: (matches) => {
        this.matches.set(matches);
        this.loading.set(false);
      },
      error: (error) => {
        this.notify.apiError(error, { fallback: 'Não foi possível carregar as partidas.' });
        this.loading.set(false);
      }
    });
  }
}
