import './styles.css';
import { assessLease, withholdDrifted, type Report } from '../../application/assessLease.ts';
import { parseLeaseFacts, type LeaseFacts } from '../../domain/lease.ts';
import type { Corpus } from '../../domain/statute.ts';
import { DICT, type Lang } from './i18n.ts';
import { digitsToNumber, groupDigits, moneyHint } from './format.ts';
import { renderHome, renderReport, renderRisk, renderStep, renderTop, type ReportView } from './render.ts';
import { EMPTY_FORM, SAMPLE_FORM, type FormState } from './sample.ts';
import { classifyClauses, fetchLawCheck, type LawCheck } from './api.ts';

type Screen = 'home' | 1 | 2 | 3 | 4 | 'report';

const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode */
    }
  },
};

const params = new URLSearchParams(location.search);
const state = {
  lang: ((params.get('lang') as Lang) || (store.get('lang') as Lang) || (navigator.language.startsWith('ko') ? 'ko' : 'en')) as Lang,
  screen: 'home' as Screen,
  form: { ...EMPTY_FORM } as FormState,
  errors: {} as Record<string, string>,
  ai: {} as Record<string, string | null>,
  aiStatus: 'idle' as ReportView['aiStatus'],
  law: { status: 'checking' } as ReportView['lawCheck'],
  lawCheck: null as LawCheck | null,
  corpus: null as Corpus | null,
  snapshotDate: '',
};
if (state.lang !== 'en' && state.lang !== 'ko') state.lang = 'en';

const app = document.getElementById('app')!;

async function loadCorpus(): Promise<Corpus> {
  if (state.corpus) return state.corpus;
  const mod = await import('../../adapters/snapshotSource.ts');
  const snap = mod.loadSnapshot();
  state.corpus = snap.corpus;
  state.snapshotDate = snap.fetchedAt.slice(0, 10);
  return snap.corpus;
}

function toFacts(): { facts: LeaseFacts | null; errors: Record<string, string> } {
  const f = state.form;
  const r = parseLeaseFacts({
    region: f.region,
    homeValue: digitsToNumber(f.homeValue) || '',
    deposit: digitsToNumber(f.deposit) || '',
    seniorDebt: digitsToNumber(f.seniorDebt),
    seniorDeposits: digitsToNumber(f.seniorDeposits),
    earliestMortgageDate: f.earliestMortgageDate,
    lessorShowedTaxCertificates: f.lessorShowedTaxCertificates,
    lessorShowedFixedDateInfo: f.lessorShowedFixedDateInfo,
    leaseMonths: f.leaseMonths,
    specialTerms: f.specialTerms,
    auctionRatio: f.auctionRatio,
  });
  if (r.ok) return { facts: r.facts, errors: {} };
  const d = DICT[state.lang];
  const msg: Record<string, string> = {
    region: d.required,
    homeValue: d.errAmount,
    deposit: d.errAmount,
    seniorDebt: d.errZeroOk,
    seniorDeposits: d.errZeroOk,
    earliestMortgageDate: d.errDate,
    leaseMonths: d.errMonths,
    auctionRatio: d.errRatio,
  };
  return { facts: null, errors: Object.fromEntries(r.errors.map((x) => [x.field, msg[x.field] ?? x.message])) };
}

const STEP_FIELDS: Record<number, string[]> = {
  1: ['region', 'homeValue', 'deposit'],
  2: ['seniorDebt', 'seniorDeposits', 'earliestMortgageDate'],
  3: [],
  4: ['leaseMonths'],
};

function currentReport(): Report | null {
  const { facts } = toFacts();
  if (!facts || !state.corpus) return null;
  const report = assessLease(facts, state.corpus, state.ai);
  return state.lawCheck ? withholdDrifted(report, state.lawCheck.drifted) : report;
}

function render(focusTop = true) {
  const d = DICT[state.lang];
  document.documentElement.lang = state.lang;
  const back = state.screen === 'home' ? null : d.back;
  let body = '';
  if (state.screen === 'home') body = renderHome(d);
  else if (state.screen === 'report') {
    const report = currentReport();
    body = report
      ? renderReport(report, d, state.lang, { lawCheck: state.law, snapshotDate: state.snapshotDate, aiStatus: state.aiStatus })
      : renderStep(1, d, state.lang, state.form, state.errors);
  } else body = renderStep(state.screen, d, state.lang, state.form, state.errors);
  app.innerHTML = renderTop(d, back) + body;
  if (focusTop) window.scrollTo({ top: 0 });
}

