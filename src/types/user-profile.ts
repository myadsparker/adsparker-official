export interface MetaAdAccount {
  id: string;
  name: string;
  account_status: number;
}

export interface MetaProfile {
  id: string;
  name: string;
  email: string;
}

export interface MetaAccount {
  access_token: string;
  profile: MetaProfile;
  ad_accounts: MetaAdAccount[];
  connected_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  meta_accounts: MetaAccount[];
  meta_connected: boolean;
  created_at: string;
  updated_at: string;
}
