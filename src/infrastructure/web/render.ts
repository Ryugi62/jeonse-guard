import type { Report } from '../../application/assessLease.ts';
import type { Finding, Severity, Silence } from '../../domain/finding.ts';
import type { VerifiedCitation } from '../../domain/statute.ts';
import { formatWon, formatWonKo } from '../../domain/text.ts';
import type { Dict, Lang } from './i18n.ts';
import { escapeHtml as e, highlightQuotes, moneyHint, paragraphsEn } from './format.ts';
import type { FormState } from './sample.ts';

export const MOLIT_URL = 'https://www.molit.go.kr/USR/NEWS/m_71/dtl.jsp?id=95092387';
export const REPO_URL = 'https://github.com/Ryugi62/jeonse-guard';

const shield = `<svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="currentColor"/><path d="M32 12 48 18v13c0 10-6.6 17.6-16 21-9.4-3.4-16-11-16-21V18z" fill="#fff"/><path d="m24.5 32 5.5 5.5 10-11" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function renderTop(d: Dict, backLabel: string | null): string {
  return `<header class="top">
    ${backLabel ? `<button class="back" data-action="back" aria-label="${e(backLabel)}"><span aria-hidden="true">‹</span> ${e(backLabel)}</button>` : `<a class="brand" href="/" data-action="home">${shield}<span>Jeonse Guard</span></a>`}
    <button class="lang" data-action="lang" lang="${d.langToggle === '한국어' ? 'ko' : 'en'}">${e(d.langToggle)}</button>
  </header>`;
}

export function renderHome(d: Dict): string {
  return `<main class="screen home">
    <section class="hero">
      <h1>${e(d.heroTitle)}</h1>
      <p class="lede">${e(d.heroBody)}</p>
      <div class="seal-demo" aria-hidden="true">
        <span class="seal"><b>법 제3조의2</b><small>law.go.kr ✓</small></span>
        <span class="seal-line">${e(d.sealDemo)}</span>
      </div>
    </section>
    <section class="stat">
      <p><strong class="stat-num">${e(d.statNumber)}</strong> ${e(d.statText)}</p>
      <a class="source" href="${MOLIT_URL}" target="_blank" rel="noopener">${e(d.statSource)}</a>
    </section>
    <section class="how">
      <h2>${e(d.howTitle)}</h2>
      <ol>
        <li>${e(d.how1)}</li>
        <li>${e(d.how2)}</li>
        <li>${e(d.how3)}</li>
      </ol>
    </section>
    <button class="ghost wide" data-action="start">${e(d.checkMine)}</button>
    <p class="fine">${e(d.privacy)}</p>
  </main>
  <div class="cta-bar"><button class="cta" data-action="sample">${e(d.trySample)}</button></div>`;
}

const TOTAL_STEPS = 4;

function progress(d: Dict, n: number): string {
  const bars = Array.from({ length: TOTAL_STEPS }, (_, i) => `<span class="${i < n ? 'on' : ''}"></span>`).join('');
  return `<div class="progress" role="progressbar" aria-valuemin="1" aria-valuemax="${TOTAL_STEPS}" aria-valuenow="${n}"><div class="bars">${bars}</div><p>${e(d.step(n, TOTAL_STEPS))}</p></div>`;
}

function moneyField(name: keyof FormState, label: string, help: string, form: FormState, lang: Lang, error?: string): string {
  const v = String(form[name] ?? '');
  return `<div class="field">
    <label for="${name}">${e(label)}</label>
    <div class="money"><span aria-hidden="true">₩</span><input id="${name}" name="${name}" inputmode="numeric" autocomplete="off" value="${e(v)}" data-money aria-describedby="${name}-hint ${name}-help"${error ? ' aria-invalid="true"' : ''} /></div>
    <p class="hint" id="${name}-hint" data-hint-for="${name}">${e(moneyHint(v, lang))}</p>
    ${help ? `<p class="help" id="${name}-help">${e(help)}</p>` : ''}
    ${error ? `<p class="error" role="alert">${e(error)}</p>` : ''}
  </div>`;
}

function triField(name: keyof FormState, label: string, d: Dict, form: FormState): string {
  const opts: [string, string][] = [['yes', d.yes], ['no', d.no], ['unknown', d.notYet]];
  return `<fieldset class="field seg-field" data-q><legend>${e(label)}</legend><div class="segmented">
    ${opts.map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}" ${form[name] === v ? 'checked' : ''}/><span>${e(l)}</span></label>`).join('')}
  </div></fieldset>`;
}

export function renderStep(n: number, d: Dict, lang: Lang, form: FormState, errors: Record<string, string>): string {
  let body = '';
  if (n === 1) {
    const regions = ['seoul', 'overcrowding', 'metro', 'other'];
    body = `<h1>${e(d.s1Title)}</h1>
      <fieldset class="field" data-q><legend>${e(d.region)}</legend><p class="help">${e(d.regionHelp)}</p>
        <div class="choices">${regions
          .map((r) => {
            const [name, ex] = d.regions[r]!;
            return `<label class="choice"><input type="radio" name="region" value="${r}" ${form.region === r ? 'checked' : ''}/><span><b>${e(name)}</b>${ex ? `<small>${e(ex)}</small>` : ''}</span></label>`;
          })
          .join('')}</div>
        ${errors.region ? `<p class="error" role="alert">${e(errors.region)}</p>` : ''}
      </fieldset>
      <div class="pair" data-q>
        ${moneyField('homeValue', d.homeValue, d.homeValueHelp, form, lang, errors.homeValue)}
        ${moneyField('deposit', d.deposit, '', form, lang, errors.deposit)}
      </div>`;
  } else if (n === 2) {
    body = `<h1>${e(d.s2Title)}</h1><p class="lede small">${e(d.s2Help)}</p>
      <div class="pair" data-q>
        ${moneyField('seniorDebt', d.seniorDebt, d.seniorDebtHelp, form, lang, errors.seniorDebt)}
        <div class="field"><label for="earliestMortgageDate">${e(d.mortgageDate)}</label>
          <input id="earliestMortgageDate" name="earliestMortgageDate" type="date" value="${e(form.earliestMortgageDate)}" max="2099-12-31" />
          <p class="help">${e(d.mortgageDateHelp)}</p>
          ${errors.earliestMortgageDate ? `<p class="error" role="alert">${e(errors.earliestMortgageDate)}</p>` : ''}
        </div>
      </div>
      <div data-q>${moneyField('seniorDeposits', d.seniorDeposits, d.seniorDepositsHelp, form, lang, errors.seniorDeposits)}</div>`;
  } else if (n === 3) {
    body = `<h1>${e(d.s3Title)}</h1><p class="lede small">${e(d.s3Help)}</p>
      ${triField('lessorShowedTaxCertificates', d.taxCert, d, form)}
      ${triField('lessorShowedFixedDateInfo', d.fixedInfo, d, form)}`;
  } else {
    body = `<h1>${e(d.s4Title)}</h1>
      <div class="field" data-q><label for="specialTerms">${e(d.s4Help)}</label>
        <textarea id="specialTerms" name="specialTerms" rows="7" placeholder="${e(d.termsPlaceholder)}">${e(form.specialTerms)}</textarea></div>
      <div class="field narrow" data-q><label for="leaseMonths">${e(d.leaseMonths)}</label>
        <input id="leaseMonths" name="leaseMonths" inputmode="numeric" value="${e(form.leaseMonths)}" />
        <p class="help">${e(d.leaseMonthsHelp)}</p>
        ${errors.leaseMonths ? `<p class="error" role="alert">${e(errors.leaseMonths)}</p>` : ''}</div>`;
  }
  return `<main class="screen step">${progress(d, n)}<form class="step-form" data-step="${n}" novalidate>${body}</form></main>
    <div class="cta-bar"><button class="cta" data-action="next">${e(n === TOTAL_STEPS ? d.seeReport : d.next)}</button></div>`;
}

const money = (n: number, lang: Lang) => (lang === 'ko' ? formatWonKo(n) : formatWon(n));
const pick = <T extends { en: string; ko: string }>(x: T, lang: Lang) => x[lang];

interface CiteGroup {
  c: VerifiedCitation;
  quotes: string[];
  quotesEn: string[];
}

/** One seal per article: several quotes from the same article are highlighted together. */
function groupCites(cs: VerifiedCitation[]): CiteGroup[] {
  const groups: CiteGroup[] = [];
  for (const c of cs) {
    const g = groups.find((x) => x.c.lawId === c.lawId && x.c.article === c.article);
    const en = c.quoteEn && c.quoteEnFound ? [c.quoteEn] : [];
    if (g) {
      g.quotes.push(c.quote);
      g.quotesEn.push(...en);
    } else groups.push({ c, quotes: [c.quote], quotesEn: en });
  }
  return groups;
}

const sealText = (c: VerifiedCitation) => (c.lawId === 'hlpa' ? '법 ' : '영 ') + c.label.ko.replace(/\(.*?\)\s*/, ' ');

/** The paragraphs that contain a highlighted quote (plus the article heading); the rest folds away. */
function excerpt(text: string, quotes: string[]): { short: string; full: string; trimmed: boolean } {
  const lines = text.split('\n');
  const marked = lines.map((l) => highlightQuotes(l, quotes));
  const keep = marked.filter((l, i) => i === 0 || l.includes('<mark>'));
  const trimmed = keep.length < marked.length && keep.some((l) => l.includes('<mark>'));
  return { short: (trimmed ? keep : marked).join('\n'), full: marked.join('\n'), trimmed };
}

function citeBlock({ c, quotes, quotesEn }: CiteGroup, d: Dict, lang: Lang): string {
  const title = lang === 'ko' ? c.articleTitleKo : c.articleTitleEn ?? c.articleTitleKo;
  const law = lang === 'ko' ? c.lawNameKo : titleCase(c.lawNameEn);
  const ko = excerpt(c.textKo, quotes);
  const en = c.textEn ? excerpt(paragraphsEn(c.textEn), quotesEn) : null;
  const more = ko.trimmed || en?.trimmed;
  return `<details class="cite">
    <summary><span class="seal" aria-hidden="true"><b>${e(sealText(c))}</b><small>law.go.kr ✓</small></span>
      <span class="cite-text"><b>${e(c.label[lang])} ${e(title)}</b><small>${e(law)}</small></span></summary>
    <div class="law">
      <h4>${e(d.officialKo)}</h4>
      <p lang="ko" class="law-ko">${ko.short}</p>
      ${en ? `<h4>${e(d.officialEn)}</h4><p lang="en" class="law-en">${en.short}</p>` : ''}
      ${more ? `<details class="whole"><summary>${e(d.wholeArticle)}</summary><p lang="ko" class="law-ko">${ko.full}</p>${en ? `<p lang="en" class="law-en">${en.full}</p>` : ''}</details>` : ''}
      <p class="meta">${e(d.effective(c.effectiveDate))}${c.textEn && c.enVersionDate ? `<br/>${e(d.translationOf(c.enVersionDate))}` : ''}</p>
      <a href="${e(c.url)}" target="_blank" rel="noopener">${e(d.openLaw)}</a>
    </div>
  </details>`;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b[a-z]/g, (m) => m.toUpperCase()).replace(/\bOf\b/g, 'of').replace(/\bThe\b(?!^)/g, 'the');
}

function findingItem(f: Finding, d: Dict, lang: Lang): string {
  return `<li class="finding sev-${f.severity}" id="f-${e(f.id)}">
    <h3>${e(pick(f.title, lang))}</h3>
    ${f.clause ? `<blockquote class="clause" lang="${/[가-힣]/.test(f.clause) ? 'ko' : 'en'}"><span>${e(d.clauseLabel)}</span>${e(f.clause)}</blockquote>` : ''}
    ${f.source === 'clause-ai' ? `<p class="badge ai">${e(d.aiBadge)}</p>` : ''}
    <p>${e(pick(f.explanation, lang))}</p>
    ${f.action ? `<p class="todo"><b>${e(d.whatToDo)}</b> ${e(pick(f.action, lang))}</p>` : ''}
    ${f.suggestedClause ? `<div class="suggest"><p lang="ko">${e(f.suggestedClause.ko)}</p>${lang === 'en' ? `<p class="suggest-en">${e(f.suggestedClause.en)}</p>` : ''}<button class="ghost small" data-copy="${e(f.suggestedClause.ko)}">${e(d.copyTerm)}</button></div>` : ''}
    <div class="cites">${groupCites(f.citations).map((g) => citeBlock(g, d, lang)).join('')}</div>
  </li>`;
}

function silenceItem(s: Silence, d: Dict, lang: Lang): string {
  return `<li class="silence" data-reason="${e(s.reason)}">
    ${s.clause ? `<blockquote class="clause" lang="${/[가-힣]/.test(s.clause) ? 'ko' : 'en'}"><span>${e(d.clauseLabel)}</span>${e(s.clause)}</blockquote>` : `<h3>${e(pick(s.subject, lang))}</h3>`}
    <p>${e(pick(s.detail, lang))}</p>
    ${s.citations.length ? `<div class="cites">${groupCites(s.citations).map((g) => citeBlock(g, d, lang)).join('')}</div>` : ''}
  </li>`;
}

export function renderRisk(report: Report, d: Dict, lang: Lang): string {
  const s = report.scenario;
  const total = Math.max(s.paidBeforeYou + s.recovery + s.shortfall, s.proceeds, 1);
  const w = (x: number) => ((x / total) * 100).toFixed(2);
  const pct = Math.round(s.ratio * 100);
  const lost = s.shortfall > 0;
  const marker = Math.min(100, (s.proceeds / total) * 100).toFixed(2);
  return `<section class="risk ${lost ? 'is-lost' : 'is-safe'}" aria-labelledby="risk-num">
    <p class="risk-num" id="risk-num">${e(money(s.shortfall, lang))}</p>
    <p class="risk-label">${e(lost ? d.reportAtRisk : d.reportSafe)}</p>
    <div class="queue" role="img" aria-label="${e(`${d.barAhead} ${money(s.paidBeforeYou, lang)}, ${d.barYou} ${money(s.recovery, lang)}, ${d.barLost} ${money(s.shortfall, lang)}`)}">
      <div class="lane">
        <span class="seg ahead" style="width:${w(s.paidBeforeYou)}%"></span><span class="seg you" style="width:${w(s.recovery)}%"></span><span class="seg lost" style="width:${w(s.shortfall)}%"></span>
      </div>
      <span class="marker" style="left:${marker}%"></span>
    </div>
    <ul class="legend">
      <li><i class="ahead"></i>${e(d.barAhead)}<b>${e(money(s.paidBeforeYou, lang))}</b></li>
      <li><i class="you"></i>${e(d.barYou)}<b>${e(money(s.recovery, lang))}</b></li>
      <li><i class="lost"></i>${e(d.barLost)}<b>${e(money(s.shortfall, lang))}</b></li>
    </ul>
    <label class="slider"><span id="ratio-label">${e(d.scenarioLabel(pct))}</span>
      <input type="range" min="50" max="100" step="5" value="${pct}" data-action="ratio" aria-describedby="ratio-note" /></label>
    <p class="help" id="ratio-note">${e(d.scenarioNote)}</p>
  </section>`;
}

export interface ReportView {
  lawCheck: { status: 'checking' | 'ok' | 'drift' | 'offline'; checkedAt?: string };
  snapshotDate: string;
  aiStatus: 'idle' | 'loading' | 'failed' | 'done';
}

export function renderReport(report: Report, d: Dict, lang: Lang, v: ReportView): string {
  const order: Severity[] = ['stop', 'caution', 'info', 'ok'];
  const groups = order
    .map((sev) => {
      const items = report.findings.filter((f) => f.severity === sev);
      if (!items.length) return '';
      const head = `<h2>${e(d.groups[sev]!)} <span class="count">${items.length}</span></h2>`;
      const list = `<ul>${items.map((f) => findingItem(f, d, lang)).join('')}</ul>`;
      return sev === 'info' || sev === 'ok'
        ? `<details class="group fold sev-${sev}"><summary>${head}</summary>${list}</details>`
        : `<section class="group sev-${sev}">${head}${list}</section>`;
    })
    .join('');
  const unmatched = report.silences.filter((s) => s.reason === 'no-verified-basis' && s.clause);
  const lawLine =
    v.lawCheck.status === 'checking'
      ? `<p class="lawcheck checking">${e(d.lawChecking)}</p>`
      : v.lawCheck.status === 'ok'
        ? `<p class="lawcheck ok">${e(d.lawCheckOk(v.lawCheck.checkedAt ?? ''))}</p>`
        : v.lawCheck.status === 'drift'
          ? `<p class="lawcheck drift">${e(d.lawCheckDrift)}</p>`
          : `<p class="lawcheck offline">${e(d.lawCheckOffline(v.snapshotDate))}</p>`;
  const aiButton =
    unmatched.length && v.aiStatus !== 'done'
      ? `<button class="ghost wide" data-action="ai" ${v.aiStatus === 'loading' ? 'disabled aria-busy="true"' : ''}>${e(v.aiStatus === 'loading' ? d.askingAi : d.askAi(unmatched.length))}</button><p class="fine">${e(d.askAiNote)}</p>`
      : '';
  const nStop = report.findings.filter((f) => f.severity === 'stop').length;
  const nCaution = report.findings.filter((f) => f.severity === 'caution').length;
  return `<main class="screen report">
    <div id="risk">${renderRisk(report, d, lang)}</div>
    <p class="summary">${e(d.summary(nStop, nCaution))}</p>
    ${lawLine}
    ${groups}
    <section class="silent"><h2>${e(d.silentTitle)}</h2><p class="help">${e(d.silentBody)}</p>
      ${report.silences.length ? `<ul>${report.silences.map((s) => silenceItem(s, d, lang)).join('')}</ul>` : `<p class="silent-none">${e(d.silentNone)}</p>`}
      ${v.aiStatus === 'failed' ? `<p class="error" role="status">${e(d.aiFailed)}</p>` : ''}
      ${v.aiStatus === 'done' ? `<p class="help" role="status">${e(d.aiDone(report.findings.filter((f) => f.source === 'clause-ai').length, unmatched.length))}</p>` : ''}
      ${aiButton}
    </section>
    <footer class="foot">
      <p>${e(d.disclaimer)}</p>
      <p>${e(d.help)}</p>
      <p>${e(d.corpus)}: ${report.corpus.map((c) => `${e(lang === 'ko' ? c.nameKo : titleCase(c.nameEn))} (${e(d.effective(c.effectiveDate))})`).join(', ')}</p>
      <p><a href="${REPO_URL}" target="_blank" rel="noopener">${e(d.sourceCode)}</a> <button class="linkish" data-action="home">${e(d.startOver)}</button></p>
    </footer>
  </main>
  <div class="cta-bar"><button class="cta secondary" data-action="edit">${e(d.editAnswers)}</button></div>`;
}
