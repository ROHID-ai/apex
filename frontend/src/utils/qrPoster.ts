import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export type PosterType = 'check-in' | 'check-out';

interface PosterTemplate {
  src: string;
  qrRegion: { x: number; y: number; w: number; h: number };
  paddingRatio: number;
}

const POSTER_TEMPLATES: Record<PosterType, PosterTemplate> = {
  'check-in': {
    src: '/check%20in.png',
    qrRegion: { x: 194 / 1086, y: 441 / 1448, w: 700 / 1086, h: 531 / 1448 },
    paddingRatio: 0.05,
  },
  'check-out': {
    src: '/check%20out.png',
    qrRegion: { x: 191 / 1086, y: 436 / 1448, w: 705 / 1086, h: 557 / 1448 },
    paddingRatio: 0.05,
  },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load poster template: ${src}`));
    image.src = src;
  });
}

function getQrPlacement(
  template: PosterTemplate,
  imageWidth: number,
  imageHeight: number,
) {
  const regionX = template.qrRegion.x * imageWidth;
  const regionY = template.qrRegion.y * imageHeight;
  const regionW = template.qrRegion.w * imageWidth;
  const regionH = template.qrRegion.h * imageHeight;
  const padding = Math.min(regionW, regionH) * template.paddingRatio;
  const innerW = regionW - padding * 2;
  const innerH = regionH - padding * 2;
  const size = Math.min(innerW, innerH);

  return {
    x: regionX + (regionW - size) / 2,
    y: regionY + (regionH - size) / 2,
    size,
  };
}

async function createQrImage(url: string, size: number): Promise<HTMLImageElement> {
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: Math.round(size),
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#0a0a0a', light: '#ffffff' },
  });
  return loadImage(qrDataUrl);
}

export async function renderQrPosterCanvas(
  type: PosterType,
  url: string,
  outputWidth?: number,
): Promise<HTMLCanvasElement> {
  const template = POSTER_TEMPLATES[type];
  const poster = await loadImage(template.src);
  const width = outputWidth ?? poster.width;
  const height = Math.round((poster.height / poster.width) * width);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to create poster canvas');

  ctx.drawImage(poster, 0, 0, width, height);

  const placement = getQrPlacement(template, width, height);
  const qrImage = await createQrImage(url, placement.size);
  ctx.drawImage(qrImage, placement.x, placement.y, placement.size, placement.size);

  return canvas;
}

export async function renderQrPosterDataUrl(
  type: PosterType,
  url: string,
  outputWidth = 360,
): Promise<string> {
  const canvas = await renderQrPosterCanvas(type, url, outputWidth);
  return canvas.toDataURL('image/png');
}

export async function downloadQrPosterPdf({ type, url }: { type: PosterType; url: string }) {
  const template = POSTER_TEMPLATES[type];
  const poster = await loadImage(template.src);
  const canvas = await renderQrPosterCanvas(type, url, poster.width);
  const imageData = canvas.toDataURL('image/png');

  const pageWidthMm = 210;
  const pageHeightMm = (poster.height / poster.width) * pageWidthMm;
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidthMm, pageHeightMm],
  });

  pdf.addImage(imageData, 'PNG', 0, 0, pageWidthMm, pageHeightMm);
  pdf.save(`apex-${type}-qr-poster.pdf`);
}
