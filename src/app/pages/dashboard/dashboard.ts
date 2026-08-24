import { Component, OnInit, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { MatchCardComponent } from '../../shared/match-card/match-card.component';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { lucidePlay } from '@ng-icons/lucide';
import { ManaSymbolPipe } from '../../shared/pipes/mana-symbol-pipe';
import { NotificationService } from '../../shared/notification/notification.service';
import { MatchService } from '../../services/match-service';
import { MatchDto, RecentDeck, UserStats } from '../../models/match.models';
import { colorsToManaSymbols, commanderArtUrl, manaRgbVar } from '../../shared/match-utils';

/** Segmentos do medidor de sequência — 4 vitórias enchem a barra. */
const STREAK_SLOTS = [0, 1, 2, 3];

@Component({
  selector: 'app-dashboard',
  imports: [
    HlmSkeletonImports,
    MatchCardComponent,
    RouterLink,
    NgIcon,
    HlmIconImports,
    ManaSymbolPipe
  ],
  providers: [provideIcons({ lucidePlay })],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private matchService = inject(MatchService);
  private notify = inject(NotificationService);

  protected readonly streakSlots = STREAK_SLOTS;

  protected currentUserId = signal(0);
  protected stats = signal<UserStats | null>(null);
  protected decks = signal<RecentDeck[]>([]);
  /** Histórico completo: alimenta as métricas do deck e a sequência. */
  protected allMatches = signal<MatchDto[]>([]);
  protected loadingStats = signal(true);
  protected loadingDecks = signal(true);
  protected loadingMatches = signal(true);
  private artFailed = signal(false);

  /** As cinco últimas, que é o que a lista da home mostra. */
  protected matches = computed(() => this.allMatches().slice(0, 5));

  /** O deck da vez: o mais recente. É a manchete da tela. */
  protected hero = computed(() => this.decks()[0] ?? null);

  protected heroArt = computed(() => {
    const deck = this.hero();
    if (!deck || this.artFailed()) return null;
    return deck.imageCard ?? commanderArtUrl(deck.commander);
  });

  /** Canais RGB da identidade do deck — usados no brilho e no trilho. */
  protected heroRgb = computed(() => manaRgbVar(this.hero()?.colors));

  protected heroSymbols = computed(() => colorsToManaSymbols(this.hero()?.colors));

  /**
   * Vitórias e derrotas com o deck da vez. A API só devolve o placar geral do
   * jogador, então o recorte por commander sai do próprio histórico.
   */
  protected heroRecord = computed(() => {
    const commander = this.hero()?.commander;
    if (!commander) return null;

    const userId = this.currentUserId();
    let wins = 0;
    let losses = 0;

    for (const match of this.allMatches()) {
      if (!match.winner) continue; // em andamento não conta placar
      const mine = match.playersConnection.find(p => p.user.id === userId);
      if (mine?.commander !== commander) continue;
      if (match.winner.id === userId) wins++;
      else losses++;
    }

    const total = wins + losses;
    return { wins, losses, rate: total > 0 ? Math.round((wins / total) * 100) : 0 };
  });

  /** Vitórias seguidas, da mais recente para trás. */
  protected streak = computed(() => {
    const userId = this.currentUserId();
    let count = 0;

    for (const match of this.allMatches()) {
      if (!match.winner) continue; // partida aberta não interrompe nem soma
      if (match.winner.id !== userId) break;
      count++;
    }
    return count;
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.currentUserId.set(Number(localStorage.getItem('user-id')) || 0);
    this.loadData();
  }

  protected onArtError(): void {
    this.artFailed.set(true);
  }

  protected loadData(): void {
    const userId = this.currentUserId();

    this.matchService.getUserStats(userId).subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loadingStats.set(false);
      },
      error: (error) => {
        this.notify.apiError(error, { fallback: 'Não foi possível carregar as estatísticas.' });
        this.loadingStats.set(false);
      }
    });

    this.matchService.getRecentDecks(userId, 5).subscribe({
      next: (decks) => {
        this.artFailed.set(false);
        this.decks.set(decks);
        this.loadingDecks.set(false);
      },
      error: () => {
        this.loadingDecks.set(false);
      }
    });

    this.matchService.getMatchesByUser(userId).subscribe({
      next: (matches) => {
        this.allMatches.set(matches);
        this.loadingMatches.set(false);
      },
      error: () => {
        this.loadingMatches.set(false);
      }
    });
  }
}
