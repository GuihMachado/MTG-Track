import { Component, OnInit, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { toast } from 'ngx-sonner';
import { BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmDialogImports, HlmDialog } from '@spartan-ng/helm/dialog';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { MatchService } from '../../services/match-service';

export interface SeatPlayer {
  userId: number;
  name: string;
  life: number;
  color: string;
  cmdDamage: number;
}

@Component({
  selector: 'app-match',
  standalone: true,
  imports: [
    CommonModule,
    BrnDialogImports,
    HlmDialogImports,
    HlmRadioGroupImports,
    HlmButtonImports
  ],
  templateUrl: './match.html',
  styleUrls: ['./match.css']
})
export class Match implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private matchService = inject(MatchService);

  // Cores mais vibrantes baseadas na imagem
  private readonly playerColors = [
    '#A4C639', // Verde
    '#EECFA1', // Bege
    '#2F4F4F', // Azul Petróleo escuro
    '#B22222', // Vermelho
    '#4682B4', // Azul Claro
    '#808080'  // Cinza
  ];

  protected players = signal<SeatPlayer[]>([]);
  protected loading = signal(true);
  protected finishing = signal(false);
  protected selectedWinnerId = signal<number | null>(null);
  private matchId: number | null = null;

  protected playersByLife = computed(() =>
    [...this.players()].sort((a, b) => b.life - a.life)
  );

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const matchId = Number(localStorage.getItem('matchId'));
    if (!matchId || isNaN(matchId)) {
      this.clearMatchKeys();
      toast('Partida inválida. Inicie uma nova partida.');
      this.router.navigate(['/play']);
      return;
    }

    this.matchId = matchId;
    this.matchService.getMatchById(matchId).subscribe({
      next: (match) => {
        if (match.winner) {
          this.clearMatchKeys();
          this.router.navigate(['/dashboard']);
          return;
        }

        this.players.set(
          [...match.playersConnection]
            .sort((a, b) => a.id - b.id)
            .map((mp, i) => ({
              userId: mp.user.id,
              name: mp.user.name,
              life: 40,
              color: this.playerColors[i % this.playerColors.length],
              cmdDamage: 0
            }))
        );
        this.loading.set(false);
      },
      error: (error) => {
        toast(error.error?.message ?? 'Erro ao carregar a partida.');
        this.clearMatchKeys();
        this.router.navigate(['/play']);
      }
    });
  }

  updateLife(player: SeatPlayer, amount: number): void {
    this.players.update(list =>
      list.map(p => p.userId === player.userId ? { ...p, life: p.life + amount } : p)
    );
  }

  openEndDialog(dialog: HlmDialog): void {
    if (this.loading() || this.players().length === 0) return;
    // Sugestão: pré-seleciona quem tem mais vida; a escolha final é manual.
    this.selectedWinnerId.set(this.playersByLife()[0].userId);
    dialog.open();
  }

  onWinnerChange(value: unknown): void {
    this.selectedWinnerId.set(Number(value));
  }

  confirmFinish(dialog: HlmDialog): void {
    const winnerId = this.selectedWinnerId();
    if (this.matchId === null || winnerId === null || this.finishing()) return;

    const winner = this.players().find(p => p.userId === winnerId);
    this.finishing.set(true);

    this.matchService.finishMatch(this.matchId, {
      winnerId,
      matchTimeInMinutes: this.getElapsedMinutes()
    }).subscribe({
      next: () => {
        toast(`Partida encerrada! Vencedor: ${winner?.name ?? ''}`);
        this.clearMatchKeys();
        dialog.close(null);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        toast(error.error?.message ?? 'Erro ao encerrar a partida.');
        this.finishing.set(false);
      }
    });
  }

  private getElapsedMinutes(): number {
    const start = Number(localStorage.getItem('match-start'));
    if (!start || isNaN(start)) return 0;
    return Math.max(0, Math.round((Date.now() - start) / 60000));
  }

  private clearMatchKeys(): void {
    localStorage.removeItem('matchId');
    localStorage.removeItem('match-start');
    localStorage.removeItem('players');
  }

  // === LÓGICA CRÍTICA PARA O LAYOUT ===

  getGridCols(count: number): string {
    switch (count) {
      case 2: return 'grid-rows-2';
      case 3: return 'grid-cols-2 grid-rows-2';
      case 4: return 'grid-cols-2 grid-rows-2';

      // PARA 5 JOGADORES (Igual à imagem): Grid base de 6 colunas
      case 5: return 'grid-cols-6 grid-rows-2';

      case 6: return 'grid-cols-3 grid-rows-2';
      default: return 'grid-cols-2 grid-rows-2';
    }
  }

  getPlayerSpan(index: number, count: number): string {
    if (count === 3 && index === 0) return 'col-span-2';

    // PARA 5 JOGADORES:
    // Os 2 primeiros (topo) ocupam 3 colunas cada (metade da tela)
    // Os 3 últimos (baixo) ocupam 2 colunas cada (um terço da tela)
    if (count === 5) return index < 2 ? 'col-span-3' : 'col-span-2';

    return '';
  }

  getRotation(index: number, count: number): string {
    let shouldRotate = false;
    // Gira a "metade de cima" da mesa
    if (count === 5) shouldRotate = index < 2;
    else if (count <= 3) shouldRotate = index === 0;
    else shouldRotate = index < (count / 2);

    return shouldRotate ? 'rotate-180' : '';
  }
}
