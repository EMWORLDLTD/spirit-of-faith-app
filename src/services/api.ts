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
  };
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
      const mapped = messagesList.map((m: any) => ({
        messageId: m.id || m.messageId,
        title: m.title || '',
        speaker: m.speaker || '',
        audioUrl: m.audioUrl || '',
        duration: m.duration || undefined,
        publishedDate: m.messageDate || m.createdAt || new Date().toISOString(),
        seriesId: m.seriesId,
        seriesName: m.series?.name,
        coverUrl: m.coverUrl || m.series?.coverUrl || '',
        viewsCount: m.viewsCount || 0,
        downloadsCount: m.downloadsCount || 0,
        categoryIds: m.messageCategories ? m.messageCategories.map((c: any) => c.categoryId) : [],
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
        };
      }
      throw new Error(`Message not found in local list: ${id}`);
    } catch (error) {
      console.warn('Fallback fetching message directly from backend:', error);
      const response = await apiClient.get<any>(`/messages/${id}`);
      const m = response.data?.data || response.data || {};
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
      const mapped = list.map((s: any) => ({
        seriesId: s.id || s.seriesId,
        seriesName: s.name || s.seriesName || '',
        seriesCoverUrl: s.coverUrl || s.seriesCoverUrl || '',
        publishedMessagesCount: s.publishedMessagesCount || (s.messages ? s.messages.length : 0),
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
    const mappedData = list.map((s: any) => ({
      seriesId: s.id || s.seriesId,
      seriesName: s.name || s.seriesName || '',
      seriesCoverUrl: s.coverUrl || s.seriesCoverUrl || '',
      publishedMessagesCount: s.publishedMessagesCount || (s.messages ? s.messages.length : 0),
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
      const mappedMessages = messagesList.map((m: any) => ({
        messageId: m.id || m.messageId,
        title: m.title || '',
        speaker: m.speaker || '',
        audioUrl: m.audioUrl || '',
        duration: m.duration || undefined,
        publishedDate: m.messageDate || m.createdAt,
        seriesId: m.seriesId || id,
        seriesName: seriesData.name || seriesData.seriesName || '',
        coverUrl: m.coverUrl || seriesData.coverUrl || seriesData.seriesCoverUrl || '',
        viewsCount: m.viewsCount || 0,
        downloadsCount: m.downloadsCount || 0,
        categoryIds: m.messageCategories ? m.messageCategories.map((c: any) => c.categoryId) : [],
      }));

      const uniqueMessages: Message[] = [];
      const seen = new Set<string>();
      for (const m of mappedMessages) {
        const key = `${m.title.trim().toLowerCase()}|${m.audioUrl.trim().toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueMessages.push(m);
        }
      }

      const messagesWithTrackNum = uniqueMessages.map((m, idx) => ({
        ...m,
        originalTrackNumber: idx + 1,
      }));

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
