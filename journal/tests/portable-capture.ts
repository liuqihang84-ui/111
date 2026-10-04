import type { BrowserContext, Page } from '@playwright/test';

/** Keep large real HTML responses in the same CDP session that reads their bytes.
 * This changes debugging buffers only; it never intercepts or replaces a response. */
export async function capturePortableDocument(context: BrowserContext, page: Page) {
  const capture = await context.newCDPSession(page);
  const documents = new Map<string, string>();
  capture.on('Network.responseReceived', event => {
    if (event.type === 'Document') documents.set(event.response.url.split('#')[0], event.requestId);
  });
  await capture.send('Network.enable', {
    maxTotalBufferSize: 200_000_000,
    maxResourceBufferSize: 100_000_000,
    enableDurableMessages: true,
  });
  return async (url: string): Promise<Buffer> => {
    const requestId = documents.get(url.split('#')[0]);
    if (!requestId) throw new Error(`The actual portable document response was not captured: ${url}`);
    const response = await capture.send('Network.getResponseBody', { requestId });
    return Buffer.from(response.body, response.base64Encoded ? 'base64' : 'utf8');
  };
}
