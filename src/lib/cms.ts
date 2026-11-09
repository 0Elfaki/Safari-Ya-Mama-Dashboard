// Website CMS calls (tables and functions in ../safari-ya-mama/supabase/migrations/20261107000200_website_cms.sql).
// Reads use the staff RLS policies; every write goes through a security definer function that checks the role.
import { ApiError, friendly } from './api';
import { supabase } from './supabase';

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) throw new ApiError(friendly(error), error.code);
  return data as T;
}
function must<T>(r: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (r.error) throw new ApiError(friendly(r.error), r.error.code);
  return r.data as T;
}

export const WEBSITE_URL = ((import.meta.env.VITE_WEBSITE_URL as string | undefined) ?? 'https://safariyamama.com').replace(/\/$/, '');

// ───────── blog
export const CATEGORIES = ['Maternal Health', 'FemTech and AI', 'Research and Innovation', 'Community Stories', 'Product Updates'] as const;
export type Category = (typeof CATEGORIES)[number];
export type Block =
  | { type: 'p' | 'h2' | 'h3'; text: string }
  | { type: 'quote'; text: string; source?: string }
  | { type: 'ul'; items: string[] };
export interface PostDraft {
  title: string; slug: string; excerpt: string; category: Category; author_id: string; published_at: string | null;
  reading_minutes: number | null; cover_url: string | null; cover_small_url: string | null; cover_alt: string | null;
  featured: boolean; body: Block[]; seo_title: string | null; seo_description: string | null;
}
export type PostStatus = 'draft' | 'in_review' | 'published' | 'unpublished';
export type HealthReview = 'not_needed' | 'requested' | 'approved' | 'changes_requested';
export interface Post {
  id: string; slug: string; title: string; excerpt: string; category: Category; author_id: string; published_at: string; published: boolean;
  featured: boolean; status: PostStatus; draft: Partial<PostDraft>; has_draft_changes: boolean; draft_updated_at: string; created_by: string | null;
  health_review: HealthReview; reviewed_by: string | null; reviewed_on: string | null; review_note: string | null; archived: boolean; updated_at: string;
  cover_url: string | null;
}
export interface Author { id: string; name: string; role: string | null; bio: string | null; archived: boolean }
export interface Revision { id: number; table_name: string; row_id: string; snapshot: Record<string, unknown>; author: string | null; note: string; created_at: string; who?: { display_name: string } | null }

export async function posts(): Promise<Post[]> {
  return must(await supabase.from('blog_posts').select('id,slug,title,excerpt,category,author_id,published_at,published,featured,status,draft,has_draft_changes,draft_updated_at,created_by,health_review,reviewed_by,reviewed_on,review_note,archived,updated_at,cover_url')
    .order('updated_at', { ascending: false })) as Post[];
}
export async function post(id: string): Promise<Post | null> {
  return must(await supabase.from('blog_posts').select('*').eq('id', id).maybeSingle()) as Post | null;
}
export async function authors(): Promise<Author[]> {
  return must(await supabase.from('blog_authors').select('id,name,role,bio,archived').order('name')) as Author[];
}
export const savePost = (id: string | null, draft: PostDraft, expected: string | null) =>
  rpc<{ id: string; draft_updated_at: string; health_review: HealthReview }>('blog_save', { p_id: id, p_draft: draft, p_expected: expected });
export const submitPost = (id: string) => rpc('blog_submit', { p_id: id });
export const reviewPost = (id: string, decision: 'requested' | 'approved' | 'changes_requested', note: string | null, reviewer: string | null) =>
  rpc('blog_review', { p_id: id, p_decision: decision, p_note: note, p_reviewer: reviewer });
export const publishPost = (id: string) => rpc('blog_publish', { p_id: id });
export const unpublishPost = (id: string) => rpc('blog_unpublish', { p_id: id });
export const archivePost = (id: string, archived: boolean) => rpc('blog_archive', { p_id: id, p_archived: archived });
export const restorePost = (id: string, revision: number) => rpc('blog_restore', { p_id: id, p_revision: revision });
export const saveAuthor = (a: { id: string; name: string; role: string; bio: string }) => rpc('blog_author_save', { p_id: a.id, p_name: a.name, p_role: a.role, p_bio: a.bio });
export const archiveAuthor = (id: string) => rpc('blog_author_archive', { p_id: id });

export async function revisions(table: string, rowId: string): Promise<Revision[]> {
  return must(await supabase.from('revisions').select('id,table_name,row_id,snapshot,author,note,created_at').eq('table_name', table).eq('row_id', rowId)
    .order('id', { ascending: false }).limit(50)) as Revision[];
}
export const previewToken = () => rpc<string>('preview_token');

// ───────── pages
export interface Section {
  id: string; page: string; section_key: string; label: string; sort: number; visible: boolean; data: Record<string, unknown> | null;
  draft: Record<string, unknown>; draft_sort: number; draft_visible: boolean; defaults: Record<string, unknown>; published: boolean;
  has_changes: boolean; version: number; updated_at: string; published_at: string | null;
}
export async function sections(): Promise<Section[]> {
  return must(await supabase.from('site_sections').select('*').eq('archived', false).order('page').order('draft_sort')) as Section[];
}
export const importSections = (list: { page: string; key: string; label: string; sort: number; data: unknown }[]) => rpc<number>('site_sections_import', { p_sections: list });
export const saveSection = (id: string, draft: Record<string, unknown>, visible: boolean, expected: string | null) =>
  rpc<string>('site_section_save', { p_id: id, p_draft: draft, p_visible: visible, p_expected: expected });
