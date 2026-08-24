import axios from 'axios';

const BASE_URL = 'https://mazzusim7i.eu-west-1.awsapprunner.com/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Interfaces for our app data structures

export interface Category {
  categoryId: string | number;
  categoryName: string;
}

export interface Series {
  seriesId: string | number;
  seriesName: string;
  seriesCoverUrl?: string;
  publishedMessagesCount?: number;
}

export interface Message {
  messageId: string | number;
  title: string;
  speaker: string;
  audioUrl: string;
  duration?: string; // in format hh:mm:ss or mm:ss
  publishedDate: string;
  seriesId?: string | number;
  seriesName?: string;
  coverUrl?: string;
  viewsCount?: number;
  downloadsCount?: number;
  categoryIds?: (string | number)[];
  originalTrackNumber?: number;
}

export interface Devotional {
  devotionalId: string | number;
  title: string;
  content: string;
  date: string; // yyyy-MM-dd
  bibleReading?: string;
  bibleVerse?: string;
  confession?: string;
  prayer?: string;
  thumbnailUrl?: string;
  audioUrl?: string;
}

export interface EventSession {
  sessionId: string | number;
  eventId: string | number;
  title: string;
  startTime: string; // ISO string or time string
  endTime: string;
  speaker?: string;
  topic?: string;
}

export interface ChurchEvent {
  eventId: string | number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  bannerImageUrl?: string;
  isPublished: boolean;
}

// Helper to map backend devotional object to UI Devotional interface
const mapDevotional = (d: any): Devotional => {
  let content = d.content || '';
  let confession = d.confession || '';
  let prayer = d.prayer || '';

  // If confession and prayer are empty, try to parse them from the content HTML
  if (!confession && !prayer && content) {
    const pattern = /<p>\s*<(strong|b)[^>]*>\s*(Confession|Prayer)\s*<\/\1>\s*<\/p>\s*<p>(.*?)<\/p>\s*$/i;
    const match = content.match(pattern);
    if (match) {
      const type = match[2].toLowerCase();
      const text = match[3].replace(/<[^>]*>/g, '').trim();
      if (type === 'confession') {
        confession = text;
      } else {
        prayer = text;
      }
      content = content.replace(pattern, '').trim();
    } else {
      const loosePattern = /<p>\s*<(strong|b)[^>]*>\s*(Confession|Prayer)\s*<\/\1>\s*<\/p>\s*([\s\S]*?)$/i;
      const looseMatch = content.match(loosePattern);
      if (looseMatch) {
        const type = looseMatch[2].toLowerCase();
        const text = looseMatch[3].replace(/<[^>]*>/g, '').trim();
        if (type === 'confession') {
          confession = text;
        } else {
          prayer = text;
        }
        content = content.replace(loosePattern, '').trim();
      }
    }
  }

  return {
    devotionalId: d.id || d.devotionalId,
    title: d.title || '',
    content: content,
    date: d.date ? d.date.split('T')[0] : '',
    bibleReading: d.scriptureText || d.bibleReading || '',
    bibleVerse: d.scriptureVerse || d.bibleVerse || '',
    confession: confession,
    prayer: prayer,
    thumbnailUrl: d.thumbnailUrl || '',
    audioUrl: d.audioUrl || d.audio_url || d.audio || '',
  };
};

