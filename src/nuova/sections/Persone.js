import { Panel } from '../ui';
import { BarList } from '../charts';
import { fmt, dshort } from '../format';
import { AGE_LABELS } from '../model';

export default function Persone({ ctx }) {
  const { people: P, birthdays, openClassic } = ctx;
  const ageTot = P.ages.reduce((s, n) => s + n, 0) || 1;
  const g = P.gender.M + P.gender.F || 1;
  return (
    <div className="nx-grid">
      <Panel span={12} title="Pubblico">
        <div className="nx-stats">
          <div className="nx-stat"><div className="v">{fmt(P.total)}</div><div className="l">persone registrate</div></div>
          <div className="nx-stat"><div className="v">{fmt(P.came)}</div><div className="l">entrate almeno una volta</div></div>
          <div className="nx-stat"><div className="v">{fmt(P.returned)}</div><div className="l">tornate 2+ volte · {fmt((100 * P.returned) / (P.came || 1), 1)}%</div></div>
          <div className="nx-stat"><div className="v">{fmt(P.perPerson, 1)}</div><div className="l">serate per persona entrata</div></div>
        </div>
        <p className="nx-note">Una persona è riconosciuta dal telefono, poi dall'email: chi si registra con due email conta una volta.</p>
      </Panel>
      <Panel span={6} title="Età" hint="chi ha indicato la data di nascita, età di oggi">
        <BarList labelWidth={62} format={(v) => `${fmt(v)} · ${fmt((100 * v) / ageTot, 0)}%`}
          items={P.ages.map((n, i) => ({ label: AGE_LABELS[i], value: n, color: i === 0 ? 'var(--nx-warn)' : undefined }))} />
        <p className="nx-note"><span className="nx-tag warn">da decidere</span> <b>{fmt(P.ages[0])}</b> persone hanno meno di 18 anni: in attesa della decisione su WhatsApp e promozioni di alcol.</p>
      </Panel>
      <Panel span={3} title="Sesso">
        <div style={{ display: 'flex', height: 12, gap: 1, margin: '4px 0 8px' }}>
          <span style={{ width: `${(100 * P.gender.M) / g}%`, background: 'var(--nx-v-studios)' }} />
          <span style={{ width: `${(100 * P.gender.F) / g}%`, background: 'var(--nx-v-peggy)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span>uomini <b className="nx-num">{fmt((100 * P.gender.M) / g, 1)}%</b></span>
          <span>donne <b className="nx-num">{fmt((100 * P.gender.F) / g, 1)}%</b></span>
        </div>
      </Panel>
      <Panel span={3} title="Compleanni" hint="prossimi 7 giorni">
        <BarList labelWidth={56} items={birthdays.map((b, i) => ({ label: i ? dshort(b.date).split(' ').slice(0, 2).join(' ') : 'oggi', value: b.count, dim: i > 0 }))} />
        <p className="nx-note">Auguri e ricontatti su WhatsApp: <button className="nx-link" onClick={openClassic}>apri la vista classica</button>.</p>
      </Panel>
    </div>
  );
}
