import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import {
  lucideArrowUpDown,
  lucideChartColumn,
  lucideCheck,
} from '@ng-icons/lucide';
import { NotificationService } from '../../shared/notification/notification.service';
import { MatchService } from '../../services/match-service';
import { MatchDto } from '../../models/match.models';
import {
  StatsPeriod,
  StatsSort,
  aggregateByDeck,
  sortDecks,
} from '../../shared/deck-stats';
import { DeckRow } from './deck-row/deck-row';

const PERIOD_KEY = 'stats-period';
const SORT_KEY = 'stats-sort';

/**
 * Tela 1 de Estatísticas: todos os decks, ordenados por desempenho. A pergunta
 * que ela responde é "qual deck eu levo hoje" — por isso a ordenação padrão é
 * winrate com amostra curta e aposentados empurrados para o fim, e por isso o
 * placar geral fica no topo: um deck a 47% não é ruim se a sua média é 48%.
 */
@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [RouterLink, NgIcon, HlmIcon, HlmDropdownMenuImports, DeckRow],
  providers: [provideIcons({ lucideArrowUpDown, lucideChartColumn, lucideCheck })],
  templateUrl: './stats.html',
  styleUrl: './stats.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stats implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private matchService = inject(MatchService);
  private notify = inject(NotificationService);

  protected readonly periods: { id: StatsPeriod; label: string }[] = [
    { id: 'all', label: 'Sempre' },
    { id: '6m', label: '6 meses' },
    { id: 'ranked', label: 'Só ranqueadas' },
  ];

  protected readonly sorts: { id: StatsSort; label: string }[] = [
    { id: 'winrate', label: 'Winrate' },
    { id: 'games', label: 'Nº de partidas' },
    { id: 'recent', label: 'Jogado por último' },
    { id: 'name', label: 'Nome' },
  ];

  protected matches = signal<MatchDto[]>([]);
  protected loading = signal(true);
  protected currentUserId = signal(0);
  protected period = signal<StatsPeriod>('all');
  protected sort = signal<StatsSort>('winrate');
  /** Digitação de teste ("fte", "gsg") fica atrás de um toque — nunca é apagada. */
  protected showInvalid = signal(false);

  private allDecks = computed(() =>
    aggregateByDeck(this.matches(), this.currentUserId(), this.period()),
  );

  protected decks = computed(() =>
    sortDecks(this.allDecks().filter(d => !d.invalid), this.sort()),
  );

  protected invalidDecks = computed(() =>
    sortDecks(this.allDecks().filter(d => d.invalid), this.sort()),
  );

  /** Linha de base da tela: soma de todos os decks, inclusive os inválidos. */
  protected summary = computed(() => {
    const all = this.allDecks();
    const wins = all.reduce((sum, d) => sum + d.wins, 0);
    const total = all.reduce((sum, d) => sum + d.total, 0);
    return {
      total,
      decks: this.decks().length,
      wins,
      losses: total - wins,
      winRate: total > 0 ? Math.round((wins / total) * 100) : null,
    };
  });

  /** Só mesas abertas: o placar existe, mas nada conta ainda. */
  protected onlyOpen = computed(
    () => this.matches().length > 0 && this.matches().every(m => m.winner === null),
  );

  protected sortLabel = computed(
    () => this.sorts.find(s => s.id === this.sort())!.label,
  );

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.currentUserId.set(Number(localStorage.getItem('user-id')) || 0);
    this.period.set(this.restore<StatsPeriod>(PERIOD_KEY, ['all', '6m', 'ranked'], 'all'));
    this.sort.set(this.restore<StatsSort>(SORT_KEY, ['winrate', 'games', 'recent', 'name'], 'winrate'));

    this.matchService.getMatchesByUser(this.currentUserId()).subscribe({
      next: matches => {
        this.matches.set(matches);
        this.loading.set(false);
      },
      error: error => {
        this.notify.apiError(error, { fallback: 'Não foi possível carregar as estatísticas.' });
        this.loading.set(false);
      },
    });
  }

  protected setPeriod(period: StatsPeriod): void {
    this.period.set(period);
    localStorage.setItem(PERIOD_KEY, period);
  }

  protected setSort(sort: StatsSort): void {
    this.sort.set(sort);
    localStorage.setItem(SORT_KEY, sort);
  }

  protected openDeck(key: string): void {
    this.router.navigate(['/estatisticas', key]);
  }

  /** Valor persistido só entra se ainda for uma opção válida. */
  private restore<T extends string>(key: string, valid: T[], fallback: T): T {
    const stored = localStorage.getItem(key) as T | null;
    return stored !== null && valid.includes(stored) ? stored : fallback;
  }
}
