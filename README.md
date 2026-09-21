# LumaCare

Arabic/English hospital knowledge assistant. This continues the existing site and preserves its design and eight patient-identification passages.

## What changed

The browser sends a complete question and up to 12 recent messages to a Node server. The server supplies the entire small knowledge library to the OpenAI Responses API. The model can interpret paraphrases, follow-ups and compound questions and synthesize an answer instead of selecting a fixed keyword response.

Every answer paragraph must cite a server-owned passage and include an exact supporting quotation. The server rejects missing references, unknown IDs and quotations absent from the passage. Source section labels come from library metadata, not the model. Unsupported questions and ambiguous questions receive controlled responses. This provenance check does not prove that every generated claim logically follows from its quotation; clinical review and live model evaluation remain necessary.

## Run the local MVP

Requires Node.js 22 or later. No npm dependencies are required.

1. Copy `.env.example` to `.env`.
2. Set `OPENAI_API_KEY` in that local file and `OPENAI_MODEL` to an account-available model supporting Responses and Structured Outputs.
3. Run `npm start`.
4. Open `http://127.0.0.1:3000`.

Without the key/model the UI displays that activation is pending; questions return an explicit service-setup message. No clinical keyword fallback runs. The browser never receives the API key.

The server binds to loopback only. For a shared hospital deployment, place it behind a verified access gateway with HTTPS, preserve the public Host header, set `LUMACARE_ORIGIN` to the exact public origin, and prevent direct backend access. The existing MOH email screen is a demo identity label, not authentication. The request limiter is process-local and is not a substitute for authenticated per-user limits.

GitHub Pages serves static files only: it cannot run this Node backend. The existing Pages deployment remains a static preview; the AI version requires server hosting. Do not claim the live Pages site has working AI merely because this branch is merged.

## Central knowledge

`server/knowledge.json` holds the eight existing Arabic/English passages and their section labels, migrated verbatim from the old `app.js`. Staff cannot upload or override knowledge through chat. An administrator edits the library and restarts the server.

These are existing summaries, not newly verified original policy documents. The original PDF and verified page numbers are unavailable, so the UI cites sections and quotations, not fabricated pages. Currently only the patient-identification policy is covered.

The library is small enough to send in full; no separate vector database is needed for this MVP. As documents grow, replace the library-loading stage with private ingestion/retrieval covering policies, procedures, nursing manuals, medication guides, clinical pathways and training materials. Do not add confidential documents or signatures to this public repository. Future private content belongs outside the source repository.

## Data and limitations

Questions, the selected recent conversation context and library passages are sent to OpenAI after configuration. API requests use `store: false`; this does not by itself mean zero provider retention. Conversation history remains in browser localStorage. No patient-specific data storage, clinical source validation, MOH authentication or production access controls have been added.

No live AI call has been made as part of implementation: API credentials are not configured. Before rollout, evaluate Arabic dialects, English rewordings, follow-ups, unsupported questions and prompt-injection attempts against reviewed source material.

## Validation

Run `npm run check` and `npm test`. Automated tests mock the provider and check request boundaries, evidence provenance, abstention, errors, HTTP restrictions and session cancellation. They do not establish live-model answer quality.

Official API references: [Responses](https://developers.openai.com/api/docs/guides/text), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Data controls](https://developers.openai.com/api/docs/guides/your-data).
