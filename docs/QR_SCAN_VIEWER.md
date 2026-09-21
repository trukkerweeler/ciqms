# QR Scan Viewer Queue

## Purpose

The QR Scan Viewer in CIQMS consumes the scan queue created by `autofiler2.py` in the separate **FILING** project. The FILING project is the producer; CIQMS reads the queue, matches scans to QMS input records, and files completed scans.

## Components

- **Queue producer:** `FILING/autofiler2.py` (separate project; not stored in this repository)
- **Queue file:** `C:\Users\TimK\Desktop\TKSCANS\qr_scan.jsonl`
- **Viewer page:** `/qrscan-viewer.html`
- **Viewer client:** `public/js/qrscan-viewer.mjs`
- **CIQMS route:** `routes/qrscan.js`
- **Filing locations:** `data/filing-locations.json`

The queue file can be changed with the `QR_SCAN_FILE_PATH` environment variable. If it is not set, CIQMS uses the default path above.

## Queue format

`qr_scan.jsonl` is newline-delimited JSON. Each non-empty line represents one queued scan. The viewer expects the producer to provide enough information to identify and open the scan, including fields such as:

```json
{
  "qrData": "01TE",
  "pdfPath": "C:\\Users\\TimK\\Desktop\\TKSCANS\\scan.pdf",
  "originalFile": "scan.pdf",
  "timestamp": "2026-09-21T10:30:00"
}
```

The exact producer fields are owned by `FILING/autofiler2.py`. When changing that producer, preserve the meaning of `qrData`, `pdfPath`, `originalFile`, and `timestamp` unless `routes/qrscan.js` is updated at the same time.

## Viewer workflow

1. Open `/qrscan-viewer.html`.
2. The browser requests `GET /qrscan`.
3. CIQMS reads and parses each JSONL line.
4. Each scan is matched to the most recent `PEOPLE_INPUT` record whose subject contains the QR value and whose date is before the date parsed from the scan filename.
5. The viewer displays the matching record and the PDF in an iframe.
6. The user selects a disposition and optionally enters measurement values and a destination path.
7. `POST /qrscan/process` saves the response, closes the input, copies the PDF to the filing destination, removes the queue entry, and deletes the source PDF after the copy is confirmed.

The viewer removes the item from its local list immediately after a successful process response. Refreshing the page reloads the remaining JSONL entries from disk.

## Missing files

If a queue entry points to a PDF that no longer exists, the viewer identifies it as missing and calls `DELETE /qrscan/missing` to remove those entries from the JSONL queue.

## Operational notes

- Start CIQMS with `npm run dev` so the `.env` file is loaded.
- Confirm that the Node process can access the scan directory and the configured filing shares.
- Do not manually remove a JSONL line unless the corresponding scan has been handled or the PDF is confirmed unusable.
- If queue creation changes in `autofiler2.py`, test one complete scan through the viewer before processing the full queue.
