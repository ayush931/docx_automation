import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/api/upload', () => {
    return HttpResponse.json({ paragraphs: ['Test text'], rawText: 'Test text', wordCount: 2 });
  }),
  http.post('/api/spellcheck', () => {
    return HttpResponse.json({ errors: [] });
  }),
  http.post('/api/export', () => {
    return new HttpResponse(new ArrayBuffer(8), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
    });
  })
];

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
