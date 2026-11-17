import { ExternalLink, FlaskConical } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import SectionHeading from '../components/ui/SectionHeading'
import { ErrorState, LoadingBlock } from '../components/ui/States'
import GameMark from '../components/GameMark'
import Badge from '../components/ui/Badge'
import { useApi } from '../hooks/useApi'
import { api } from '../services/api'
import { GAME_ORDER, metaFor } from '../utils/games'
import { fmt, fmtInt, fmtPct } from '../utils/format'

const TOC = [
  ['problem', 'Problem statement'],
  ['objectives', 'Objectives'],
  ['datasets', 'Datasets'],
  ['preprocessing', 'Data preprocessing'],
  ['features', 'Feature engineering'],
  ['algorithms', 'Algorithms'],
  ['evaluation', 'Training & evaluation'],
  ['why-not-mmr', 'Why not MMR?'],
  ['limitations', 'Limitations'],
  ['future', 'Future scope'],
]

// Leakage decisions documented in ml/<game>/feature_engineering.py
const EXCLUDED = {
  csgo: ['rating_ct / rating_t: parts of the target itself', 'Series-level rating when predicting a single map', 'Player, team and match identifiers'],
  pubg: [
    'killPlace: ranks your kills against everyone else after the match, so it leaks the result',
    'maxPlace, numGroups: lobby information only known after the match',
    'rankPoints, killPoints, winPoints: Kaggle marks these as deprecated; 38–60% missing',
  ],
  valorant: ['rating-t / rating-ct: components of the target', 'Attack/defence stat splits and K−D differences', 'Player and team names'],
  dota2: ['TrueSkill, total wins, total matches: calculated from match results', 'Hero ID, items, account ID', 'Players who abandoned (whole match removed)'],
}

