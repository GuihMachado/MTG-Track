import { CanActivateFn, Router, Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { inject, PLATFORM_ID } from '@angular/core'; // <--- Importe PLATFORM_ID
import { isPlatformBrowser } from '@angular/common'; // <--- Importe isPlatformBrowser
import { Dashboard } from './pages/dashboard/dashboard';
import { Cards } from './pages/cards/cards';
import { NewMatch } from './pages/new-match/new-match';
import { Match } from './pages/match/match';
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
        component: NewMatch,
        canActivate: [authGuard]
    },
    {
        path: 'match',
        component: Match,
        canActivate: [authGuard, matchGuard]
    },
    {
        path: 'matchs',
        component: Matches,
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