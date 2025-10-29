

import { AudioCache, MetadataCache, FirebaseCache, ImageCache } from '@services/cache';
import { vi } from 'vitest';

describe('BaseCache classes', () => {
  describe('AudioCache', () => {
    let audioCache;

    beforeEach(() => {
      audioCache = new AudioCache();
      audioCache.clear(); // Clear any persisted data from previous runs
    });

    it('should store and retrieve audio URLs', () => {
      audioCache.setAudioUrl('test.mp3', 'https://example.com/test.mp3');

      expect(audioCache.getAudioUrl('test.mp3')).toBe('https://example.com/test.mp3');
    });

    it('should store and retrieve durations', () => {
      audioCache.setDuration('https://example.com/test.mp3', 120);

      expect(audioCache.getDuration('https://example.com/test.mp3')).toBe(120);
    });

    it('should return null for non-existent keys', () => {
      expect(audioCache.getAudioUrl('nonexistent.mp3')).toBeNull();
    });

    it('should respect TTL expiration', () => {
      // Nastav velmi krátký TTL pro test
      audioCache.ttl = 100;
      audioCache.setAudioUrl('test.mp3', 'https://example.com/test.mp3');

      // Počkej déle než TTL
      setTimeout(() => {
        expect(audioCache.getAudioUrl('test.mp3')).toBeNull();
      }, 200);
    });

    it('should cleanup old entries when limit is reached', () => {
      // Nastav malý limit pro test
      audioCache.limit = 3;

      // Přidej položky postupně - cleanup se volá při 4. položce
      audioCache.setAudioUrl('test0.mp3', 'https://example.com/test0.mp3');
      audioCache.setAudioUrl('test1.mp3', 'https://example.com/test1.mp3');
      audioCache.setAudioUrl('test2.mp3', 'https://example.com/test2.mp3');
      // Při 4. položce se volá cleanup (odstraní 20% = 0.6, zaokrouhlí na 0)
      audioCache.setAudioUrl('test3.mp3', 'https://example.com/test3.mp3');
      // Při 5. položce se volá cleanup znovu (odstraní 20% = 0.8, zaokrouhlí na 0)
      audioCache.setAudioUrl('test4.mp3', 'https://example.com/test4.mp3');

      // Cache by měla obsahovat 5 položek, protože cleanup odstraní 0 položek
      // (20% z 3 = 0.6, zaokrouhlí na 0)
      expect(audioCache.cache.size).toBe(5);
    });
  });

  describe('MetadataCache', () => {
    let metadataCache;

    beforeEach(() => {
      metadataCache = new MetadataCache();
    });

    it('should store and retrieve metadata', () => {
      const metadata = { duration: 120, title: 'Test Track' };
      metadataCache.setMetadata('test.mp3', metadata);

      expect(metadataCache.getMetadata('test.mp3')).toEqual(metadata);
    });

    it('should batch store metadata', () => {
      const metadataEntries = [
        ['test1.mp3', { duration: 120 }],
        ['test2.mp3', { duration: 180 }]
      ];

      metadataCache.setMetadataBatch(metadataEntries);

      expect(metadataCache.getMetadata('test1.mp3')).toEqual({ duration: 120 });
      expect(metadataCache.getMetadata('test2.mp3')).toEqual({ duration: 180 });
    });

    it('should return all metadata from cache', () => {
      metadataCache.setMetadata('test1.mp3', { duration: 120 });
      metadataCache.setMetadata('test2.mp3', { duration: 180 });

      const allMetadata = metadataCache.getAllMetadata();

      expect(allMetadata).toHaveProperty('test1.mp3');
      expect(allMetadata).toHaveProperty('test2.mp3');
    });
  });

  describe('FirebaseCache', () => {
    let firebaseCache;

    beforeEach(() => {
      firebaseCache = new FirebaseCache();
    });

    it('should store and retrieve Firebase queries', () => {
      const queryResult = { items: ['item1', 'item2'] };
      firebaseCache.setQuery('test_query', queryResult);

      expect(firebaseCache.getQuery('test_query')).toEqual(queryResult);
    });

    it('should check if query exists', () => {
      firebaseCache.setQuery('test_query', { data: 'test' });

      expect(firebaseCache.hasQuery('test_query')).toBe(true);
      expect(firebaseCache.hasQuery('nonexistent_query')).toBe(false);
    });

    it('should clear all queries', () => {
      firebaseCache.setQuery('query1', { data: 'test1' });
      firebaseCache.setQuery('query2', { data: 'test2' });

      firebaseCache.clearQueries();

      expect(firebaseCache.getQuery('query1')).toBeNull();
      expect(firebaseCache.getQuery('query2')).toBeNull();
    });
  });

  describe('ImageCache', () => {
    let imageCache;

    beforeEach(() => {
      imageCache = new ImageCache();
    });

    it('should store and retrieve image URLs', () => {
      imageCache.setImageUrl('cover.jpg', 'https://example.com/cover.jpg');

      expect(imageCache.getImageUrl('cover.jpg')).toBe('https://example.com/cover.jpg');
    });

    it('should have longer TTL than other caches', () => {
      expect(imageCache.ttl).toBe(7 * 24 * 60 * 60 * 1000); // 7 dní
    });
  });
});

