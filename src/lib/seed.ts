/** Default sample data used when no stored state exists. */

import type { AppData, Roadmap } from './model/types';
import { DEFAULT_WINDOW_DAYS } from './model/types';
import { uid } from './util/id';

/** January 1st of the current year — a sensible default timeline origin. */
function defaultStartDate(): string {
  return `${new Date().getFullYear()}-01-01`;
}

/** A fresh, empty roadmap with sensible default timeline (timeline-config). */
export function newRoadmap(name: string, colorSlot = 0, startDate = defaultStartDate()): Roadmap {
  return {
    id: uid('rm'),
    name,
    colorSlot,
    startDate,
    windowDays: DEFAULT_WINDOW_DAYS,
    baselineDate: null,
    rows: [],
  };
}

/** Sample content so a first-time user sees a populated Gantt. */
export function seedAppData(): AppData {
  const ana = { id: uid('as'), name: 'Ana', colorSlot: 3 };
  const beto = { id: uid('as'), name: 'Beto', colorSlot: 1 };

  const roadmap: Roadmap = {
    id: uid('rm'),
    name: 'Roadmap 1',
    colorSlot: 0,
    startDate: '2026-01-01',
    windowDays: DEFAULT_WINDOW_DAYS,
    baselineDate: null,
    rows: [
      {
        id: uid('ph'),
        name: 'Descubrimiento',
        colorSlot: 0,
        expanded: true,
        assigneeId: null,
        notes: '',
        startDate: null,
        endDate: null,
        children: [
          {
            id: uid('it'),
            label: 'Research inicial',
            colorSlot: 0,
            startDate: '2026-01-05',
            endDate: '2026-01-23',
            assigneeId: ana.id,
            notes: 'Entrevistas y benchmarking.',
            dependsOn: [],
            blockers: [],
            isMilestone: false,
            completedDate: null,
            endAtCompletion: null,
            baselineEnd: null,
          },
          {
            id: uid('it'),
            label: 'Kickoff',
            colorSlot: 4,
            startDate: '2026-01-26',
            endDate: '2026-01-26',
            assigneeId: null,
            notes: '',
            dependsOn: [],
            blockers: [],
            isMilestone: true,
            completedDate: null,
            endAtCompletion: null,
            baselineEnd: null,
          },
        ],
      },
      {
        id: uid('ph'),
        name: 'Construcción',
        colorSlot: 5,
        expanded: true,
        assigneeId: null,
        notes: '',
        startDate: null,
        endDate: null,
        children: [
          {
            id: uid('it'),
            label: 'MVP',
            colorSlot: 5,
            startDate: '2026-02-02',
            endDate: '2026-03-27',
            assigneeId: beto.id,
            notes: '',
            dependsOn: [],
            blockers: [],
            isMilestone: false,
            completedDate: null,
            endAtCompletion: null,
            baselineEnd: null,
          },
        ],
      },
    ],
  };

  return {
    roadmaps: [roadmap],
    assignees: [ana, beto],
    blockers: [],
    activeId: roadmap.id,
  };
}
