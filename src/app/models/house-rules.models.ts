export const BANLIST_CATEGORIES = ['Overpowered', 'Salt/Unfun', 'Rule Breaking', 'Custom'] as const;

export type BanlistCategory = (typeof BANLIST_CATEGORIES)[number];

export interface RuleSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  listItems?: string[];
  warningNote?: string;
}

export interface BanlistItem {
  id: string;
  cardName: string;
  reason: string;
  category: BanlistCategory;
  imageUrl?: string;
}

export interface HouseRulesData {
  title: string;
  subtitle: string;
  /** ISO string vinda do servidor (@UpdateDateColumn). */
  lastUpdated: string;
  sections: RuleSection[];
  banlist: BanlistItem[];
}

export interface UpdateHouseRulesPayload {
  title: string;
  subtitle: string;
  sections: RuleSection[];
  banlist: BanlistItem[];
}
