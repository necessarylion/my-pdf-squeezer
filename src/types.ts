export interface Quality {
  val: string;
  label: string;
}

export interface CompressionResult {
  originalSize: number;
  optimizedSize: number;
  saved: number;
  pct: string;
  downloadUrl: string;
  outName: string;
  error: string;
}

export const QUALITIES: Quality[] = [
  { val: "SCREEN", label: "72 dpi<br>Smallest" },
  { val: "EBOOK", label: "150 dpi<br>Balanced" },
  { val: "PRINTER", label: "300 dpi<br>High quality" },
  { val: "PREPRESS", label: "300 dpi<br>Max quality" },
];
