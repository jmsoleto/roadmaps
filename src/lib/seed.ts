/** Default sample data used when no stored state exists. */

import type { AppData, Roadmap } from './model/types';
import { DEFAULT_WINDOW_DAYS } from './model/types';
import { PALETTE } from './config';
import { uid } from './util/id';

/** January 1st of the current year — a sensible default timeline origin. */
function defaultStartDate(): string {
  return `${new Date().getFullYear()}-01-01`;
}

/** A fresh, empty roadmap with sensible default timeline (timeline-config). */
export function newRoadmap(name: string, startDate = defaultStartDate()): Roadmap {
  return {
    id: uid('rm'),
    name,
    startDate,
    windowDays: DEFAULT_WINDOW_DAYS,
    rows: [],
  };
}

/** Sample content so a first-time user sees a populated Gantt. */
export function seedAppData(): AppData {
  const ana = { id: uid('as'), name: 'Ana', color: PALETTE[3] };
  const beto = { id: uid('as'), name: 'Beto', color: PALETTE[1] };

  const roadmap: Roadmap = {
    id: uid('rm'),
    name: 'Roadmap 1',
    startDate: '2026-01-01',
    windowDays: DEFAULT_WINDOW_DAYS,
    rows: [
      {
        id: uid('ph'),
        name: 'Descubrimiento',
        color: PALETTE[0],
        expanded: true,
        assigneeId: null,
        notes: '',
        startDate: null,
        endDate: null,
        children: [
          {
            id: uid('it'),
            label: 'Research inicial',
            color: PALETTE[0],
            startDate: '2026-01-05',
            endDate: '2026-01-23',
            assigneeId: ana.id,
            notes: 'Entrevistas y benchmarking.',
            dependsOn: [],
            isMilestone: false,
          },
          {
            id: uid('it'),
            label: 'Kickoff',
            color: PALETTE[4],
            startDate: '2026-01-26',
            endDate: '2026-01-26',
            assigneeId: null,
            notes: '',
            dependsOn: [],
            isMilestone: true,
          },
        ],
      },
      {
        id: uid('ph'),
        name: 'Construcción',
        color: PALETTE[5],
        expanded: true,
        assigneeId: null,
        notes: '',
        startDate: null,
        endDate: null,
        children: [
          {
            id: uid('it'),
            label: 'MVP',
            color: PALETTE[5],
            startDate: '2026-02-02',
            endDate: '2026-03-27',
            assigneeId: beto.id,
            notes: '',
            dependsOn: [],
            isMilestone: false,
          },
        ],
      },
    ],
  };

  return {
    roadmaps: [roadmap],
    assignees: [ana, beto],
    activeId: roadmap.id,
  };
}
