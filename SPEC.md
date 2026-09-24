# Jeonse Guard — SPEC (v0.2, 2026-09-24)

## 0. One line
A lease-risk checker for Korean *jeonse* tenants that answers **only with official statute text it can verify** — and stays silent when it can't.
Essence: not "a legal chatbot" (A) but "every warning carries a verified article link, or there is no warning" (B).

## 1. Success conditions · deadline · non-goals
- Reference: MOLIT press release 2026-09-07 — 40,936 tenants determined jeonse-fraud victims since 2023-06-01 (as of 2026-08-31); 509 applications were rejected because the tenant lacked opposing power (move-in registration / fixed date). The government's pre-contract "safe contract consulting" runs at 8 physical centers only.
- Success (measurable):
  - S1 100% of citations shipped in the rule library verify against the official Korean text (citation-integrity test).
  - S2 0 findings rendered without a verified citation (grounding gate test).
  - S3 Sample lease → report in ≤ 3 clicks from the landing page; no login.
  - S4 Clause classifier: rule matcher precision 1.0 on the labeled set; LLM path never emits an ID outside the taxonomy (schema test + eval script).
  - S5 Live URL returns 200; `/api/verify` reports the snapshot/live match for the Housing Lease Protection Act.
- Deadline: 2026-09-27 17:00 EDT (2026-09-28 06:00 KST) — LexHack 2026 submission.
- Non-goals: legal advice or verdicts on validity; parsing registry PDFs; storing any user data; covering commercial leases, monthly rent disputes, or laws outside the corpus.

## 2. Constraints
- Hackathon rules §4: code written during Sep 11–27, 2026; all libraries/APIs/AI tools declared.
- Data: law.go.kr Open API (DRF) — Korean statute text and the official English translations (Korea Legislation Research Institute). Snapshot stored in repo with version (MST) and effective date.
- Cost 0: Vercel Hobby, Gemini API free tier (optional path; app works without it).
- Privacy: no accounts, no storage, no analytics. Clause text is sent to the LLM only when the user presses "Ask AI to classify"; the UI says so.

## 3. Ubiquitous language (code names 1:1)
| Term | Meaning | Code |
|---|---|---|
| Statute | A law or decree at a specific version (MST) | `Statute` |
| Article | One article (e.g. `3-2` = Article 3-2) with Korean text and official English translation | `Article`, `ArticleNo` |
| Citation | Pointer to an article + a quote that must appear verbatim in its Korean text | `Citation` |
| Verified citation | Citation whose quote was found in the official text | `VerifiedCitation` |
| Lease facts | What the tenant knows before signing | `LeaseFacts` |
| Candidate finding | A rule's proposed warning, not yet grounded | `CandidateFinding` |
| Finding | A candidate whose every citation verified | `Finding` |
| Silence | A candidate or clause we refuse to judge, with the reason | `Silence` |
| Grounding gate | Turns candidates into findings or silences | `groundCandidates` |
| Clause pattern | A closed-taxonomy special-term type with pre-verified citations | `ClausePattern` |
| Auction scenario | Arithmetic of who gets paid first if the home is auctioned | `auctionScenario` |
| Opposing power | Tenant's right to assert the lease against third parties (HLPA Art. 3(1)) | `opposingPower` |
| Fixed date | Date stamp on the lease contract giving repayment priority (Art. 3-2(2)) | `fixedDate` |
| Small-deposit priority | Top-priority repayment of part of a small deposit (Art. 8, Decree Art. 10–11) | `smallDepositPriority` |

## 4. Domain model
- Value objects: `Won` (integer KRW ≥ 0), `ArticleNo`, `Citation`, `LeaseFacts` (validated), `Region` (`seoul` · `overcrowding` · `metro` · `other` — the four categories of Decree Art. 10(1)/11).
- Domain services (pure): rules (`src/domain/rules/*`), `auctionScenario`, `groundCandidates`, `verifyCitation`, `matchClausePatterns`.
- Ports: `StatuteSource` (load corpus), `ClauseClassifier` (clause → pattern id | none).

## 5. Use cases
| UC | Input | Output | Rules |
|---|---|---|---|
| UC-1 assessLease | `LeaseFacts`, corpus | `Report` {findings, silences, scenario, corpus stamps} | Every finding passes the grounding gate |
| UC-2 reviewClauses | clause lines, corpus, classifier | findings + silences per clause | Unknown clause → silence; classifier output outside taxonomy → silence |
| UC-3 verifyLive | law id | {snapshotHash, liveHash, match, checkedAt} | Mismatch → UI withholds findings citing that law until re-verified |

