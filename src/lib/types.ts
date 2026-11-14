// Wire types for the Lumo gateway. These mirror the Go structs in the service
// repos (lumo-contracts and each svc-*/internal/api). Times are RFC 3339 strings.

export type ID = string;

export interface Page<T> {
  items: T[];
  next_cursor?: string | null;
}

export interface ErrorBody {
  error: { code: string; message: string; fields?: Record<string, string>; trace_id?: string };
}

// ---------- identity ----------
export type Platform = 'ios' | 'android' | 'web';

export interface Device {
  device_id: string;
  device_name: string;
  platform: Platform;
}

export interface Tokens {
  access_token: string;
  access_expires_at: string;
  refresh_token: string;
  refresh_expires_at: string;
  token_type: string;
  session_id: string;
}

export interface UserPublic {
  id: ID;
  handle: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  verified: boolean;
  adult: boolean;
  status: string;
  created_at: string;
}

export interface LinkedIdentity {
  provider: OAuthProvider;
  email?: string;
  linked_at: string;
}

export interface Me extends UserPublic {
  email?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  has_password: boolean;
  identities: LinkedIdentity[];
  roles: string[];
}

export interface SignInResult {
  tokens: Tokens;
  user: UserPublic;
  is_new: boolean;
  needs_birth_date: boolean;
}

export type OtpChannel = 'sms' | 'email';
export type OAuthProvider = 'google' | 'apple' | 'facebook' | 'x' | 'line' | 'kakao';

export interface ProviderCredential {
  id_token?: string;
  access_token?: string;
  code?: string;
  code_verifier?: string;
  redirect_uri?: string;
  nonce?: string;
  full_name?: string;
}

export interface SignUpExtras {
  birth_date?: string; // YYYY-MM-DD
  display_name?: string;
}

export interface SessionView {
  id: ID;
  device_name: string;
  platform: string;
  method: string;
  ip: string;
  created_at: string;
  last_used_at: string;
  current: boolean;
}

export interface QrCreate {
  qr_id: string;
  poll_token: string;
  qr_payload: string;
  expires_in: number;
}

export interface QrInfo {
  device: string;
  platform: string;
  ip: string;
}

export interface MePatch {
  handle?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  birth_date?: string;
}

// ---------- wallet ----------
export interface Balance {
  coins: number;
  diamonds: number;
}

export interface Gift {
  id: string;
  name: string;
  coins: number;
}

export interface CoinPack {
  id: string;
  coins: number;
  google_product_id: string;
  apple_product_id: string;
  web_amount_kobo: number;
}

export interface Catalog {
  gifts: Gift[];
  packs: CoinPack[];
}

