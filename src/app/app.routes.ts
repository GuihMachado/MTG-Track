import { CanActivateFn, CanDeactivateFn, Router, Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { inject, PLATFORM_ID } from '@angular/core'; // <--- Importe PLATFORM_ID
import { isPlatformBrowser } from '@angular/common'; // <--- Importe isPlatformBrowser
import { Dashboard } from './pages/dashboard/dashboard';
import { Cards } from './pages/cards/cards';
import { Matches } from './pages/matches/matches';
import { Ranking } from './pages/ranking/ranking';
import { Proxies } from './pages/proxies/proxies';
import { Rules } from './pages/house-rules/house-rules';
import { Profile } from './pages/profile/profile';
import { Collection } from './pages/collection/collection';
import { CollectionImport } from './pages/collection/import/import';
import { DeckDetail } from './pages/decks/deck-detail/deck-detail';
import { SetBinder } from './pages/collection/set-binder/set-binder';
import { Stats } from './pages/stats/stats';
import { DeckStatsPage } from './pages/stats/deck-stats/deck-stats';
import { Matchups } from './pages/stats/matchups/matchups';

const authGuard: CanActivateFn = () => {
    const router = inject(Router);
    const platformId = inject(PLATFORM_ID);

    if (isPlatformBrowser(platformId)) {
        if (localStorage.getItem('auth-token')) {
        return true;
        }

        router.navigate(['/']); // rota de login é ''
        return false;
    }
    return true; 
};

const matchGuard: CanActivateFn = () => {
    const router = inject(Router);
    const platformId = inject(PLATFORM_ID);

    if (isPlatformBrowser(platformId)) {
        if (localStorage.getItem('matchId')) {
            return true;
        }

        router.navigate(['./play']);
        return false;
    }
    return true; 
};

/**
 * A mesa só se deixa quando a partida fecha. Toda saída legítima (encerrar,
 * partida inválida, sessão expirada) apaga o `matchId` antes de navegar; o que
 * chega aqui com a partida ainda aberta é o gesto de voltar do sistema — um
 * deslize lateral sem querer no meio do jogo. A navegação é recusada e o
 * `canceledNavigationResolution: 'computed'` (app.config) devolve o histórico
 * para onde estava.
 */
const stayAtTable: CanDeactivateFn<unknown> = () => {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
    return !localStorage.getItem('matchId');
};

export const routes: Routes = [
    {
        path: '',
        component: Login
    },
    {
        path: 'register',
        component: Register
    },
    { 
        path: 'dashboard', 
        component: Dashboard,
        canActivate: [authGuard]
    },
    {
        path: 'play',
        // Sob demanda: tela de fluxo (a maior do grupo de decks) que não
        // precisa pesar na primeira carga do app.
        loadComponent: () => import('./pages/new-match/new-match').then(m => m.NewMatch),
        canActivate: [authGuard]
    },
    {
        path: 'match',
        // Sob demanda: a mesa (grade, folha de comandos, diálogos) só pesa
        // para quem abre uma partida.
        loadComponent: () => import('./pages/match/match').then(m => m.Match),
        canActivate: [authGuard, matchGuard],
        canDeactivate: [stayAtTable]
    },
    {
        path: 'matchs',
        component: Matches,
        canActivate: [authGuard]
    },
    {
        path: 'matchs/:id',
        loadComponent: () =>
            import('./pages/matches/match-detail/match-detail').then(m => m.MatchDetail),
        canActivate: [authGuard]
    },
    {
        path: 'ranking',
        component: Ranking,
        canActivate: [authGuard]
    },
    {
        path: 'cards',
        component: Cards,
        canActivate: [authGuard]
    },
    {
        path: 'rules',
        component: Rules,
        canActivate: [authGuard]
    },
    {
        path: 'proxies',
        component: Proxies,
        canActivate: [authGuard]
    },
    {
        path: 'profile',
        component: Profile,
        canActivate: [authGuard]
    },
    {
        path: 'colecao',
        component: Collection,
        canActivate: [authGuard]
    },
    {
        path: 'colecao/importar',
        component: CollectionImport,
        canActivate: [authGuard]
    },
    {
        path: 'colecao/edicao/:code',
        component: SetBinder,
        canActivate: [authGuard]
    },
    // 'decks/novo' antes de 'decks/:id', senão "novo" vira id de deck.
    {
        path: 'decks/novo',
        loadComponent: () => import('./pages/decks/deck-edit/deck-edit').then(m => m.DeckEdit),
        canActivate: [authGuard]
    },
    {
        path: 'decks/:id/editar',
        loadComponent: () => import('./pages/decks/deck-edit/deck-edit').then(m => m.DeckEdit),
        canActivate: [authGuard]
    },
    {
        path: 'decks/:id',
        component: DeckDetail,
        canActivate: [authGuard]
    },
    // Estatísticas por deck: o :commander é o deckKey normalizado, para o
    // link ser compartilhável e o voltar do navegador funcionar.
    {
        path: 'estatisticas',
        component: Stats,
        canActivate: [authGuard]
    },
    {
        path: 'estatisticas/:commander',
        component: DeckStatsPage,
        canActivate: [authGuard]
    },
    {
        path: 'estatisticas/:commander/confrontos',
        component: Matchups,
        canActivate: [authGuard]
    }
];