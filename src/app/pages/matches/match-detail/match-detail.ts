import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { lucideArrowLeftRight, lucidePlay } from '@ng-icons/lucide';
import { BackButton } from '../../../shared/back-button/back-button';
import { ManaSymbolPipe } from '../../../shared/pipes/mana-symbol-pipe';
import { NotificationService } from '../../../shared/notification/notification.service';
import { MatchService } from '../../../services/match-service';
import { MatchDto } from '../../../models/match.models';
import { buildDetail, formatMatchDate } from './match-detail-view';

const RESULT_WORD = { win: 'Vitória', loss: 'Derrota', open: 'Em andamento', watched: 'Encerrada' } as const;

/**
 * Uma partida por inteiro: quanto durou, quem venceu, quem sentou e com qual
 * deck. A vida final só aparece quando a mesa foi salva — partida antiga não
 * tem esse dado, e a coluna some em vez de mostrar traço.
 */
@Component({
  selector: 'app-match-detail',
  standalone: true,
  imports: [NgIcon, HlmIcon, BackButton, ManaSymbolPipe],
  providers: [provideIcons({ lucideArrowLeftRight, lucidePlay })],
  templateUrl: './match-detail.html',
  styleUrl: './match-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private matchService = inject(MatchService);
  private notify = inject(NotificationService);

  protected match = signal<MatchDto | null>(null);
  protected loading = signal(true);
  /** Arte que a Scryfall não achou pelo nome: a linha fica com placa lisa. */
  protected brokenArt = signal<ReadonlySet<number>>(new Set());

  private currentUserId = Number(localStorage.getItem('user-id'));

  protected view = computed(() => {
    const match = this.match();
    return match ? buildDetail(match, this.currentUserId) : null;
  });

  protected dateLine = computed(() => {
    const match = this.match();
    return match ? formatMatchDate(match.matchDate) : '';
  });

  protected resultWord = computed(() => {
    const view = this.view();
    return view ? RESULT_WORD[view.result] : '';
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.router.navigate(['/matchs']);
      return;
    }

    this.matchService.getMatchById(id).subscribe({
      next: match => {
        this.match.set(match);
        this.loading.set(false);
      },
      error: error => {
        this.loading.set(false);
        this.notify.apiError(error, {
          fallback: 'Não foi possível abrir essa partida.',
          byStatus: { 404: 'Essa partida não existe mais.' },
        });
        this.router.navigate(['/matchs']);
      },
    });
  }

  protected markBroken(userId: number): void {
    this.brokenArt.update(set => new Set(set).add(userId));
  }

  /** A mesma volta da linha de Partidas: a mesa abre desta partida. */
  protected resume(): void {
    const match = this.match();
    if (!match) return;
    localStorage.setItem('matchId', String(match.id));
    const start = new Date(match.matchDate).getTime();
    localStorage.setItem('match-start', String(Number.isNaN(start) ? Date.now() : start));
    this.router.navigate(['/match']);
  }
}
