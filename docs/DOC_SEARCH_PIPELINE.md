# QMS Document Indexing & Search Pipeline

Minimal, mechanical pipeline for making QMS documents (PDF, Word, Excel, etc.) full-text
searchable. No AI/embeddings — plain keyword search only.

## Flow

```
Directory of files -> Apache Tika (extract text + metadata) -> Meilisearch (store/search) -> Express API
```

## Files

| File                             | Purpose                                                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/tika.js`               | Sends a file to a running Tika server (`PUT /tika`, `PUT /meta`) and returns extracted text + metadata.                                                                   |
| `services/searchIndex.js`        | Thin wrapper around Meilisearch's HTTP API: `ensureIndex()`, `indexDocuments()`, `search()`.                                                                              |
| `services/docIndexer.js`         | `walkDirectory()` recursively lists supported files; `indexDirectory()` ties Tika + Meilisearch together and batches index writes.                                        |
| `scripts/index-qms-documents.js` | CLI entry point: `npm run index-docs <directory>`.                                                                                                                        |
| `routes/docSearch.js`            | Express routes: `POST /index-docs`, `GET /search`. Mounted at `/` in `server.js` (excluded from the generic route autoloader so paths aren't prefixed with `/docSearch`). |

## Supported file types

`.pdf .doc .docx .xls .xlsx .txt .rtf` (see `SUPPORTED_EXTENSIONS` in `services/docIndexer.js`).

## Setup

1. Run a Tika server (extracts text from files) — start it yourself, separately from Node, in every environment:
   ```
   docker run -p 9998:9998 apache/tika
   ```
2. Run Meilisearch (stores/searches extracted text) — also started separately:
   ```
   docker run -p 7700:7700 getmeili/meilisearch
   ```
3. Add to `.env`. `NODE_ENV` picks the `_DEV` or `_PROD` values via `config/docSearchConfig.js`:
   ```
   TIKA_SERVER_URL_DEV=http://localhost:9998
   TIKA_SERVER_URL_PROD=http://tika-prod-host:9998
   MEILI_HOST_DEV=http://localhost:7700
   MEILI_HOST_PROD=http://meili-prod-host:7700
   MEILI_API_KEY=
   MEILI_INDEX=qms_documents
   QMS_DOCS_DIR=\\fs1\Common\Quality
   ```

No extra npm packages are required — both services use Node's built-in global `fetch` (Node 18+).

## Production deployment on Windows Server 2012 R2 (no Docker)

Docker isn't viable on Server 2012 R2 (Windows containers need Server 2016+; Linux containers would
require the deprecated Docker Toolbox + VirtualBox). Run Tika and Meilisearch as native processes
instead, wrapped as Windows Services with [NSSM](https://nssm.cc/download) — the same startup
pattern already used for this app (`ciqms.bat`/`ciqms.vbs`).

1. Confirm a JRE is installed (Tika needs Java 8+): `java -version`.
2. Download `tika-server-standard-<version>.jar` (https://tika.apache.org/download.html) and the
   Meilisearch Windows binary (https://github.com/meilisearch/meilisearch/releases).
3. Register each as a service:

   ```powershell
   nssm.exe install QMS-Tika "<path-to-java>\java.exe" "-jar C:\qms-search\tika\tika-server-standard-<version>.jar --host=0.0.0.0 --port=9998"
   nssm.exe set QMS-Tika Start SERVICE_AUTO_START
   Start-Service QMS-Tika

   nssm.exe install QMS-Meilisearch "C:\qms-search\meilisearch\meilisearch.exe" "--http-addr 0.0.0.0:7700 --db-path C:\qms-search\meilisearch\data"
   nssm.exe set QMS-Meilisearch Start SERVICE_AUTO_START
   Start-Service QMS-Meilisearch
   ```

4. Point `TIKA_SERVER_URL_PROD` / `MEILI_HOST_PROD` in `.env` at these services (`http://localhost:9998` /
   `http://localhost:7700` if Node runs on the same box, or the server's LAN IP otherwise).
5. Verify with `GET /health/tika` and `GET /health/meilisearch` before running `/index-docs` in prod.

### Running dev and prod at the same time

- Point `_DEV` and `_PROD` at **different hosts/ports** for Tika and Meilisearch (run two separate Tika containers and two separate Meilisearch instances if both environments run on the same box).
- The Meilisearch index name is automatically suffixed with `_dev` or `_prod` (`config/docSearchConfig.js`), so even if dev and prod happened to share one Meilisearch instance, they can never write into each other's index.
- The main app already runs dev/prod on separate ports (see `config.js`: 3003 dev, 3004 prod), so there's no HTTP port conflict between the two Express processes either.
- Node never spawns Tika/Meilisearch itself, so there's no risk of it accidentally launching a duplicate instance.

## Usage

### CLI (bulk index)

```
npm run index-docs "\\fs1\Common\Quality"
```

Omit the path to fall back to `QMS_DOCS_DIR` from `.env`.

### API

**Trigger indexing**

```
POST /index-docs
Content-Type: application/json

{ "directory": "\\\\fs1\\Common\\Quality" }
```

`directory` is optional if `QMS_DOCS_DIR` is set. Response:

```json
{ "processed": 42, "indexed": 42, "errors": [] }
```

**Search**

```
GET /search?q=corrective+action&limit=20
```

Returns the raw Meilisearch response (`hits`, `estimatedTotalHits`, etc.).

**Health checks**

```
GET /health/tika
GET /health/meilisearch
```

Each returns `200` with `{ "up": true, ... }` when the service is reachable, or `503` with
`{ "up": false, "error": "..." }` when it isn't. `indexDirectory()` calls the Tika health check
before doing any work — if Tika is down, `/index-docs` fails fast with a `503` and a clear log
line (`[docIndexer] Tika server is not reachable, aborting index run. ...`) instead of
partially indexing or attempting to start Tika.

## Document shape in the index

```js
{
  id: "<sha1 of file path>",   // stable id, re-indexing the same file overwrites it
  fileName: "F8511-6.pdf",
  filePath: "\\\\fs1\\...\\F8511-6.pdf",
  text: "...extracted text...",
  contentType: "application/pdf",
  indexedAt: "2026-09-02T00:00:00.000Z"
}
```

## Switching to OpenSearch

Only `services/searchIndex.js` needs to change:

- Replace index creation with `PUT <opensearch-host>/qms_documents`.
- Replace `indexDocuments()` with the `_bulk` API.
- Replace `search()` with `POST <opensearch-host>/qms_documents/_search` using the OpenSearch query DSL (e.g. `match` query on `text`).

`services/tika.js`, `services/docIndexer.js`, `scripts/index-qms-documents.js`, and `routes/docSearch.js` require no changes.

## Notes / next steps

- Indexing is synchronous per request; for large document sets, consider moving `/index-docs` to a background job/queue instead of blocking the HTTP request.
- No auth is currently applied to `/index-docs` or `/search` — add the same auth middleware used by other routes before exposing this outside trusted networks.
- No AI embeddings/semantic search yet — this is keyword search only, per the current scope.
