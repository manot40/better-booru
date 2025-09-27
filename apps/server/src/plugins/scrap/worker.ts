import type { Setup } from 'server';
import type { DBTagData } from 'db/schema';
import type { DanbooruResponse } from '@boorugator/shared/types';

import { desc, sql } from 'drizzle-orm';
import { db, schema as $s } from 'db';

import { getDanbooruImage } from 'utils/danbooru';
import { random, isMetaTag } from 'utils/common';
import SQLiteStore, { type CacheResult } from 'lib/cache/sqlite';

import { log } from 'plugins/logger';
import { addTask } from 'plugins/ipx/lqip-worker';

const pendingStore = new SQLiteStore('.data/pending_scrap.db');

export async function run(store_: unknown) {
  const { lqip_worker } = (store_ as CronStore)?.cron || {};
  const state = { last: (await findFirst.execute())?.id || 0, isEnd: false };

  while (!state.isEnd) {
    const delay = random(800, 1800);
    await new Promise<void>((res) => setTimeout(() => scrap(state).then(res), delay));
  }

  if (lqip_worker && !lqip_worker.isBusy()) {
    lqip_worker.trigger();
  }

  const pendings = pendingStore.db
    .query<CacheResult, [number]>('SELECT * FROM cache WHERE expires < ?')
    .all(Math.round(Date.now() / 1000))
    .map((r) => r.key);

  if (pendings.length > 0) {
    const pendingPayload: Payload[] = [];

    for (const key of pendings) {
      const id = +key;
      const res = await fetch(getDanbooruURL(id, true)).catch(() => null);

      if (res?.ok) {
        const data: DanbooruResponse = await res.json();
        if (data) pendingPayload.push({ ...toPayload(data), pending: true });
      }

      await new Promise((r) => setTimeout(r, 50));
    }

    await execute(pendingPayload).catch((e) => log('ERROR', `[SCRAP] ${(e as Error).message}`));
  }
}

async function scrap(state: State): Promise<void> {
  const res = await fetch(getDanbooruURL(state.last)).catch(() => null);
  if (!res?.ok) return;

  const data = (await res.json()) as DanbooruResponse[];
  if (!data || !Array.isArray(data) || data.length < 200) {
    state.isEnd = true;
    return;
  }

  const danbooruData = data
    .filter((d) => !!d.md5 && d.score > -1)
    .reverse()
    .map(toPayload);
  if (danbooruData.length === 0) return;

  log('INFO', `[SCRAP] Processing batch: ${danbooruData[0]?.id} ${danbooruData.at(-1)?.id}`);

  try {
    await execute(danbooruData);
    state.last = danbooruData.at(-1)!.id;
  } catch (e) {
    log('ERROR', `[SCRAP] ${(e as Error).message}`);
  }
}

