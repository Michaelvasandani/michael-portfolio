// Uses the public API behind react-github-calendar; responses are cached upstream for one hour.
export async function fetchContributions(year, fetcher = globalThis.fetch) {
  const response = await fetcher(`https://github-contributions-api.jogruber.de/v4/Michaelvasandani?y=${year}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('GitHub activity is unavailable');
  const data = await response.json();
  if (!Number.isInteger(data.total?.[year]) || !Array.isArray(data.contributions) || !data.contributions.length ||
      !data.contributions.every(day => /^\d{4}-\d{2}-\d{2}$/.test(day.date) && Number.isInteger(day.count) && day.count >= 0 && Number.isInteger(day.level) && day.level >= 0 && day.level <= 4)) {
    throw new Error('GitHub activity is incomplete');
  }
  return data;
}

export function calendarDays(year, contributions, today = new Date().toISOString().slice(0, 10)) {
  const byDate = new Map(contributions.map(day => [day.date, day]));
  const start = new Date(Date.UTC(year, 0, 1));
  const offset = start.getUTCDay();
  const days = [];
  for (let date = new Date(start); date.getUTCFullYear() === year; date.setUTCDate(date.getUTCDate() + 1)) {
    const key = date.toISOString().slice(0, 10);
    days.push({ date: key, count: byDate.get(key)?.count ?? 0, level: byDate.get(key)?.level ?? 0,
      row: date.getUTCDay(), column: Math.floor((days.length + offset) / 7), future: key > today });
  }
  return days;
}

function svgElement(name, attributes, text) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderCalendar(year, contributions, chart, detail) {
  const days = calendarDays(year, contributions);
  const svg = svgElement('svg', { viewBox: `0 0 ${42 + (days.at(-1).column + 1) * 12} 110`, role: 'group', 'aria-label': `Daily GitHub contributions in ${year}. Use arrow keys to explore days.` });
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (const day of days.filter(day => day.date.endsWith('-01'))) {
    svg.append(svgElement('text', {x: 36 + day.column * 12, y: 12}, months[Number(day.date.slice(5,7))-1]));
  }
  for (const [row, label] of [[1,'Mon'],[3,'Wed'],[5,'Fri']]) {
    svg.append(svgElement('text', {x: 0, y: 28 + row * 12}, label));
  }
  const cells = [];
  for (const day of days) {
    const label = `${day.count} ${day.count === 1 ? 'contribution' : 'contributions'} on ${day.date}`;
    const rect = svgElement('rect', {x:36 + day.column * 12, y:20 + day.row * 12, width:9, height:9, rx:2,
      class:'calendar-day', 'data-level':day.level, 'data-future':day.future,
      'aria-label':day.future ? `${day.date}, future date` : label, role:'img'});
    rect.append(svgElement('title', {}, day.future ? `${day.date}, future date` : label));
    if (!day.future) {
      rect.setAttribute('tabindex', cells.length ? '-1' : '0');
      const show = () => { detail.textContent = label; };
      const hide = () => { detail.textContent = ''; };
      rect.addEventListener('mouseleave', hide);
      rect.addEventListener('blur', hide);
      rect.addEventListener('mouseenter', show);
      rect.addEventListener('focus', show);
      rect.addEventListener('click', () => { cells.forEach(cell => cell.setAttribute('tabindex', '-1')); rect.setAttribute('tabindex', '0'); rect.focus(); });
      cells.push(rect);
    }
    svg.append(rect);
  }
  svg.addEventListener('keydown', event => {
    const index = cells.indexOf(document.activeElement);
    const steps = {ArrowRight:7, ArrowLeft:-7, ArrowDown:1, ArrowUp:-1};
    if (index < 0 || !(event.key in steps)) return;
    event.preventDefault();
    const next = cells[Math.max(0, Math.min(cells.length - 1, index + steps[event.key]))];
    cells[index].setAttribute('tabindex', '-1');
    next.setAttribute('tabindex', '0');
    next.focus();
  });
  chart.replaceChildren(svg);
}

if (typeof document !== 'undefined') {
  const years = document.querySelector('#contribution-years');
  let selectedYear = new Date().getFullYear();
  const chart = document.querySelector('#calendar-chart');
  const status = document.querySelector('#calendar-status');
  const retry = document.querySelector('#calendar-retry');
  const detail = document.querySelector('#calendar-detail');
  const legend = document.querySelector('#calendar-legend');
  const currentYear = new Date().getFullYear();
  // Offer years back to 2022, as in the reference; keep the current year automatic.
  for (let year = currentYear; year >= 2022; year--) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = year;
    button.setAttribute('aria-pressed', String(year === selectedYear));
    button.addEventListener('click', () => {
      selectedYear = year;
      for (const sibling of years.children) sibling.setAttribute('aria-pressed', String(sibling === button));
      load();
    });
    years.append(button);
  }
  years.hidden = false;
  let request = 0;
  async function load() {
    const id = ++request;
    const year = selectedYear;
    chart.hidden = legend.hidden = detail.hidden = retry.hidden = true;
    status.textContent = `Loading contributions for ${year}…`;
    try {
      const data = await fetchContributions(year);
      if (id !== request) return;
      renderCalendar(year, data.contributions, chart, detail);
      status.textContent = `${data.total[year].toLocaleString()} contributions in ${year}`;
      detail.textContent = '';
      chart.hidden = legend.hidden = detail.hidden = false;
    } catch {
      if (id !== request) return;
      status.textContent = 'GitHub activity is unavailable right now. Try again or view it on GitHub.';
      retry.hidden = false;
    }
  }
  retry.addEventListener('click', load);
  load();
}
