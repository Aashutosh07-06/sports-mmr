// icons, colours and blurbs for each game (model details come from the API)
import { Castle, Crosshair, Map, Zap } from 'lucide-react'

export const GAME_META = {
  csgo: {
    icon: Crosshair,
    accent: '#F5A524',
    title: 'CS:GO',
    subtitle: 'Counter-Strike: Global Offensive',
    blurb: 'Rate a professional-level map performance from kills, damage, KAST and opening duels.',
    scope: 'Trained on HLTV professional matches (2015–2020). CS2 stat lines are comparable but were not in the training data.',
  },
  pubg: {
    icon: Map,
    accent: '#34D399',
    title: 'PUBG',
    subtitle: 'PUBG: Battlegrounds',
    blurb: 'Estimate where your team finishes in the lobby from combat, movement and item use.',
    scope: 'Trained on public PUBG matches from the Kaggle placement-prediction competition.',
  },
  valorant: {
    icon: Zap,
    accent: '#FB7185',
    title: 'VALORANT',
    subtitle: 'VALORANT',
    blurb: 'Rate a map performance on the professional scale from ACS, ADR, KAST and first bloods.',
    scope: 'Trained on professional match statistics from vlr.gg (Oct 2021 – Apr 2023).',
  },
  dota2: {
    icon: Castle,
    accent: '#F97316',
    title: 'Dota 2',
    subtitle: 'Dota 2',
    blurb: 'How strongly does your end-of-match stat line point to a win? Get a win probability.',
    scope: 'Trained on ranked All-Pick matches from a 50,000-match YASP/OpenDota sample.',
  },
}

export const GAME_ORDER = ['csgo', 'pubg', 'valorant', 'dota2']

export const metaFor = (key) =>
  GAME_META[key] || { icon: Crosshair, accent: '#94A3B8', title: key, subtitle: key, blurb: '', scope: '' }