## 6. Acceptance criteria (each → ≥1 test)
- AC-1 Given a citation whose quote appears in the article text (whitespace-insensitive) When verified Then it is a `VerifiedCitation` with title, Korean text, English text, source URL.
- AC-2 Given a citation with a quote not in the text (or a missing article) When grounded Then the candidate becomes a `Silence` with reason `citation-unverified`, never a finding.
- AC-3 Given every citation in the rule library and clause taxonomy When checked against the snapshot Then 100% verify.
- AC-4 Given value 250M, auction ratio 0.7, senior debt 60M, deposit 200M When the auction scenario runs Then recovery = 115M, shortfall = 85M, and a `stop` finding cites HLPA Art. 3-2.
- AC-5 Given no "no new lien until the day after move-in" clause When assessed Then a `caution` finding cites Art. 3 with the quote "그 다음 날부터 제삼자에 대하여 효력이 생긴다"; Given that clause is present Then the finding is `ok`.
- AC-6 Given the lessor did not show the tax payment certificates When assessed Then a `stop` finding cites Art. 3-7; unknown → `caution`; shown → `ok`.
- AC-7 Given region seoul, deposit 150M, no pre-2023-02-21 mortgage When assessed Then small-deposit priority is `info` with protected amount min(55M, auction proceeds/2) citing Art. 8 and Decree Art. 10–11; deposit 170M → not eligible (Decree Art. 11).
- AC-8 Given a senior mortgage registered before 2023-02-21 When assessed Then small-deposit priority is a `Silence` citing Decree Addendum 2023-02-21 Art. 2 (earlier thresholds not in corpus).
- AC-9 Given the clause "임차인은 계약갱신요구권을 행사하지 않는다" When reviewed Then pattern `waive-renewal-right` → `stop`, citing Art. 6-3 and Art. 10.
- AC-10 Given the clause "반려동물 사육 금지" When reviewed Then it is a `Silence` (no verified basis).
- AC-11 Given a classifier returning an id outside the taxonomy When reviewed Then silence `classifier-out-of-taxonomy`.
- AC-12 Given the DRF JSON payload When parsed Then articles are keyed `3`, `3-2`, … with Korean text including paragraphs and items, and English text from the official translation.
- AC-13 Given `src/domain` and `src/application` When their imports are scanned Then none import `adapters`, `infrastructure`, `api`, or any network/framework module.
- AC-14 Given lease term 12 months When assessed Then `info` citing Art. 4(1).
- AC-15 Given any shipped citation When verified Then its English passage (`quoteEn`) is found in the official English translation and highlighted in the UI; the Korean quote stays the only gate.
- AC-16 Given the live law check reports a changed article When the report renders Then every finding citing it becomes a silence `law-changed`.
- AC-17 Given the live law check did not answer When the report renders Then the UI names the snapshot date and never claims a live match.
- AC-18 Given the colour tokens When measured Then every text/background pair is ≥ 4.5:1 in light and dark themes.

## 7. Architecture (Clean)
```
src/domain/          pure types, rules, grounding gate, clause taxonomy   (no I/O)
src/application/     use cases + ports                                    (imports domain only)
src/adapters/        law.go.kr DRF parser, snapshot source, regex & Gemini classifiers
src/infrastructure/  web UI (Vite), statute snapshot JSON
api/                 Vercel functions: /api/verify (law.go.kr live check), /api/classify (Gemini)
scripts/             fetch-statutes (build-time snapshot)
```

## 8. Non-functional
- First render < 1 s on 4G (static, no web fonts, no CDN). Works with JS only; no cookies.
- LLM endpoint: 1 request = ≤ 12 clauses × ≤ 300 chars; JSON-schema-constrained output; 8 s timeout → falls back to the rule matcher with a visible notice.
- Law drift: `/api/verify` compares SHA-256 of each cited article between snapshot and live API.

## 9. Physical verification
- `npm test` green; `npm run build` green.
- Live URL: sample lease → report screenshot at 390 px and 1280 px.
- `/api/verify?law=hlpa` from the deployed function returns `match: true` (or records the real failure mode).
- Clause eval: `npm run eval:clauses` prints precision/recall for rule matcher and LLM path on the labeled set.

## 10. UI acceptance (Toss checklist, adapted)
1 mobile-first 390 px, no horizontal scroll · 2 three steps, ≤ 2 questions per group · 3 headings ≥ 22 px, body 16 px, secondary 13 px · 4 section gap ≥ 24 px, card radius ≥ 16 px · 5 one primary CTA, full width, ≥ 52 px · 6 report starts with the big number (money at risk) ≥ 28 px · 7 statute text inside `<details>` (closed by default) · 8 plain words; every legal term has a one-line gloss · 9 white + one blue + three status colors, contrast ≥ 4.5:1 · 10 no external fonts/CDN.

## 11. Change log
- v0.1 2026-09-24 initial.
- v0.2 2026-09-24 after two mock reviews: English passage highlight (AC-15), drift withholding (AC-16), honest offline state (AC-17), contrast (AC-18), folded info/ok groups and a one-line summary, market-value source hint, max-secured-amount assumption stated.