export interface LedgerEntry {
  id: number;
  kind: string;
  currency: 'coins' | 'diamonds' | string;
  amount: number;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface PurchaseTag {
  google_obfuscated_account_id: string;
  apple_app_account_token: string;
}

export interface GiftSendInput {
  receiver_id: ID;
  gift_id: string;
  qty: number;
  room_id?: ID;
  video_id?: ID;
  from_backpack?: boolean;
}

export interface GiftSendResult {
  gift_send_id: ID;
  coins_spent: number;
  balance: number;
  replayed: boolean;
}

export interface PurchaseResult {
  purchase_id: ID;
  coins_added: number;
  balance: number;
  duplicate?: boolean;
}

export interface PayoutResult {
  payout_id: ID;
  status: string;
  diamonds_left: number;
}

// ---------- live ----------
export type LiveCategory = 'music' | 'talk' | 'dance' | 'gaming' | 'cooking' | 'sports' | 'education' | 'other';

export interface Room {
  id: ID;
  host_id: ID;
  host?: UserPublic;
  title: string;
  category: LiveCategory;
  viewers: number;
  gift_coins: number;
  goal_coins: number;
  goal_label: string;
  pk_id?: ID | null;
  started_at: string;
  allow_gifts: boolean;
}

export interface Connection {
  mode: 'webrtc' | 'hls' | 'rtmp';
  url: string;
  token?: string;
  room_name?: string;
  rtmp_url?: string;
  rtmp_stream_key?: string;
}

export interface CreateRoomInput {
  title: string;
  category: LiveCategory;
  source: 'app' | 'rtmp';
  allow_pk: boolean;
  allow_gifts: boolean;
  save_replay: boolean;
  goal_coins: number;
  goal_label: string;
}

export interface CreateRoomResult {
  room: Room;
  connection: Connection;
}

export interface StreamKey {
  rtmp_url: string;
  stream_key: string;
}

export interface PkBattle {
  pk_id: ID;
  status: 'pending' | 'active' | 'declined' | 'ended' | string;
  room_a: ID;
  room_b: ID;
  /** Unix seconds. */
  ends_at?: number;
  cross_token?: string;
  cross_url?: string;
}

// ---------- social ----------
export interface Edge {
  user: UserPublic;
  followed_at: string;
}

export interface FollowCounts {
  followers: number;
  following: number;
  likes_received: number;
}

export interface Relationship {
  following: boolean;
  followed_by: boolean;
  blocking: boolean;
}

export interface VideoCounts {
  video_id: ID;
  likes: number;
  comments: number;
  liked_by_me: boolean;
}

export interface Comment {
  id: ID;
  video_id: ID;
  parent_id?: ID | null;
  user: UserPublic;
  text: string;
  created_at: string;
}

export type ReportTarget = 'user' | 'video' | 'comment' | 'room' | 'message';
export type ReportReason =
  | 'spam'
  | 'nudity'
  | 'violence'
  | 'harassment'
  | 'hate'
  | 'minor_safety'
  | 'scam'
  | 'self_harm'
  | 'other';

// ---------- media ----------
export type VideoKind = 'short' | 'long' | 'replay';
export type Visibility = 'public' | 'followers' | 'private';
export type UploadContentType = 'video/mp4' | 'video/quicktime' | 'video/webm';

export interface Video {
  id: ID;
  owner_id: ID;
  kind: VideoKind;
  status: 'uploading' | 'processing' | 'ready' | 'failed' | 'removed' | string;
  visibility: Visibility;
  title: string;
  description: string;
  hashtags: string[];
  hls_url?: string;
  thumbnail_url?: string;
  duration_ms: number;
  width: number;
  height: number;
  views: number;
  created_at: string;
}

export interface UploadStartInput {
  kind: Exclude<VideoKind, 'replay'>;
  size_bytes: number;
  content_type: UploadContentType;
  title: string;
  description: string;
  visibility: Visibility;
}

export interface UploadStart {
  video_id: ID;
  part_size: number;
  parts: number;
  part_urls: string[];
  expires_at: number;
}

export interface UploadedPart {
  number: number;
  etag: string;
}

// ---------- feed ----------
export interface FeedItem {
  id: ID;
  kind: VideoKind;
  author: UserPublic;
  hls_url: string;
  thumbnail_url: string;
  title: string;
  description: string;
  duration_ms: number;
  width: number;
  height: number;
  likes: number;
  comments: number;
  created_at: string;
}

export interface Impression {
  video_id: ID;
  watch_ms: number;
}

// ---------- notifier ----------
export interface NotifyPrefs {
  new_follower: boolean;
  comments: boolean;
  likes: boolean;
  live: boolean;
  messages: boolean;
}

export interface InboxItem {
  id: number;
  kind: 'follow' | 'comment' | 'likes' | 'payout' | string;
  actor_id?: ID;
  actor_name?: string;
  actor_avatar?: string;
  title: string;
  body?: string;
  data: Record<string, string>;
  created_at: string;
  read: boolean;
}

// ---- wallet extras ----
export interface WalletStats {
  level: number;
  coins_spent: number;
  level_start_coins: number;
  next_level_coins: number;
  diamonds_week: number;
  diamonds_earned_total: number;
}

export interface UserLevel {
  user_id: ID;
  level: number;
}

export interface CheckinReward {
  gift_id: string;
  qty: number;
}

export interface BackpackItem extends Gift {
  qty: number;
}

export interface Backpack {
  items: BackpackItem[];
  checked_in_today: boolean;
  streak: number;
  next_reward: CheckinReward;
}

export interface CheckinResult {
  already_checked_in: boolean;
  streak: number;
  reward: CheckinReward;
}

export interface Bank {
  code: string;
  name: string;
}

export interface PayoutAccount {
  bank_code: string;
  bank_name: string;
  account_last4: string;
  account_name: string;
  updated_at: string;
}

export interface Payout {
  id: ID;
  user_id: ID;
  diamonds: number;
  amount_kobo: number;
  bank_label: string;
  status: 'pending_review' | 'processing' | 'paid' | 'rejected' | 'failed';
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface ImageUpload {
  upload_url: string;
  url: string;
  expires_at: number;
}

// ---- direct messages ----
export interface Conversation {
  id: ID;
  peer: UserPublic;
  last_message_at?: string;
  last_preview: string;
  last_from_me: boolean;
  unread: number;
  peer_read_at?: string;
}

export interface DirectMessage {
  id: ID;
  conversation_id: ID;
  sender_id: ID;
  client_id?: string;
  text: string;
  created_at: string;
  deleted?: boolean;
}
