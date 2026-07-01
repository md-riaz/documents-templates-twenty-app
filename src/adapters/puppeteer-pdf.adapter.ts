import type { HtmlToPdfAdapter } from '../logic/generate-pdf';
import type { BrowserPdfOptions } from '../logic/settings/pdf-settings';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let puppeteerModule: any = null;

const loadPuppeteer = async () => {
  if (!puppeteerModule) {
    puppeteerModule = await import('puppeteer');
  }
  return puppeteerModule;
};

const mapFormatToPuppeteer = (format: string): string => {
  const mapping: Record<string, string> = {
    'A4': 'A4',
    'A3': 'A3',
    'A5': 'A5',
    'Letter': 'Letter',
    'Legal': 'Legal',
  };
  return mapping[format] ?? 'A4';
};

export const createPuppeteerPdfAdapter = (): HtmlToPdfAdapter => ({
  async renderHtmlToPdf({ html, options }) {
    const puppeteer = await loadPuppeteer();
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: 'load',
        timeout: 30000,
      });

      const pdfBuffer = await page.pdf({
        format: mapFormatToPuppeteer(options.format) as 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal',
        landscape: options.landscape,
        printBackground: options.printBackground,
        margin: {
          top: options.margin.top,
          right: options.margin.right,
          bottom: options.margin.bottom,
          left: options.margin.left,
        },
        displayHeaderFooter: options.displayHeaderFooter,
        headerTemplate: options.headerTemplate ?? '',
        footerTemplate: options.footerTemplate ?? '',
        preferCSSPageSize: options.preferCSSPageSize,
      });

      return new Uint8Array(pdfBuffer);
    } finally {
      await browser.close();
    }
  },
});

export const puppeteerPdfAdapter: HtmlToPdfAdapter = createPuppeteerPdfAdapter();