export const reorderSections = (page: string, ids: string[]) => rpc('site_sections_reorder', { p_page: page, p_ids: ids });
export const publishSection = (id: string) => rpc('site_section_publish', { p_id: id });
export const publishPage = (page: string) => rpc<number>('site_page_publish', { p_page: page });
export const resetSection = (id: string) => rpc('site_section_reset', { p_id: id });
export const restoreSection = (id: string, revision: number) => rpc('site_section_restore', { p_id: id, p_revision: revision });

// ───────── settings and SEO
export interface Setting { key: string; value: Record<string, unknown> | null; draft: Record<string, unknown>; has_changes: boolean; updated_at: string }
export async function settings(): Promise<Setting[]> { return must(await supabase.from('site_settings').select('key,value,draft,has_changes,updated_at')) as Setting[]; }
export const saveSetting = (key: string, draft: Record<string, unknown>, publish: boolean) => rpc('site_setting_save', { p_key: key, p_draft: draft, p_publish: publish });
export interface SeoPage { path: string; title: string | null; description: string | null; share_image_url: string | null; noindex: boolean; updated_at: string }
export async function seoPages(): Promise<SeoPage[]> { return must(await supabase.from('seo_pages').select('*').order('path')) as SeoPage[]; }
export const saveSeo = (p: { path: string; title: string; description: string; image: string; noindex: boolean }) =>
  rpc('seo_save', { p_path: p.path, p_title: p.title, p_description: p.description, p_image: p.image, p_noindex: p.noindex });

// ───────── media library (site-media bucket + media table)
export interface MediaItem { id: string; path: string; url: string; url_small: string | null; width: number | null; height: number | null; bytes: number | null; alt: string; kind: 'illustration' | 'photo' | 'screenshot' | 'logo'; created_at: string }
export async function mediaItems(): Promise<MediaItem[]> {
  return must(await supabase.from('media').select('id,path,url,url_small,width,height,bytes,alt,kind,created_at').eq('archived', false).order('created_at', { ascending: false })) as MediaItem[];
}
export const registerMedia = (m: { path: string; url: string; url_small: string | null; width: number; height: number; bytes: number; alt: string; kind: MediaItem['kind'] }) =>
  rpc<string>('media_register', { p_path: m.path, p_url: m.url, p_url_small: m.url_small, p_width: m.width, p_height: m.height, p_bytes: m.bytes, p_alt: m.alt, p_kind: m.kind });
export const updateMedia = (id: string, alt: string, kind: MediaItem['kind']) => rpc('media_update', { p_id: id, p_alt: alt, p_kind: kind });
export const mediaUsage = (url: string) => rpc<{ kind: string; label: string }[]>('media_usage', { p_url: url });
export const archiveMedia = (id: string) => rpc('media_archive', { p_id: id });

// ───────── partners, impact figures, inbox
export interface Partner { id: string; name: string; logo_url: string | null; logo_alt: string | null; url: string | null; relationship: string | null; status: 'proposed' | 'confirmed'; sort: number; published: boolean; updated_at: string }
export async function partners(): Promise<Partner[]> { return must(await supabase.from('partners').select('*').eq('archived', false).order('sort').order('name')) as Partner[]; }
export const savePartner = (p: { id: string | null; name: string; logo_url: string; logo_alt: string; url: string; relationship: string; sort: number }) =>
  rpc<string>('partner_save', { p_id: p.id, p_name: p.name, p_logo_url: p.logo_url, p_logo_alt: p.logo_alt, p_url: p.url, p_relationship: p.relationship, p_sort: p.sort });
export const confirmPartner = (id: string, confirmed: boolean) => rpc('partner_confirm', { p_id: id, p_confirmed: confirmed });
export const publishPartner = (id: string, published: boolean) => rpc('partner_publish', { p_id: id, p_published: published });
export const archivePartner = (id: string) => rpc('partner_archive', { p_id: id });

export interface ImpactKpi { id: string; label: string; value: number; unit: string | null; source: string; is_demo: boolean; sort: number; published: boolean; updated_at: string }
export async function impactKpis(): Promise<ImpactKpi[]> { return must(await supabase.from('impact_kpis').select('*').eq('archived', false).order('sort').order('label')) as ImpactKpi[]; }
export const saveImpact = (k: { id: string | null; label: string; value: number; unit: string; source: string; is_demo: boolean; sort: number }) =>
  rpc<string>('impact_save', { p_id: k.id, p_label: k.label, p_value: k.value, p_unit: k.unit, p_source: k.source, p_is_demo: k.is_demo, p_sort: k.sort });
export const publishImpact = (id: string, published: boolean) => rpc('impact_publish', { p_id: id, p_published: published });
export const archiveImpact = (id: string) => rpc('impact_archive', { p_id: id });

export interface Message { id: string; name: string; organisation: string | null; email: string; topic: string | null; message: string; status: 'new' | 'replied' | 'archived'; note: string | null; created_at: string }
export async function messages(): Promise<Message[]> {
  return must(await supabase.from('contact_messages').select('id,name,organisation,email,topic,message,status,note,created_at').order('created_at', { ascending: false }).limit(500)) as Message[];
}
export const setMessageStatus = (id: string, status: Message['status'], note: string | null) => rpc('contact_set_status', { p_id: id, p_status: status, p_note: note });