// Helper to extract or parse track / part number from message properties or title
export const extractTrackNumber = (title?: string, rawObj?: any): number | null => {
  // 1. Check rawObj for explicit track/part/sequence property
  if (rawObj) {
    const explicitVal =
      rawObj.trackNumber ??
      rawObj.track_number ??
      rawObj.trackNo ??
      rawObj.track ??
      rawObj.sequence ??
      rawObj.order ??
      rawObj.part;
    if (explicitVal !== undefined && explicitVal !== null && !isNaN(Number(explicitVal)) && Number(explicitVal) > 0) {
      return Number(explicitVal);
    }
  }

  // 2. Try parsing from title
  if (!title) return null;
  const cleanTitle = title.trim();

  // Pattern A: "Part 1", "Pt 2", "Pt. 3", "Track 1", "Trk 2", "Session 1", "Episode 1", "Lesson 1", "Volume 1", "Vol 1"
  const partMatch = cleanTitle.match(/(?:part|pt\.?|track|trk\.?|session|episode|ep\.?|lesson|vol(?:ume)?\.?)\s*#?\s*(\d+)/i);
  if (partMatch && partMatch[1]) {
    const num = parseInt(partMatch[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }

  // Pattern B: "#1", "#02"
  const hashMatch = cleanTitle.match(/(?:^|\s)#(\d+)(?:\s|$)/);
  if (hashMatch && hashMatch[1]) {
    const num = parseInt(hashMatch[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }

  // Pattern C: Trailing or parenthesized digits: "- 1", "(2)", "- 3", "— 4"
  const tailMatch = cleanTitle.match(/(?:[-–—]\s*|\()(\d+)\s*(?:\)|$)/);
  if (tailMatch && tailMatch[1]) {
    const num = parseInt(tailMatch[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }

  return null;
};

// Memory caches for API responses to speed up screen rendering and prevent redundant loads
let cachedTodaysDevotional: Devotional | null = null;
let cachedUpcomingEvents: ChurchEvent[] | null = null;
let cachedCategories: Category[] | null = null;
let cachedAllSeries: Series[] | null = null;
let cachedRecentMessages: Message[] | null = null;
let cachedSeriesById: Record<string, { series: Series; messages: Message[] }> = {};

export const apiService = {
  // DEVOTIONALS
  getTodaysDevotional: async (forceRefresh = false): Promise<Devotional | null> => {
    if (!forceRefresh && cachedTodaysDevotional) {
      return cachedTodaysDevotional;
    }
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    try {
      const response = await apiClient.get<any>(`/devotionals/by-date/${formattedDate}`);
      let data = response.data?.data || response.data;
      if (Array.isArray(data)) {
        data = data[0];
      }
      if (data && data.title) {
        const mapped = mapDevotional(data);
        cachedTodaysDevotional = mapped;
        return mapped;
      }
      return null;
    } catch (error) {
      console.warn('Error fetching today\'s devotional:', error);
      return null;
    }
  },

  getDevotionalById: async (id: string | number): Promise<Devotional> => {
    const response = await apiClient.get<any>(`/devotionals/${id}`);
    const data = response.data?.data || response.data;
    return mapDevotional(data);
  },

  getDevotionals: async (
    page: number = 1,
    pageSize: number = 10,
    month?: number | string,
    year?: number | string
  ): Promise<{ data: Devotional[]; totalCount?: number }> => {
    const params: Record<string, any> = { pageNumber: page, pageSize };
    if (month) params.month = month;
    if (year) params.year = year;
    const response = await apiClient.get<any>(`/devotionals`, { params });
    const list = response.data?.data || response.data?.devotionals || (Array.isArray(response.data) ? response.data : []);
    return {
      data: list.map(mapDevotional),
      totalCount: response.data?.totalCount || response.data?.total || list.length,
    };
  },

  // TEACHINGS / SERMONS
  getRecentMessages: async (limit: number = 10, forceRefresh = false): Promise<Message[]> => {
    if (!forceRefresh && cachedRecentMessages) {
      return cachedRecentMessages.slice(0, limit);
    }
    try {
      const response = await apiClient.get<any>('/messages');
      const messagesList = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const validMessages = messagesList.filter((m: any) => {
        const audio = m.audioUrl || m.audio_url || m.audio;
        const isNotPublished = m.isPublished === false || m.is_published === false || m.status === 'draft' || m.status === 'unpublished';
        return !!audio && !isNotPublished;
      });
      const mapped = validMessages.map((m: any) => ({
        messageId: m.id || m.messageId,
        title: m.title || '',
        speaker: m.speaker || '',
        audioUrl: m.audioUrl || m.audio_url || m.audio || '',
        duration: m.duration || undefined,
        publishedDate: m.messageDate || m.createdAt || new Date().toISOString(),
        seriesId: m.seriesId,
        seriesName: m.series?.name,
        coverUrl: m.coverUrl || m.series?.coverUrl || '',
        viewsCount: m.viewsCount || 0,
        downloadsCount: m.downloadsCount || 0,
        categoryIds: m.messageCategories ? m.messageCategories.map((c: any) => c.categoryId) : [],
        originalTrackNumber: extractTrackNumber(m.title, m) || undefined,
      }));
      // Sort by publishedDate desc
      mapped.sort((a: Message, b: Message) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
      
      // Deduplicate by title and audioUrl
      const uniqueMapped: Message[] = [];
      const seen = new Set<string>();
      for (const m of mapped) {
        const key = `${m.title.trim().toLowerCase()}|${m.audioUrl.trim().toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueMapped.push(m);
        }
      }
      cachedRecentMessages = uniqueMapped;
      return uniqueMapped.slice(0, limit);
    } catch (error) {
      console.warn('Error fetching recent messages:', error);
      return [];
    }
  },

  getRecentSeries: async (): Promise<Series[]> => {
    try {
      const response = await apiClient.get<any>(`/messages/recent/by-series`);
      const list = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      return list.map((s: any) => ({
        seriesId: s.seriesId || s.id,
        seriesName: s.seriesName || s.name,
        seriesCoverUrl: s.seriesCoverUrl || s.coverUrl,
        publishedMessagesCount: s.publishedMessagesCount || 0,
      }));
    } catch (error) {
      console.warn('Error fetching recent series:', error);
      return [];
    }
  },

  getMessageById: async (id: string | number): Promise<Message> => {
    try {
      // Fallback: fetch all messages and find by ID locally (since /messages/{id} returns 404)
      const response = await apiClient.get<any>('/messages');
      const messagesList = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const found = messagesList.find((m: any) => String(m.id) === String(id));
      if (found) {
        const trackNum = extractTrackNumber(found.title, found);
        return {
          messageId: found.id,
          title: found.title,
          speaker: found.speaker,
          audioUrl: found.audioUrl,
          duration: found.duration || undefined,
          publishedDate: found.messageDate || found.createdAt,
          seriesId: found.seriesId,
          coverUrl: found.coverUrl || found.series?.coverUrl || '',
          viewsCount: found.viewsCount || 0,
          downloadsCount: found.downloadsCount || 0,
          categoryIds: found.messageCategories ? found.messageCategories.map((c: any) => c.categoryId) : [],
          originalTrackNumber: trackNum || undefined,
        };
      }
      throw new Error(`Message not found in local list: ${id}`);
    } catch (error) {
      console.warn('Fallback fetching message directly from backend:', error);
      const response = await apiClient.get<any>(`/messages/${id}`);
      const m = response.data?.data || response.data || {};
      const trackNum = extractTrackNumber(m.title, m);
      return {
        messageId: m.id || m.messageId || id,
        title: m.title || '',
        speaker: m.speaker || '',
        audioUrl: m.audioUrl || '',
        duration: m.duration || undefined,
        publishedDate: m.messageDate || m.createdAt,
        seriesId: m.seriesId,
        coverUrl: m.coverUrl || m.series?.coverUrl || '',
        viewsCount: m.viewsCount || 0,
        downloadsCount: m.downloadsCount || 0,
        categoryIds: m.messageCategories ? m.messageCategories.map((c: any) => c.categoryId) : [],
        originalTrackNumber: trackNum || undefined,
      };
    }
  },

  getCategories: async (forceRefresh = false): Promise<Category[]> => {
    if (!forceRefresh && cachedCategories) {
      return cachedCategories;
    }
    try {
      const response = await apiClient.get<any>('/categories');
      const rawData = response.data?.data || response.data || [];
      const mapped = rawData.map((c: any) => ({
        categoryId: c.id || c.categoryId,
        categoryName: c.name || c.categoryName || '',
      }));
      cachedCategories = mapped;
      return mapped;
    } catch (error) {
      console.warn('Error fetching categories:', error);
      return [];
    }
  },

  incrementView: async (id: string | number): Promise<void> => {
    try {
      await apiClient.post(`/messages/${id}/view`);
    } catch (error) {
      console.warn('Error incrementing view count:', error);
    }
  },

  incrementDownload: async (id: string | number): Promise<void> => {
    try {
      await apiClient.post(`/messages/${id}/download`);
    } catch (error) {
      console.warn('Error incrementing download count:', error);
    }
  },

  // SERIES
  getAllSeries: async (forceRefresh = false): Promise<Series[]> => {
    if (!forceRefresh && cachedAllSeries) {
      return cachedAllSeries;
    }
    try {
      const response = await apiClient.get<any>('/series');
      const list = response.data?.data || response.data || [];
      const mapped = list
        .filter((s: any) => {
          const isNotPublished = s.isPublished === false || s.is_published === false || s.status === 'draft' || s.status === 'unpublished';
          return !isNotPublished;
        })
        .map((s: any) => ({
          seriesId: s.id || s.seriesId,
          seriesName: s.name || s.seriesName || '',
          seriesCoverUrl: s.coverUrl || s.seriesCoverUrl || '',
          publishedMessagesCount: s.publishedMessagesCount ?? (s.messages ? s.messages.length : 0),
        }));
      cachedAllSeries = mapped;
      return mapped;
    } catch (error) {
      console.warn('Error fetching all series:', error);
      return [];
    }
  },

  getSeries: async (
    page: number = 1,
    pageSize: number = 10,
    search: string = ''
  ): Promise<{ data: Series[]; totalCount?: number }> => {
    const params = { pageNumber: page, pageSize, search };
    const response = await apiClient.get<any>('/series/get', { params });
    const list = response.data?.series || response.data?.data || [];
    const mappedData = list
      .filter((s: any) => {
        const isNotPublished = s.isPublished === false || s.is_published === false || s.status === 'draft' || s.status === 'unpublished';
        return !isNotPublished;
      })
      .map((s: any) => ({
        seriesId: s.id || s.seriesId,
        seriesName: s.name || s.seriesName || '',
        seriesCoverUrl: s.coverUrl || s.seriesCoverUrl || '',
        publishedMessagesCount: s.publishedMessagesCount ?? (s.messages ? s.messages.length : 0),
      }));
    return {
      data: mappedData,
      totalCount: response.data?.total || response.data?.totalCount || mappedData.length,
    };
  },

  getSeriesById: async (id: string | number, forceRefresh = false): Promise<{ series: Series; messages: Message[] }> => {
    const cacheKey = String(id);
    if (!forceRefresh && cachedSeriesById[cacheKey]) {
      return cachedSeriesById[cacheKey];
    }
    try {
      const [seriesRes, messagesRes] = await Promise.all([
        apiClient.get<any>(`/series/${id}`),
        apiClient.get<any>(`/series/${id}/messages`),
      ]);
      const seriesData = seriesRes.data?.data || seriesRes.data || {};
      const messagesList = messagesRes.data?.data || messagesRes.data?.messages || [];
      const validMessages = messagesList.filter((m: any) => {
        const audio = m.audioUrl || m.audio_url || m.audio;
        const isNotPublished = m.isPublished === false || m.is_published === false || m.status === 'draft' || m.status === 'unpublished';
        return !!audio && !isNotPublished;
      });
      const mappedMessages = validMessages.map((m: any) => ({
        messageId: m.id || m.messageId,
        title: m.title || '',
        speaker: m.speaker || '',
        audioUrl: m.audioUrl || m.audio_url || m.audio || '',
        duration: m.duration || undefined,
        publishedDate: m.messageDate || m.createdAt,
        seriesId: m.seriesId || id,
        seriesName: seriesData.name || seriesData.seriesName || '',
        coverUrl: m.coverUrl || seriesData.coverUrl || seriesData.seriesCoverUrl || '',
        viewsCount: m.viewsCount || 0,
        downloadsCount: m.downloadsCount || 0,
        categoryIds: m.messageCategories ? m.messageCategories.map((c: any) => c.categoryId) : [],
        rawObj: m,
      }));

      const uniqueMessages: (Message & { rawObj?: any })[] = [];
      const seen = new Set<string>();
      for (const m of mappedMessages) {
        const key = `${m.title.trim().toLowerCase()}|${m.audioUrl.trim().toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueMessages.push(m);
        }
      }

      // Sort series messages in chronological / sequential track order (Track 1, Track 2, Track 3...)
      uniqueMessages.sort((a, b) => {
        const trackA = extractTrackNumber(a.title, a.rawObj);
        const trackB = extractTrackNumber(b.title, b.rawObj);

        // If both have extracted track/part numbers, sort by track number ascending
        if (trackA !== null && trackB !== null && trackA !== trackB) {
          return trackA - trackB;
        }

        // If only one has a track number
        if (trackA !== null && trackB === null) {
          return -1;
        }
        if (trackA === null && trackB !== null) {
          return 1;
        }

        // Otherwise sort by publishedDate / messageDate / createdAt ascending (oldest/earliest first)
        const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
        const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
        if (dateA !== dateB && !isNaN(dateA) && !isNaN(dateB) && dateA > 0 && dateB > 0) {
          return dateA - dateB;
        }

        // Fallback: sort by messageId ascending
        const idA = Number(a.messageId);
        const idB = Number(b.messageId);
        if (!isNaN(idA) && !isNaN(idB) && idA !== idB) {
          return idA - idB;
        }

        return String(a.messageId).localeCompare(String(b.messageId));
      });

      const messagesWithTrackNum = uniqueMessages.map((m, idx) => {
        const parsed = extractTrackNumber(m.title, m.rawObj);
        const { rawObj, ...cleanMsg } = m;
        return {
          ...cleanMsg,
          originalTrackNumber: parsed || idx + 1,
        };
      });

      const result = {
        series: {
          seriesId: seriesData.id || seriesData.seriesId || id,
          seriesName: seriesData.name || seriesData.seriesName || '',
          seriesCoverUrl: seriesData.coverUrl || seriesData.seriesCoverUrl || '',
          publishedMessagesCount: seriesData.publishedMessagesCount || uniqueMessages.length || 0,
        },
        messages: messagesWithTrackNum,
      };
      cachedSeriesById[cacheKey] = result;
      return result;
    } catch (error) {
      console.warn('Error fetching series by id:', error);
      // Fallback: fetch series from metadata only
      try {
        const response = await apiClient.get<any>(`/series/${id}`);
        const seriesData = response.data?.data || response.data || {};
        return {
          series: {
            seriesId: seriesData.id || seriesData.seriesId || id,
            seriesName: seriesData.name || seriesData.seriesName || '',
            seriesCoverUrl: seriesData.coverUrl || seriesData.seriesCoverUrl || '',
            publishedMessagesCount: seriesData.publishedMessagesCount || 0,
          },
          messages: [],
        };
      } catch (innerError) {
        console.warn('Fallback failed fetching series by id:', innerError);
        return {
          series: {
            seriesId: id,
            seriesName: 'Series details unavailable',
          },
          messages: [],
        };
      }
    }
  },

  // EVENTS
  getUpcomingEvents: async (forceRefresh = false): Promise<ChurchEvent[]> => {
    if (!forceRefresh && cachedUpcomingEvents) {
      return cachedUpcomingEvents;
    }
    try {
      const response = await apiClient.get<any>('/events/events');
      const events = response.data?.events || response.data?.data || response.data || [];
      const mapped = events.map((evt: any) => ({
        eventId: evt.eventId,
        title: evt.title,
        description: evt.description,
        startDate: evt.startDate,
        endDate: evt.endDate,
        location: evt.location,
        bannerImageUrl: evt.bannerImageUrl,
        isPublished: evt.isPublished || false,
      }));
      cachedUpcomingEvents = mapped;
      return mapped;
    } catch (error) {
      console.warn('Error fetching upcoming events:', error);
      return [];
    }
  },

  getEventsList: async (
    page: number = 1,
    pageSize: number = 10,
    search: string = ''
  ): Promise<{ data: ChurchEvent[]; totalCount: number }> => {
    const params = { pageNumber: page, pageSize, search };
    const response = await apiClient.get<any>('/events/events', { params });
    const events = response.data?.events || response.data?.data || [];
    return {
      data: events.map((evt: any) => ({
        eventId: evt.eventId,
        title: evt.title,
        description: evt.description,
        startDate: evt.startDate,
        endDate: evt.endDate,
        location: evt.location,
        bannerImageUrl: evt.bannerImageUrl,
        isPublished: evt.isPublished || false,
      })),
      totalCount: response.data?.total || response.data?.totalCount || events.length,
    };
  },

  getEventById: async (id: string | number): Promise<ChurchEvent> => {
    const response = await apiClient.get<any>(`/events/event/${id}`);
    const evt = response.data?.data || response.data || {};
    return {
      eventId: evt.eventId,
      title: evt.title,
      description: evt.description,
      startDate: evt.startDate,
      endDate: evt.endDate,
      location: evt.location,
      bannerImageUrl: evt.bannerImageUrl,
      isPublished: evt.isPublished || false,
    };
  },

  getSessions: async (eventId: string | number): Promise<EventSession[]> => {
    try {
      const response = await apiClient.get<any>(`/events/event/${eventId}`);
      const sessions = response.data?.data?.eventSessions || response.data?.eventSessions || [];
      return sessions.map((s: any) => ({
        sessionId: s.id || s.sessionId,
        eventId: s.eventId,
        title: s.title,
        startTime: s.startDateTime || s.startTime,
        endTime: s.endDateTime || s.endTime,
        speaker: s.speaker || undefined,
        topic: s.topic || s.description || undefined,
      }));
    } catch (error) {
      console.warn('Error fetching event sessions:', error);
      return [];
    }
  },

  preloadAllCaches: async (): Promise<void> => {
    try {
      // Fetch categories (the only main endpoint not loaded by Home Screen on start)
      apiService.getCategories().catch(() => {});
    } catch (e) {
      console.warn('Preload categories failed:', e);
    }
  },
};
