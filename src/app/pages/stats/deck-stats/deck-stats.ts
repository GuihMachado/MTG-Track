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
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import {
  lucideChevronLeft,
  lucideFlame,
  lucideSwords,
  lucideTrendingDown,
} from '@ng-icons/lucide';
import { ManaSymbolPipe } from '../../../shared/pipes/mana-symbol-pipe';
import { NotificationService } from '../../../shared/notification/notification.service';
import { MatchService } from '../../../services/match-service';
import { MatchDto } from '../../../models/match.models';
import { StatsPeriod, detailFor, winRateBand } from '../../../shared/deck-stats';
import {
  colorsToManaSymbols,
  commanderArtUrl,
  manaRgbVar,
} from '../../../shared/match-utils';

/**
 * Tela 2 de Estatísticas: um deck em detalhe. O winrate em gótico de 46px é a
 * resposta da pergunta "esse deck vai bem?"; abaixo vêm os números que mudam a
 * decisão de qual deck levar — sequência recente, tamanho de mesa e duração.
 */
@Component({
  selector: 'app-deck-stats-page',
  standalone: true,
  imports: [NgIcon, HlmIcon, ManaSymbolPipe],
  providers: [
    provideIcons({ lucideChevronLeft, lucideFlame, lucideSwords, lucideTrendingDown }),
  ],
  templateUrl: './deck-stats.html',
  styleUrl: './deck-stats.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckStatsPage implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private matchService = inject(MatchService);
  private notify = inject(NotificationService);

  protected matches = signal<MatchDto[]>([]);
  protected loading = signal(true);
  protected currentUserId = signal(0);
  protected deckKeyParam = signal('');
  /** O mesmo recorte da tela 1: quem escolheu "só ranqueadas" lá, lê igual aqui. */
  protected period = signal<StatsPeriod>('all');
  protected artFailed = signal(false);

  protected deck = computed(() =>
    detailFor(this.deckKeyParam(), this.matches(), this.currentUserId(), this.period()),
  );

  protected rgb = computed(() => manaRgbVar(this.deck()?.colors));
  protected symbols = computed(() => colorsToManaSymbols(this.deck()?.colors));
  protected band = computed(() => winRateBand(this.deck()?.winRate ?? 0));
  protected artUrl = computed(() => {
    const deck = this.deck();
    return deck && !deck.invalid ? commanderArtUrl(deck.commander) : null;
  });

  /** Fita das últimas 12, com as da sequência atual acesas. */
  protected ribbon = computed(() => {
    const deck = this.deck();
    if (!deck) return [];
    const results = deck.recentResults;
    const streakStart = results.length - Math.min(deck.currentStreak.count, results.length);
    return results.map((r, i) => ({
      won: r === 'W',
      inStreak: i >= streakStart,
    }));
  });

  protected ribbonLabel = computed(() =>
    'últimas ' + this.deck()!.recentResults.length + ': ' +
    this.deck()!.recentResults.map(r => (r === 'W' ? 'vitória' : 'derrota')).join(', '),
  );

  protected bandOf = winRateBand;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.currentUserId.set(Number(localStorage.getItem('user-id')) || 0);
    const stored = localStorage.getItem('stats-period') as StatsPeriod | null;
    if (stored === '6m' || stored === 'ranked') this.period.set(stored);

    this.route.paramMap.subscribe(params => {
      this.deckKeyParam.set(params.get('commander') ?? '');
      this.artFailed.set(false);
    });

    this.matchService.getMatchesByUser(this.currentUserId()).subscribe({
      next: matches => {
        this.matches.set(matches);
        this.loading.set(false);
        if (!this.deck()) {
          this.notify.warning('Esse deck não tem partidas neste período.');
          this.router.navigate(['/estatisticas']);
        }
      },
      error: error => {
        this.notify.apiError(error, { fallback: 'Não foi possível carregar as estatísticas.' });
        this.loading.set(false);
        this.router.navigate(['/estatisticas']);
      },
    });
  }

  protected back(): void {
    this.router.navigate(['/estatisticas']);
  }

  protected toMatchups(): void {
    this.router.navigate(['/estatisticas', this.deckKeyParam(), 'confrontos']);
  }
}