async function goReport() {
  await loadCorpus();
  state.screen = 'report';
  render();
  if (!state.lawCheck && state.law.status === 'checking') {
    try {
      const check = await fetchLawCheck();
      state.lawCheck = check;
      state.law = {
        status: check.ok ? 'ok' : 'drift',
        checkedAt: new Date(check.checkedAt).toLocaleString(state.lang === 'ko' ? 'ko-KR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' }) + ' KST',
      };
    } catch {
      state.law = { status: 'offline' };
    }
    if (state.screen === 'report') render(false);
  }
}

function next() {
  if (typeof state.screen !== 'number') return;
  const { errors } = toFacts();
  const mine = Object.fromEntries(Object.entries(errors).filter(([k]) => STEP_FIELDS[state.screen as number]!.includes(k)));
  const d = DICT[state.lang];
  if (state.screen === 1 && !state.form.region) mine.region = d.required;
  if (Object.keys(mine).length) {
    state.errors = mine;
    render(false);
    (app.querySelector('[aria-invalid="true"], .error') as HTMLElement | null)?.scrollIntoView({ block: 'center' });
    return;
  }
  state.errors = {};
  if (state.screen === 4) void goReport();
  else {
    state.screen = (state.screen + 1) as Screen;
    render();
  }
}

app.addEventListener('click', async (ev) => {
  const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-action], [data-copy]');
  if (!t) return;
  if (t.dataset.copy !== undefined) {
    try {
      await navigator.clipboard.writeText(t.dataset.copy);
      t.textContent = DICT[state.lang].copied;
    } catch {
      /* clipboard blocked */
    }
    return;
  }
  const a = t.dataset.action;
  if (a === 'home') {
    ev.preventDefault();
    state.screen = 'home';
    render();
  } else if (a === 'lang') {
    state.lang = state.lang === 'en' ? 'ko' : 'en';
    store.set('lang', state.lang);
    render(false);
  } else if (a === 'sample') {
    state.form = { ...SAMPLE_FORM };
    state.ai = {};
    state.aiStatus = 'idle';
    void goReport();
  } else if (a === 'start') {
    state.form = { ...EMPTY_FORM };
    state.ai = {};
    state.aiStatus = 'idle';
    state.screen = 1;
    render();
  } else if (a === 'next') {
    ev.preventDefault();
    next();
  } else if (a === 'back') {
    state.errors = {};
    state.screen = state.screen === 'report' ? 4 : state.screen === 1 || state.screen === 'home' ? 'home' : ((state.screen as number) - 1) as Screen;
    render();
  } else if (a === 'edit') {
    state.screen = 1;
    render();
  } else if (a === 'ai') {
    const report = currentReport();
    if (!report) return;
    const clauses = report.silences.filter((s) => s.reason === 'no-verified-basis' && s.clause).map((s) => s.clause!.slice(0, 300)).slice(0, 12);
    state.aiStatus = 'loading';
    render(false);
    try {
      state.ai = { ...state.ai, ...(await classifyClauses(clauses)) };
      state.aiStatus = 'done';
    } catch {
      state.aiStatus = 'failed';
    }
    render(false);
  }
});

app.addEventListener('input', (ev) => {
  const el = ev.target as HTMLInputElement;
  if (el.dataset.action === 'ratio') {
    state.form.auctionRatio = Number(el.value) / 100;
    const report = currentReport();
    if (report) {
      const holder = document.getElementById('risk')!;
      holder.innerHTML = renderRisk(report, DICT[state.lang], state.lang);
      const slider = holder.querySelector<HTMLInputElement>('input[type=range]');
      slider?.focus();
    }
    return;
  }
  if (!el.name || !(el.name in state.form)) return;
  if (state.errors[el.name]) {
    delete state.errors[el.name];
    el.removeAttribute('aria-invalid');
    el.closest('.field')?.querySelector('.error')?.remove();
  }
  if (el.dataset.money !== undefined) {
    const pos = el.value.length - (el.selectionStart ?? el.value.length);
    el.value = groupDigits(el.value);
    const p = Math.max(0, el.value.length - pos);
    el.setSelectionRange(p, p);
    const hint = app.querySelector(`[data-hint-for="${el.name}"]`);
    if (hint) hint.textContent = moneyHint(el.value, state.lang);
  }
  (state.form as Record<string, unknown>)[el.name] = el.value;
});

app.addEventListener('change', (ev) => {
  const el = ev.target as HTMLInputElement;
  if (el.type === 'radio' && el.name in state.form) {
    (state.form as Record<string, unknown>)[el.name] = el.value;
    if (state.errors[el.name]) {
      delete state.errors[el.name];
      el.closest('fieldset')?.querySelector('.error')?.remove();
    }
  }
});

app.addEventListener('submit', (ev) => {
  ev.preventDefault();
  next();
});

if (params.get('sample') === '1') {
  state.form = { ...SAMPLE_FORM };
  void goReport();
} else render();
