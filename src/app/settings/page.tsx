import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveCoachingSettings, saveSettings } from "@/app/actions";
import {
  MODEL_IDS,
  STUCK_HOURS_DEFAULT,
  STUCK_HOURS_MAX,
  STUCK_HOURS_MIN,
  maskedKey,
  readSettings,
} from "@/lib/env";
import { loadCostStats, type ModelRow, type TopTaskRow } from "@/lib/cost";
import { formatTokens, formatUsd } from "@/lib/pricing";
import { ExportButton } from "@/components/export-button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, cost] = await Promise.all([
    readSettings(),
    loadCostStats(),
  ]);
  const {
    apiKey,
    githubUsername,
    lessonModel,
    gradingModel,
    dailyBriefingEnabled,
    stuckDetectorEnabled,
    stuckHoursThreshold,
    nextActionModel,
  } = settings;

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>

      <CostSection cost={cost} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grader + lesson config</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">
            Writes to <code className="rounded bg-muted px-1 py-0.5">.env.local</code>. Values are
            read at runtime, so changes take effect on the next API call without a restart.
          </p>
          <form action={saveSettings} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="apiKey">Anthropic API key</Label>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                autoComplete="off"
                placeholder={apiKey ? `set · ${maskedKey(apiKey)}` : "sk-ant-…"}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep the current value. Stored in{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">ANTHROPIC_API_KEY</code>.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="githubUsername">GitHub username</Label>
              <Input
                id="githubUsername"
                name="githubUsername"
                type="text"
                autoComplete="off"
                defaultValue={githubUsername}
                maxLength={64}
                required
              />
              <p className="text-xs text-muted-foreground">
                Used for the recent-commits card on the dashboard. Stored in{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">GITHUB_USERNAME</code>.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="lessonModel">Lesson model</Label>
                <select
                  id="lessonModel"
                  name="lessonModel"
                  defaultValue={lessonModel}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="opus">opus · {MODEL_IDS.opus}</option>
                  <option value="sonnet">sonnet · {MODEL_IDS.sonnet}</option>
                  <option value="haiku">haiku · {MODEL_IDS.haiku}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gradingModel">Grading model</Label>
                <select
                  id="gradingModel"
                  name="gradingModel"
                  defaultValue={gradingModel}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="opus">opus · {MODEL_IDS.opus}</option>
                  <option value="sonnet">sonnet · {MODEL_IDS.sonnet}</option>
                  <option value="haiku">haiku · {MODEL_IDS.haiku}</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coaching</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveCoachingSettings} className="space-y-5">
            <ToggleRow
              name="dailyBriefingEnabled"
              defaultChecked={dailyBriefingEnabled}
              label="Enable daily briefing"
              hint="The card at the top of the dashboard. Hidden when off."
            />
            <ToggleRow
              name="stuckDetectorEnabled"
              defaultChecked={stuckDetectorEnabled}
              label="Enable stuck-detector"
              hint="The 'You started this N days ago…' card on task pages."
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="stuckHoursThreshold">
                  Stuck-detector threshold
                </Label>
                <span className="font-mono text-xs text-muted-foreground">
                  {stuckHoursThreshold} h
                </span>
              </div>
              <input
                id="stuckHoursThreshold"
                name="stuckHoursThreshold"
                type="range"
                min={STUCK_HOURS_MIN}
                max={STUCK_HOURS_MAX}
                step={1}
                defaultValue={stuckHoursThreshold || STUCK_HOURS_DEFAULT}
                className="w-full accent-foreground"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{STUCK_HOURS_MIN}h</span>
                <span>{STUCK_HOURS_MAX}h</span>
              </div>
              <p className="text-xs text-muted-foreground">
                How long a task must sit in-progress (and not snoozed) before the card appears.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nextActionModel">Next-action model</Label>
              <select
                id="nextActionModel"
                name="nextActionModel"
                defaultValue={nextActionModel}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="haiku">haiku · {MODEL_IDS.haiku} (default — cheapest)</option>
                <option value="sonnet">sonnet · {MODEL_IDS.sonnet}</option>
                <option value="opus">opus · {MODEL_IDS.opus}</option>
              </select>
              <p className="text-xs text-muted-foreground">
                "What's my next physical action?" button on task pages. Designed to be hit often.
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit">Save coaching</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            One-way JSON export of every row across tasks, progress, submissions, lessons, quiz
            data, notes, and retros. Includes a summary block (passed count, weeks completed,
            tokens, USD estimate, date range) to make it useful for a "how I built this" writeup
            without parsing the whole file.
          </p>
          <ExportButton />
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({
  name,
  defaultChecked,
  label,
  hint,
}: {
  name: string;
  defaultChecked: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-md border bg-background p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
      </div>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 cursor-pointer accent-foreground"
      />
    </label>
  );
}

function CostSection({
  cost,
}: {
  cost: {
    weekTokens: number;
    weekUsd: number;
    allTimeTokens: number;
    allTimeUsd: number;
    tasksWithSpend: number;
    avgPerTaskTokens: number;
    avgPerTaskUsd: number;
    byModel: ModelRow[];
    topTasks: TopTaskRow[];
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Token spend</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="This week"
            tokens={cost.weekTokens}
            usd={cost.weekUsd}
            hint="Last 7 days"
          />
          <Stat label="All-time" tokens={cost.allTimeTokens} usd={cost.allTimeUsd} />
          <Stat
            label="Average per task"
            tokens={cost.avgPerTaskTokens}
            usd={cost.avgPerTaskUsd}
            hint={`${cost.tasksWithSpend} task${cost.tasksWithSpend === 1 ? "" : "s"} with spend`}
          />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            By model
          </h3>
          {cost.byModel.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No API calls yet. Submit a task or open a lesson to start tracking.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Model</th>
                    <th className="px-3 py-2 text-right font-medium">Tokens</th>
                    <th className="px-3 py-2 text-right font-medium">USD (est.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cost.byModel.map((m) => (
                    <tr key={m.model ?? "unknown"}>
                      <td className="px-3 py-2">
                        {m.label}
                        {m.model ? (
                          <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                            {m.model}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {formatTokens(m.tokens)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {formatUsd(m.usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Top 5 most expensive tasks
          </h3>
          {cost.topTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Task</th>
                    <th className="px-3 py-2 text-right font-medium">Tokens</th>
                    <th className="px-3 py-2 text-right font-medium">USD (est.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cost.topTasks.map((t) => (
                    <tr key={t.taskId}>
                      <td className="px-3 py-2">
                        <Link
                          href={`/task/${t.taskId}`}
                          className="text-primary hover:underline"
                        >
                          W{t.week} D{t.day} · {t.title}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {formatTokens(t.tokens)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {formatUsd(t.usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          USD is a rough estimate: tokens × (70% input · 30% output blended rate). Opus $15/$75,
          Sonnet $3/$15, Haiku $0.80/$4 per million tokens. Not accounting-grade.
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  tokens,
  usd,
  hint,
}: {
  label: string;
  tokens: number;
  usd: number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold">{formatTokens(tokens)}</div>
      <div className="text-xs text-muted-foreground">{formatUsd(usd)} est.</div>
      {hint ? <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
