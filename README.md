# PDF Optimizer

Client-side PDF compression powered by Ghostscript 10.06.0 compiled to WebAssembly. Everything runs entirely in the browser — no files are uploaded or stored on any server.

## Features

- **100% client-side** — your files never leave your browser
- **Ghostscript WASM** — real PDF compression using [`@okathira/ghostpdl-wasm`](https://github.com/okathira/ghostpdl-wasm)
- **Web Worker** — compression runs off the main thread, keeping the UI responsive
- **PDF preview** — view the original and compressed PDF side by side
- **Multiple quality levels** — Screen (72 dpi), Ebook (150 dpi), Printer (300 dpi), Prepress (300 dpi max)

## Tech Stack

- Vue 3 + TypeScript
- Vite
- Tailwind CSS v4
- pdf.js for PDF preview
- Ghostscript 10.06.0 (WASM)

## Getting Started

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## How It Works

1. User uploads a PDF file via drag-and-drop or file picker
2. The PDF is written to Ghostscript's virtual filesystem inside a Web Worker
3. Ghostscript re-encodes the PDF at the selected quality/DPI setting
4. The compressed PDF is read back and presented for download

## License

AGPL-3.0 (due to Ghostscript's license)
