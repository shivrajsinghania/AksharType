/**
 * AksharType — Pure Canvas Charts (Zero External Chart Libraries)
 * 1. ResultsChart: Per-second WPM & Mistake timeline after a completed test
 * 2. TrendChart: All-time chronological Net WPM & Accuracy % progression across sessions
 */

export class ResultsChart {
  constructor(canvas, tooltipEl) {
    this.canvas = canvas;
    this.tooltipEl = tooltipEl;
    this.samples = [];
    this.hoverIndex = -1;
    this.coords = [];

    this._onMove = this._handleMouseMove.bind(this);
    this._onLeave = this._handleMouseLeave.bind(this);
    this._onResize = () => {
      if (this.samples.length > 0) this.draw();
    };

    if (this.canvas) {
      this.canvas.addEventListener('mousemove', this._onMove);
      this.canvas.addEventListener('mouseleave', this._onLeave);
    }
    window.addEventListener('resize', this._onResize);
  }

  render(samples) {
    this.samples =
      samples && samples.length > 0
        ? samples
        : [{ second: 1, netWpm: 0, rawWpm: 0, errors: 0 }];
    this.hoverIndex = -1;
    if (this.tooltipEl) this.tooltipEl.classList.add('is-hidden');
    this.draw();
  }

  draw() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = rect.height;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);

    const ctx = this.canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const pad = { top: 18, right: 20, bottom: 28, left: 42 };
    const plotW = Math.max(10, width - pad.left - pad.right);
    const plotH = Math.max(10, height - pad.top - pad.bottom);

    const data = this.samples;
    const maxWpmRaw = Math.max(20, ...data.map((d) => Math.max(d.netWpm, d.rawWpm)));
    const maxY = Math.ceil(maxWpmRaw / 10) * 10 + 10;

    const ticks = 4;
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= ticks; i += 1) {
      const val = Math.round((maxY / ticks) * i);
      const y = pad.top + plotH - (i / ticks) * plotH;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();

      ctx.fillStyle = '#71717a';
      ctx.fillText(String(val), pad.left - 10, y);
    }

    const count = data.length;
    this.coords = data.map((d, idx) => {
      const x =
        count === 1 ? pad.left + plotW / 2 : pad.left + (idx / (count - 1)) * plotW;
      const yNet = pad.top + plotH - (d.netWpm / maxY) * plotH;
      const yRaw = pad.top + plotH - (d.rawWpm / maxY) * plotH;
      return { x, yNet, yRaw, sample: d };
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#71717a';
    const xLabelCount = Math.min(count, 6);
    for (let i = 0; i < xLabelCount; i += 1) {
      const idx =
        xLabelCount === 1
          ? 0
          : Math.round((i / (xLabelCount - 1)) * (count - 1));
      const pt = this.coords[idx];
      ctx.fillText(`${pt.sample.second}s`, pt.x, pad.top + plotH + 10);
    }

    const drawCurve = (getY, strokeStyle, lineWidth, fillGrad) => {
      if (this.coords.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(this.coords[0].x, getY(this.coords[0]));

      if (this.coords.length === 1) {
        ctx.lineTo(this.coords[0].x + 0.1, getY(this.coords[0]));
      } else {
        for (let i = 0; i < this.coords.length - 1; i += 1) {
          const curr = this.coords[i];
          const next = this.coords[i + 1];
          const midX = (curr.x + next.x) / 2;
          const midY = (getY(curr) + getY(next)) / 2;
          ctx.quadraticCurveTo(curr.x, getY(curr), midX, midY);
        }
        const last = this.coords[this.coords.length - 1];
        ctx.lineTo(last.x, getY(last));
      }

      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      if (fillGrad) {
        const last = this.coords[this.coords.length - 1];
        ctx.lineTo(last.x, pad.top + plotH);
        ctx.lineTo(this.coords[0].x, pad.top + plotH);
        ctx.closePath();
        ctx.fillStyle = fillGrad;
        ctx.fill();
      }
    };

    ctx.save();
    ctx.setLineDash([4, 4]);
    drawCurve((p) => p.yRaw, '#52525b', 1.5, null);
    ctx.restore();

    const areaGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
    areaGrad.addColorStop(0, 'rgba(250, 250, 250, 0.12)');
    areaGrad.addColorStop(1, 'rgba(250, 250, 250, 0.0)');
    drawCurve((p) => p.yNet, '#fafafa', 2, areaGrad);

    for (const pt of this.coords) {
      if (pt.sample.errors > 0) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.yNet, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#f87171';
        ctx.fill();
        ctx.strokeStyle = '#111113';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    if (this.hoverIndex >= 0 && this.hoverIndex < this.coords.length) {
      const pt = this.coords[this.hoverIndex];
      ctx.strokeStyle = 'rgba(250, 250, 250, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pt.x, pad.top);
      ctx.lineTo(pt.x, pad.top + plotH);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pt.x, pt.yNet, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fafafa';
      ctx.fill();
    }
  }

  _handleMouseMove(event) {
    if (this.coords.length === 0 || !this.tooltipEl) return;
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;

    let nearest = 0;
    let bestDist = Infinity;
    for (let i = 0; i < this.coords.length; i += 1) {
      const dist = Math.abs(this.coords[i].x - mouseX);
      if (dist < bestDist) {
        bestDist = dist;
        nearest = i;
      }
    }

    if (nearest !== this.hoverIndex) {
      this.hoverIndex = nearest;
      this.draw();
    }

    const pt = this.coords[nearest];
    const s = pt.sample;
    this.tooltipEl.textContent = '';
    const lines = [
      `${s.second}s`,
      `Net: ${s.netWpm} WPM · Raw: ${s.rawWpm}`,
      `Mistakes: ${s.errors}`,
    ];
    lines.forEach((txt) => {
      const d = document.createElement('div');
      d.textContent = txt;
      this.tooltipEl.appendChild(d);
    });
    this.tooltipEl.classList.remove('is-hidden');

    const tipW = this.tooltipEl.offsetWidth || 150;
    let left = pt.x + 12;
    if (left + tipW > rect.width - 8) {
      left = pt.x - tipW - 12;
    }
    const top = Math.max(8, pt.yNet - 48);
    this.tooltipEl.style.left = `${Math.max(8, left)}px`;
    this.tooltipEl.style.top = `${top}px`;
  }

  _handleMouseLeave() {
    if (this.hoverIndex !== -1) {
      this.hoverIndex = -1;
      this.draw();
    }
    if (this.tooltipEl) this.tooltipEl.classList.add('is-hidden');
  }
}

/**
 * All-Time WPM & Accuracy Trend Chart (Performance Dashboard)
 */
export class TrendChart {
  constructor(canvas, tooltipEl) {
    this.canvas = canvas;
    this.tooltipEl = tooltipEl;
    this.series = [];
    this.hoverIndex = -1;
    this.coords = [];

    this._onMove = this._handleMouseMove.bind(this);
    this._onLeave = this._handleMouseLeave.bind(this);
    this._onResize = () => {
      if (this.series.length > 0) this.draw();
    };

    if (this.canvas) {
      this.canvas.addEventListener('mousemove', this._onMove);
      this.canvas.addEventListener('mouseleave', this._onLeave);
    }
    window.addEventListener('resize', this._onResize);
  }

  render(series) {
    this.series = Array.isArray(series) ? series : [];
    this.hoverIndex = -1;
    if (this.tooltipEl) this.tooltipEl.classList.add('is-hidden');
    this.draw();
  }

  draw() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = rect.height;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);

    const ctx = this.canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (this.series.length === 0) {
      this.coords = [];
      ctx.font = '13px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#71717a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Complete at least one typing session to see your trend.', width / 2, height / 2);
      return;
    }

    const pad = { top: 18, right: 44, bottom: 28, left: 42 };
    const plotW = Math.max(10, width - pad.left - pad.right);
    const plotH = Math.max(10, height - pad.top - pad.bottom);

    const maxWpmRaw = Math.max(30, ...this.series.map((d) => d.netWpm));
    const maxWpm = Math.ceil(maxWpmRaw / 10) * 10 + 10;

    // Grid & dual Y axis labels (Left: WPM, Right: Accuracy %)
    const ticks = 4;
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= ticks; i += 1) {
      const y = pad.top + plotH - (i / ticks) * plotH;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();

      // Left axis: WPM
      ctx.textAlign = 'right';
      ctx.fillStyle = '#a1a1aa';
      ctx.fillText(String(Math.round((maxWpm / ticks) * i)), pad.left - 10, y);

      // Right axis: Accuracy %
      ctx.textAlign = 'left';
      ctx.fillStyle = '#34d399';
      ctx.fillText(`${Math.round((100 / ticks) * i)}%`, pad.left + plotW + 8, y);
    }

    const count = this.series.length;
    this.coords = this.series.map((d, idx) => {
      const x =
        count === 1 ? pad.left + plotW / 2 : pad.left + (idx / (count - 1)) * plotW;
      const yWpm = pad.top + plotH - (d.netWpm / maxWpm) * plotH;
      const yAcc = pad.top + plotH - (Math.min(100, Math.max(0, d.accuracy)) / 100) * plotH;
      return { x, yWpm, yAcc, item: d };
    });

    // X axis labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#71717a';
    const xLabelCount = Math.min(count, 6);
    for (let i = 0; i < xLabelCount; i += 1) {
      const idx =
        xLabelCount === 1
          ? 0
          : Math.round((i / (xLabelCount - 1)) * (count - 1));
      const pt = this.coords[idx];
      ctx.fillText(pt.item.dateLabel, pt.x, pad.top + plotH + 10);
    }

    // Accuracy % dashed emerald line
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    this.coords.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.yAcc);
      else ctx.lineTo(pt.x, pt.yAcc);
    });
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();

    // Net WPM solid white line + subtle fill
    ctx.beginPath();
    this.coords.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.yWpm);
      else ctx.lineTo(pt.x, pt.yWpm);
    });
    ctx.strokeStyle = '#fafafa';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    if (this.coords.length > 1) {
      const areaGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
      areaGrad.addColorStop(0, 'rgba(250, 250, 250, 0.11)');
      areaGrad.addColorStop(1, 'rgba(250, 250, 250, 0.0)');
      const last = this.coords[this.coords.length - 1];
      ctx.lineTo(last.x, pad.top + plotH);
      ctx.lineTo(this.coords[0].x, pad.top + plotH);
      ctx.closePath();
      ctx.fillStyle = areaGrad;
      ctx.fill();
    }

    // Data point dots
    for (const pt of this.coords) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.yWpm, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fafafa';
      ctx.fill();
    }

    // Hover marker
    if (this.hoverIndex >= 0 && this.hoverIndex < this.coords.length) {
      const pt = this.coords[this.hoverIndex];
      ctx.strokeStyle = 'rgba(250, 250, 250, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pt.x, pad.top);
      ctx.lineTo(pt.x, pad.top + plotH);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pt.x, pt.yWpm, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fafafa';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pt.x, pt.yAcc, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#34d399';
      ctx.fill();
    }
  }

  _handleMouseMove(event) {
    if (this.coords.length === 0 || !this.tooltipEl) return;
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;

    let nearest = 0;
    let bestDist = Infinity;
    for (let i = 0; i < this.coords.length; i += 1) {
      const dist = Math.abs(this.coords[i].x - mouseX);
      if (dist < bestDist) {
        bestDist = dist;
        nearest = i;
      }
    }

    if (nearest !== this.hoverIndex) {
      this.hoverIndex = nearest;
      this.draw();
    }

    const pt = this.coords[nearest];
    const s = pt.item;
    this.tooltipEl.textContent = '';
    const lines = [
      `#${s.index} · ${s.dateLabel} (${s.layoutName})`,
      `Net WPM: ${s.netWpm} · Accuracy: ${s.accuracy}%`,
      `Mistakes: ${s.mistakes}`,
    ];
    lines.forEach((txt) => {
      const d = document.createElement('div');
      d.textContent = txt;
      this.tooltipEl.appendChild(d);
    });
    this.tooltipEl.classList.remove('is-hidden');

    const tipW = this.tooltipEl.offsetWidth || 180;
    let left = pt.x + 12;
    if (left + tipW > rect.width - 8) {
      left = pt.x - tipW - 12;
    }
    const top = Math.max(8, pt.yWpm - 54);
    this.tooltipEl.style.left = `${Math.max(8, left)}px`;
    this.tooltipEl.style.top = `${top}px`;
  }

  _handleMouseLeave() {
    if (this.hoverIndex !== -1) {
      this.hoverIndex = -1;
      this.draw();
    }
    if (this.tooltipEl) this.tooltipEl.classList.add('is-hidden');
  }
}