async function execute(inputData: Payload[]) {
  await db.transaction(async (tx) => {
    const data: (typeof $s.postTable.$inferInsert)[] = [];
    const lqipTasks: Parameters<typeof addTask>[] = [];

    for (let i = 0; i < inputData.length; i++) {
      const { tags: t, pending, ...rest } = inputData[i];

      const tagsMap = Object.entries(t).flatMap(([cat, t1]) =>
        t1.map((tagName) => ({ category: +cat, tagName }))
      );
      const tagsName = tagsMap.map((t) => t.tagName.slice(0, 100));

      let tag_ids: number[];
      let meta_ids: number[];

      const tagsFromDB = await tx.query.tagsTable.findMany({
        where: (table, { inArray }) => inArray(table.name, tagsName),
        orderBy: (table, { asc }) => asc(table.category),
      });

      const insertTags = (data: TagInsert[]) =>
        tx
          .insert($s.tagsTable)
          .values(data)
          .returning({ id: $s.tagsTable.id })
          .then((res) => res.map((r) => r.id));

      if (tagsFromDB.length === 0) {
        const { tagsInsert, metaInsert } = tagsName.reduce(
          (acc, name, i) => {
            const category = tagsMap[i].category;
            if (isMetaTag(category)) acc.metaInsert.push({ name, category });
            else acc.tagsInsert.push({ name, category });
            return acc;
          },
          { tagsInsert: [], metaInsert: [] } as TagInsertMap
        );

        tag_ids = await insertTags(tagsInsert);
        meta_ids = await insertTags(metaInsert);
      } else {
        const { existingTags, existingMeta } = tagsFromDB.reduce(
          (acc, tag) => {
            if (isMetaTag(tag.category)) acc.existingMeta.push(tag);
            else acc.existingTags.push(tag);
            return acc;
          },
          { existingTags: [], existingMeta: [] } as ExistingTagsMap
        );

        const { tagsInsert, metaInsert } = tagsName.reduce(
          (acc, name, i) => {
            const category = tagsMap[i].category;
            const existing = tagsFromDB.some((t) => t.name === name);

            if (!existing) {
              if (isMetaTag(category)) acc.metaInsert.push({ name, category });
              else acc.tagsInsert.push({ name, category });
            }

            return acc;
          },
          { tagsInsert: [], metaInsert: [] } as TagInsertMap
        );

        if (tagsInsert.length > 0) {
          const inserted = await insertTags(tagsInsert);
          tag_ids = [...existingTags.map((t) => t.id), ...inserted];
        }
        if (metaInsert.length > 0) {
          const inserted = await insertTags(metaInsert);
          meta_ids = [...existingMeta.map((t) => t.id), ...inserted];
        }

        tag_ids ??= existingTags.map((t) => t.id);
        meta_ids ??= existingMeta.map((t) => t.id);
      }

      if (!pending && (!tag_ids.length || !meta_ids.length)) {
        pendingStore.set(`${rest.id}`, `${rest.hash}`, 60 * 60 * 4);
        continue;
      } else if (pending) {
        pendingStore.delete(`${rest.id}`);
        if (!tag_ids.length) tag_ids.push(0);
        if (!meta_ids.length) meta_ids.push(0);
      }

      data.push({ ...rest, tag_ids, meta_ids });
      lqipTasks.push([rest.sample_url || rest.file_url, rest.hash]);
    }

    await tx
      .insert($s.postTable)
      .values(data)
      .onConflictDoUpdate({
        target: $s.postTable.id,
        set: {
          tag_ids: sql.raw(`excluded.${$s.postTable.tag_ids.name}`),
          meta_ids: sql.raw(`excluded.${$s.postTable.meta_ids.name}`),
        },
      })
      .then(() => lqipTasks.forEach((t) => addTask(...t)));
  });
}

const findFirst = db.query.postTable.findFirst({ orderBy: desc($s.postTable.id) }).prepare('findFirstPost');

const dedupe = (tags: string) =>
  Array.from(new Set(tags.split(' ')))
    .map((t) => t.trim())
    .filter(Boolean);
const getDanbooruURL = (id: number, postDetail = false) => {
  const url = new URL(postDetail ? `/posts/${id}.json` : '/posts.json', 'https://danbooru.donmai.us');

  url.searchParams.set('login', Bun.env.DANBOORU_USER_ID || '');
  url.searchParams.set('api_key', Bun.env.DANBOORU_API_KEY || '');

  if (!postDetail) {
    url.searchParams.set('limit', '200');
    url.searchParams.set('page', `a${id}`);
  }

  return url.toString();
};
const toPayload = (data: DanbooruResponse) =>
  ({
    id: data.id,
    hash: data.md5,
    score: data.score,
    source: data.source,
    rating: data.rating,
    pixiv_id: data.pixiv_id || null,
    parent_id: data.parent_id || null,
    has_notes: !!data.last_noted_at,
    file_size: data.file_size,
    uploader_id: data.uploader_id,
    created_at: new Date(data.created_at || Date.now()),
    ...getDanbooruImage(data),
    tags: {
      0: dedupe(data.tag_string_general),
      1: dedupe(data.tag_string_artist),
      3: dedupe(data.tag_string_copyright),
      4: dedupe(data.tag_string_character),
      5: dedupe(data.tag_string_meta),
    },
  }) satisfies Payload;

type State = { last: number; isEnd: boolean };
type TagInsert = typeof $s.tagsTable.$inferInsert;
type CronStore = Partial<Pick<Setup['store'], 'cron'>>;
type TagInsertMap = Record<'tagsInsert' | 'metaInsert', TagInsert[]>;
type ExistingTagsMap = Record<'existingTags' | 'existingMeta', DBTagData[]>;

export type Payload = { sample_url?: string | null; file_url: string; pending?: boolean } & Omit<
  typeof $s.postTable.$inferInsert & { tags: Record<0 | 1 | 3 | 4 | 5, string[]> },
  'tag_ids' | 'meta_ids'
>;
