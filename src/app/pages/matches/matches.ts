import { Component, OnInit, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { lucideX } from '@ng-icons/lucide';
import { NotificationService } from '../../shared/notification/notification.service';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { MatchService } from '../../services/match-service';
import { MatchDto, UserStats } from '../../models/match.models';
import { MatchCardComponent } from '../../shared/match-card/match-card.component';
import { deckKey } from '../../shared/deck-stats';

type MatchFilter = 'all' | 'wins' | 'losses' | 'fun' | 'open';

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [
    RouterLink,
    NgIcon,
    HlmIcon,
    HlmSkeletonImports,
    HlmEmptyImports,
    HlmButtonImports,
    MatchCardComponent
  ],
  providers: [provideIcons({ lucideX })],
  templateUrl: './matches.html',
  styleUrl: './matches.css'
})
export class Matches implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
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
  /** Recorte por deck, vindo de Estatísticas ("Ver as 18 partidas"). */
  protected commanderFilter = signal<string | null>(null);

  /** Só as partidas em que eu levei aquele comandante. */
  private byCommander = computed(() => {
    const key = this.commanderFilter();
    if (!key) return this.matches();

    return this.matches().filter(m =>
      m.playersConnection.some(
        p => p.user.id === this.currentUserId() && deckKey(p.commander) === key,
      ),
    );
  });

  /** Grafia exibível do deck filtrado — sai da partida mais recente dele. */
  protected commanderLabel = computed(() => {
    const key = this.commanderFilter();
    if (!key) return null;

    for (const m of this.byCommander()) {
      const mine = m.playersConnection.find(p => p.user.id === this.currentUserId());
      if (mine) return mine.commander.trim();
    }
    return key;
  });

  protected filtered = computed(() => {
    const userId = this.currentUserId();
    const matches = this.byCommander();

    switch (this.filter()) {
      case 'wins':
        return matches.filter(m => m.winner?.id === userId);
      case 'losses':
        return matches.filter(m => m.winner !== null && m.winner.id !== userId);
      case 'fun':
        return matches.filter(m => m.isFun);
      case 'open':
        return matches.filter(m => m.winner === null);
      default:
        return matches;
    }
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.currentUserId.set(Number(localStorage.getItem('user-id')) || 0);
    this.route.queryParamMap.subscribe(params => {
      this.commanderFilter.set(params.get('commander'));
    });
    this.loadMatches();
    this.loadStats();
  }

  protected clearCommander(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
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