export default function Methodology() {
  const all = useApi(() => Promise.all(GAME_ORDER.map((g) => api.modelInfo(g).catch(() => null))), [])
  const experiments = useApi(() => api.experiments(), [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <SectionHeading as="h1" eyebrow="About & methodology" title="How the predictor was built">
        The whole pipeline, from raw CSV files to an explained prediction, written so it can be explained in a project
        viva. Dataset sizes, features and experiment results on this page are loaded from the trained artifacts.
      </SectionHeading>

      <div className="mt-12 grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label="On this page" className="hidden lg:block">
          <ul className="sticky top-24 space-y-1 border-l border-line-soft text-sm">
            {TOC.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="-ml-px block border-l border-transparent py-1 pl-4 text-muted hover:border-violet hover:text-ink">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-14">
          <Section id="problem" title="Problem statement">
            <p>
              Classic rating systems such as Elo and TrueSkill update a player’s rating using only wins and losses. Two
              players who win the same match get the same credit, even if one carried the team and the other barely
              contributed. Players and analysts want a measure of <em>how well someone played</em>, based on what
              they actually did in the match.
            </p>
            <p>
              This project builds a separate machine-learning model for each of four games. Each model maps a player’s
              match statistics to a performance-related target. It also explains every prediction, so users can see
              which parts of their play mattered.
            </p>
          </Section>

          <Section id="objectives" title="Objectives">
            <ol className="list-decimal space-y-2 pl-5">
              <li>Clean four public esports datasets and record every row that is removed.</li>
              <li>Engineer meaningful per-round, per-minute and ratio features (K/D, KDA, HS%, KPR, ADR …).</li>
              <li>Train and compare Linear, Decision Tree, Random Forest, Gradient Boosting and XGBoost models per game.</li>
              <li>Evaluate honestly on held-out players or matches using R², MAE, MSE, RMSE or ROC-AUC, accuracy and F1.</li>
              <li>Explain predictions with SHAP values.</li>
              <li>Serve the models through a validated FastAPI backend and a React web application.</li>
            </ol>
          </Section>

          <Section id="datasets" title="Datasets">
            {all.loading ? (
              <LoadingBlock rows={2} />
            ) : all.error ? (
              <ErrorState error={all.error} onRetry={all.reload} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {all.data.map((info, i) =>
                  info ? (
                    <Card key={info.schema.game} className="hover-pop spotlight p-5" style={{ '--pop': metaFor(info.schema.game).accent }}>
                      <div className="flex items-center gap-3">
                        <GameMark game={info.schema.game} size="sm" className="pop-icon" />
                        <p className="font-bold text-ink">{info.schema.name}</p>
                        <Badge tone="violet" className="ml-auto">{info.schema.target_name}</Badge>
                      </div>
                      <p className="mt-3 text-sm text-ink-2">{info.metrics.dataset.name}</p>
                      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                        <Stat label="Raw rows" value={fmtInt(info.metrics.dataset.raw_rows)} />
                        <Stat label="Clean rows" value={fmtInt(info.metrics.dataset.clean_rows)} />
                        <Stat label="Inputs" value={info.schema.inputs.length} />
                      </dl>
                      <p className="mt-3 text-xs text-muted">One row = {info.metrics.dataset.unit_of_analysis.toLowerCase()}.</p>
                      {info.metrics.dataset.url.startsWith('http') ? (
                        <a href={info.metrics.dataset.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan hover:underline">
                          Dataset source <ExternalLink className="size-3" aria-hidden />
                        </a>
                      ) : (
                        <p className="mt-2 text-xs text-warn">{info.metrics.dataset.url}</p>
                      )}
                    </Card>
                  ) : (
                    <Card key={GAME_ORDER[i]} className="p-5 text-sm text-muted">
                      {metaFor(GAME_ORDER[i]).title}: model not available.
                    </Card>
                  ),
                )}
              </div>
            )}
          </Section>

          <Section id="preprocessing" title="Data preprocessing">
            <p>Each game has its own <code className="text-violet-hi">preprocessing.py</code>. The common steps are:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li><b className="text-ink">Reshape</b> data to one row per player per map or match. For CS:GO, the per-map blocks <code>m1_*/m2_*/m3_*</code> are unpivoted and rounds played are joined in from the match results.</li>
              <li><b className="text-ink">Missing values:</b> rows missing the target or a model input are dropped instead of filled in, because every dataset has enough complete rows.</li>
              <li><b className="text-ink">Duplicates</b> are removed.</li>
              <li><b className="text-ink">Impossible values</b> are filtered out, for example more deaths than rounds, more headshots than kills, KAST above 100%, VALORANT rows with shifted columns, and PUBG players with kills but zero movement (likely cheaters).</li>
              <li><b className="text-ink">Scope filters</b> keep comparable data only: standard PUBG modes, Dota 2 Ranked All Pick, and Dota 2 matches with no abandons.</li>
              <li><b className="text-ink">Sampling:</b> PUBG uses 15,000 randomly chosen <em>whole matches</em> so training fits on a laptop.</li>
            </ul>
            <p>The exact row counts removed by every step are shown in the cleaning log on the Analytics page.</p>
          </Section>

          <Section id="features" title="Feature engineering">
            <p>
              The user types in the raw statistics. The same <code className="text-violet-hi">build_features()</code> function
              is used in training and by the API, so the two can never disagree. It turns those raw inputs into the
              features below.
            </p>
            {all.data && (
              <div className="space-y-4">
                {all.data.filter(Boolean).map((info) => {
                  const inputs = new Set(info.schema.inputs.map((f) => f.name))
                  const engineered = info.schema.model_features.filter((f) => !inputs.has(f))
                  const L = info.schema.feature_labels || {}
                  return (
                    <Card key={info.schema.game} className="p-5">
                      <p className="font-bold text-ink">{info.schema.name}</p>
                      <p className="eyebrow mt-3">User inputs ({inputs.size})</p>
                      <Chips items={info.schema.inputs.map((f) => f.label)} />
                      <p className="eyebrow mt-3">Engineered features ({engineered.length})</p>
                      <Chips items={engineered.map((f) => L[f] || f)} tone="cyan" />
                      <p className="eyebrow mt-3">Deliberately excluded (leakage / unusable)</p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-2">
                        {EXCLUDED[info.schema.game].map((e) => (
                          <li key={e}>{e}</li>
                        ))}
                      </ul>
                    </Card>
                  )
                })}
              </div>
            )}
          </Section>

          <Section id="algorithms" title="Algorithms">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Linear / Logistic Regression', 'Fits a weighted sum of the features. Fast and easy to interpret; it is the baseline. Uses standardised features.'],
                ['Decision Tree', 'Learns if/else rules on the features. Easy to follow, but a single tree overfits easily (depth limited to 12).'],
                ['Random Forest', 'Averages 100 trees, each trained on a random sample of rows and features. Averaging lowers variance.'],
                ['Gradient Boosting (HistGB)', 'Adds trees one after another, each correcting the errors of the ones before. Uses histogram binning for speed.'],
                ['XGBoost', 'Regularised gradient boosting with row and column subsampling. Often the strongest model on tabular data.'],
                ['SHAP', 'Game-theory method (Shapley values) that splits each prediction into exact per-feature contributions.'],
              ].map(([t, d]) => (
                <Card key={t} className="hover-pop spotlight p-4">
                  <p className="font-bold text-ink">{t}</p>
                  <p className="mt-1 text-sm text-muted">{d}</p>
                </Card>
              ))}
            </div>
            <p>
              The model with the best test score is selected: lowest RMSE for regression, highest ROC-AUC for
              classification. XGBoost is not chosen automatically. For VALORANT, plain Linear Regression scored best,
              so it is the model in use.
            </p>
          </Section>

          <Section id="evaluation" title="Training & evaluation">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <b className="text-ink">Group-based 80/20 split.</b> A player (CS:GO, VALORANT) or a match (PUBG,
                Dota 2) never appears in both the training and test sets. A random row split would let the model
                “recognise” players or matches and give over-optimistic scores.
              </li>
              <li><b className="text-ink">Test data is never used for training</b> or for choosing settings. Training is capped at 300,000 rows per game to keep it laptop-friendly.</li>
              <li><b className="text-ink">3-fold GroupKFold cross-validation</b> of the selected algorithm checks that the score is stable across folds.</li>
              <li><b className="text-ink">Overfitting check:</b> train and test scores are reported side by side.</li>
              <li><b className="text-ink">Regression metrics:</b> R², MAE, MSE, RMSE. <b className="text-ink">Classification metrics:</b> accuracy, precision, recall, F1, ROC-AUC, confusion matrix and calibration.</li>
            </ul>
          </Section>

          <Section id="why-not-mmr" title="Why not MMR? Two documented experiments">
            <p>
              None of the datasets contain official matchmaking MMR. Two of them contain something close to it, so
              both were tested before any targets were chosen. These results come from{' '}
              <code className="text-violet-hi">ml/experiments/</code>.
            </p>
            {experiments.loading ? (
              <LoadingBlock rows={2} />
            ) : experiments.error ? (
              <ErrorState error={experiments.error} onRetry={experiments.reload} />
            ) : (
              <div className="space-y-4">
                {experiments.data.dota2_trueskill && <TrueSkillExperiment e={experiments.data.dota2_trueskill} />}
                {experiments.data.valorant_ranked && <RankedExperiment e={experiments.data.valorant_ranked} />}
              </div>
            )}
          </Section>

          <Section id="limitations" title="Limitations">
            <ul className="list-disc space-y-2 pl-5">
              <li>None of the predictions are official MMR or rank. They are statistical estimates of ratings, placement or match outcome.</li>
              <li>CS:GO and VALORANT ratings are formulas computed from the same kinds of stats, so very high R² mostly means the model has learned that formula. CS:GO data comes from the CS:GO era (2015–2020), before CS2.</li>
              <li>CS:GO mixes HLTV Rating 1.0 (before mid-2017) and Rating 2.0. About 31% of player-maps had no matching round count in results.csv and were dropped.</li>
              <li>PUBG placement relies heavily on walk distance, which mostly reflects how long the player survived. It describes the match after it ended; it does not forecast it.</li>
              <li>Dota 2 win probability uses end-of-match stats such as gold and tower damage, which partly reflect winning. It is not a pre-game forecast.</li>
              <li>The pro datasets cover professional players only, so a casual player’s stats may fall outside the training range. The app warns when an input is unusual.</li>
              <li>The CS:GO dataset is licensed CC BY-NC-SA 4.0 (non-commercial), so this project must stay non-commercial.</li>
            </ul>
          </Section>

          <Section id="future" title="Future scope">
            <ul className="list-disc space-y-2 pl-5">
              <li>Integration with official game APIs (Riot, Steam/OpenDota, PUBG API) where their terms allow, to import stats automatically.</li>
              <li>Support for more games, and CS2-era training data.</li>
              <li>Player history and rating trends across many matches.</li>
              <li>Team-level performance analytics.</li>
              <li>Anti-smurfing research: flag accounts whose performance is far above their rank. This would need real ranked labels.</li>
              <li>Hyper-parameter tuning, uncertainty intervals and monitoring for data drift.</li>
              <li>Cloud deployment with user accounts.</li>
            </ul>
            <p className="text-sm text-muted">None of these are implemented yet.</p>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h2>
      <div className="mt-4 space-y-4 leading-relaxed text-ink-2">{children}</div>
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-bg-2 px-2.5 py-2">
      <dt className="text-[11px] font-semibold text-muted">{label}</dt>
      <dd className="num font-semibold text-ink">{value}</dd>
    </div>
  )
}

function Chips({ items, tone = 'neutral' }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map((i) => (
        <Badge key={i} tone={tone}>
          {i}
        </Badge>
      ))}
    </div>
  )
}

