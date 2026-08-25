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
  lucideChevronDown,
  lucideChevronLeft,
  lucideSkull,
  lucideSwords,
  lucideUser,
} from '@ng-icons/lucide';
import { BackButton } from '../../../shared/back-button/back-button';
import { NotificationService } from '../../../shared/notification/notification.service';
import { MatchService } from '../../../services/match-service';
import { MatchDto } from '../../../models/match.models';
import {
  StatsPeriod,
  aggregateByDeck,
  detailFor,
  sortDecks,
  winRateBand,
} from '../../../shared/deck-stats';
import { commanderArtUrl, manaRgbVar } from '../../../shared/match-utils';
import { DeckRow } from '../deck-row/deck-row';

/**
 * Tela 3 de Estatísticas: confrontos de um deck. Em Commander a mesa tem 3 a 6
 * pessoas, então "confronto" é presença, não duelo — quantas vezes você venceu
 * com aquela pessoa na mesa. Abaixo, contra quais comandantes esse deck trava.
 */
@Component({
  selector: 'app-matchups',
  standalone: true,
  imports: [NgIcon, HlmIcon, BackButton, DeckRow],
  providers: [
    provideIcons({
      lucideChevronDown,
      lucideChevronLeft,
      lucideSkull,
      lucideSwords,
      lucideUser,
    }),
  ],
  templateUrl: './matchups.html',
  styleUrl: './matchups.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Matchups implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private matchService = inject(MatchService);
  private notify = inject(NotificationService);

  protected matches = signal<MatchDto[]>([]);
  protected loading = signal(true);
  protected currentUserId = signal(0);
  protected deckKeyParam = signal('');
  protected period = signal<StatsPeriod>('all');
  /** Trocar de deck sem voltar: o seletor abre a lista aqui mesmo. */
  protected switching = signal(false);
  protected artFailed = signal(false);

  protected deck = computed(() =>
    detailFor(this.deckKeyParam(), this.matches(), this.currentUserId(), this.period()),
  );

  /** Os outros decks, para o seletor. */
  protected otherDecks = computed(() =>
    sortDecks(
      aggregateByDeck(this.matches(), this.currentUserId(), this.period()).filter(
        d => !d.invalid && d.key !== this.deckKeyParam(),
      ),
      'winrate',
    ),
  );

  protected artUrl = computed(() => {
    const deck = this.deck();
    return deck && !deck.invalid ? commanderArtUrl(deck.commander) : null;
  });

  protected bandOf = winRateBand;
  protected rgbOf = manaRgbVar;
  protected artOf = commanderArtUrl;

  protected initialOf(name: string): string {
    return name.trim().charAt(0).toUpperCase() || '?';
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.currentUserId.set(Number(localStorage.getItem('user-id')) || 0);
    const stored = localStorage.getItem('stats-period') as StatsPeriod | null;
    if (stored === '6m' || stored === 'ranked') this.period.set(stored);

    this.route.paramMap.subscribe(params => {
      this.deckKeyParam.set(params.get('commander') ?? '');
      this.switching.set(false);
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
        this.notify.apiError(error, { fallback: 'Não foi possível carregar os confrontos.' });
        this.loading.set(false);
        this.router.navigate(['/estatisticas']);
      },
    });
  }

  protected switchTo(key: string): void {
    this.router.navigate(['/estatisticas', key, 'confrontos']);
  }

  /** A pílula do rodapé filtra a tela de Partidas por este comandante. */
  protected seeMatches(): void {
    this.router.navigate(['/matchs'], { queryParams: { commander: this.deckKeyParam() } });
  }
}
