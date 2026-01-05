import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export interface Player {
  id: number;
  life: number;
  color: string;
  cmdDamage: number;
}

@Component({
  selector: 'app-match',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './match.html',
  styleUrls: ['./match.css'] // Certifique-se que este arquivo existe, mesmo vazio
})
export class Match implements OnInit {
  private platformId = inject(PLATFORM_ID);

  // Cores mais vibrantes baseadas na imagem
  private readonly playerColors = [
    '#A4C639', // Verde
    '#EECFA1', // Bege
    '#2F4F4F', // Azul Petróleo escuro
    '#B22222', // Vermelho
    '#4682B4', // Azul Claro
    '#808080'  // Cinza
  ];

  players: Player[] = [];

  ngOnInit(): void {
    const startCount = this.getStoredPlayerCount();
    this.initializeGame(startCount);
  }

  // ... (getStoredPlayerCount, initializeGame, updateLife, openMenu IGUAIS AO ANTERIOR) ...
  private getStoredPlayerCount(): number {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('players');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 2 && parsed <= 6) return parsed;
      }
    }
    return 4;
  }

  initializeGame(count: number): void {
    this.players = Array.from({ length: count }, (_, i) => ({
      id: i + 1, life: 40, color: this.playerColors[i % this.playerColors.length], cmdDamage: 0
    }));
  }

  updateLife(player: Player, amount: number): void { player.life += amount; }
  openMenu(): void { console.log('Menu'); }


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