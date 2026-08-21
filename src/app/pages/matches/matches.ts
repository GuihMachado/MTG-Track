import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toast } from 'ngx-sonner';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { MatchService } from '../../services/match-service';
import { MatchDto } from '../../models/match.models';
import { MatchCardComponent } from '../../shared/match-card/match-card.component';

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [
    CommonModule,
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

  protected matches = signal<MatchDto[]>([]);
  protected loading = signal(true);
  protected currentUserId = signal(0);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const userId = Number(localStorage.getItem('user-id')) || 0;
    this.currentUserId.set(userId);

    this.matchService.getMatchesByUser(userId).subscribe({
      next: (matches) => {
        this.matches.set(matches);
        this.loading.set(false);
      },
      error: (error) => {
        toast(error.error?.message ?? 'Erro ao carregar as partidas.');
        this.loading.set(false);
      }
    });
  }
}