function TrueSkillExperiment({ e }) {
  return (
    <Card>
      <CardHeader
        eyebrow="Experiment 1 · Dota 2"
        title="Can gameplay stats predict TrueSkill (μ)?"
        action={<FlaskConical className="size-5 text-faint" aria-hidden />}
      />
      <CardBody>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr className="border-b border-line-soft">
                <th scope="col" className="py-2 text-left font-semibold">Min. games / player</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">Players</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">Linear R²</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">XGBoost R²</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">XGBoost MAE</th>
                <th scope="col" className="py-2 text-right font-semibold">MAE of guessing mean</th>
              </tr>
            </thead>
            <tbody>
              {e.results.map((r) => (
                <tr key={r.min_sample_games} className="border-b border-line-soft last:border-0">
                  <td className="py-2 text-ink-2">≥ {r.min_sample_games}</td>
                  <td className="num px-2 text-right text-ink-2">{fmtInt(r.players)}</td>
                  <td className="num px-2 text-right text-ink">{fmt(r.models['Linear Regression'].r2, 3)}</td>
                  <td className="num px-2 text-right text-ink">{fmt(r.models.XGBoost.r2, 3)}</td>
                  <td className="num px-2 text-right text-ink-2">{fmt(r.models.XGBoost.mae, 2)}</td>
                  <td className="num py-2 text-right text-ink-2">{fmt(r.baseline_mae_predict_mean, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink-2">{e.conclusion}</p>
      </CardBody>
    </Card>
  )
}

function RankedExperiment({ e }) {
  return (
    <Card>
      <CardHeader
        eyebrow="Experiment 2 · VALORANT ranked ladder"
        title="Can aggregated ranked stats predict rank tier?"
        action={<FlaskConical className="size-5 text-faint" aria-hidden />}
      />
      <CardBody>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(e.results).map(([name, r]) => (
            <div key={name} className="hover-pop spotlight rounded-xl border border-line-soft bg-bg-2 p-4">
              <p className="text-sm font-semibold text-ink">{name}</p>
              <p className="num mt-2 text-2xl font-semibold text-ink">{fmtPct(r.accuracy)}</p>
              <p className="text-xs text-muted">accuracy · macro-F1 {fmt(r.macro_f1, 2)}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink-2">{e.conclusion}</p>
      </CardBody>
    </Card>
  )
}
