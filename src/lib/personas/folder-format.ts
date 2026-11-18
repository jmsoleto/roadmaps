/**
 * Personas Hub as files in a folder (personas-hub, D6).
 *
 * ```
 * personas/
 * ├─ tech-lead-hub.json   the marker: { "app": "personas", "format": 1 }
 * ├─ catalogo.json        { roles, technologies, locations (with their holidays) }
 * ├─ order.json           { "teams": ["team-…", …] }
 * ├─ team-….json          { id, name, description, active, people, absences }
 * └─ sprint-….json        one per sprint
 * ```
 *
 * People go inside their team **without `teamId`**, which the file says, as
 * links go inside their area. Their absences go in the same file: recording
 * one touches only that team's file. Each sprint is its own file, so changing a
 * reserve touches one, and the closed sprints of the next change are never
 * written again. Sprints have no order file: they are sorted by date on read.
 */

import {
  attempt,
  canonicalizer,
  inOrder,
  isObject,
  json,
  layout,
  units,
  Unreadable,
} from '../folder/canonical';
import type { FileFormat, FileMap } from '../folder/file-sync';
import { MARKER_FILE, markerText } from '../folder/marker';
import type { Absence, Person, PersonasData, Sprint, Team } from './model';
import { normalize } from './normalize';

export const APP_ID = 'personas';
export const FORMAT = 1;
export const CATALOG_FILE = 'catalogo.json';
export const ORDER_FILE = 'order.json';

type Kind =
  | 'catalog'
  | 'role'
  | 'technology'
  | 'location'
  | 'holiday'
  | 'team'
  | 'person'
  | 'absence'
  | 'sprint'
  | 'member';

const { text } = canonicalizer<Kind>({
  order: {
    catalog: ['roles', 'technologies', 'locations'],
    role: ['id', 'name', 'active'],
    technology: ['id', 'name', 'parentId', 'active'],
    location: ['id', 'name', 'active', 'holidays'],
    holiday: ['date', 'name'],
    team: [
      'id',
      'name',
      'description',
      'active',
      'criticalRoleIds',
      'dropThreshold',
      'people',
      'absences',
    ],
    person: [
      'id',
      'name',
      'roleId',
      'technologyId',
      'locationId',
      'hoursPerDay',
      'dedication',
      'active',
    ],
    absence: ['id', 'personId', 'type', 'startDate', 'endDate', 'hoursPerDay', 'comment'],
    sprint: [
      'id',
      'teamId',
      'name',
      'startDate',
      'endDate',
      'status',
      'incidentPercentage',
      'members',
      'adjustment',
      'results',
      'plan',
      'real',
    ],
    member: ['personId', 'dedication'],
  },
  holds: {
    catalog: { roles: 'role', technologies: 'technology', locations: 'location' },
    location: { holidays: 'holiday' },
    team: { people: 'person', absences: 'absence' },
    sprint: { members: 'member' },
  },
});

/**
 * The file a unit lives in: its id as it is when the app made it
 * (`team-<digits>-<hex>`), and anything else spelled in hex behind `<prefix>x`,
 * which no id the app makes can start with.
 */
export function fileFor(prefix: 'team-' | 'sprint-', id: string): string {
  if (id.startsWith(prefix) && /^[A-Za-z0-9_-]+$/.test(id) && !id.startsWith(`${prefix}x`)) {
    return `${id}.json`;
  }
  const hex = [...new TextEncoder().encode(id)].map((b) => b.toString(16).padStart(2, '0'));
  return `${prefix}x${hex.join('')}.json`;
}

const isUnit = (prefix: string) => (name: string) =>
  name.startsWith(prefix) && /^[A-Za-z0-9_-]+\.json$/.test(name);
export const isTeamFile = isUnit('team-');
export const isSprintFile = isUnit('sprint-');

type TeamFile = Team & { people: Omit<Person, 'teamId'>[]; absences: Absence[] };

function withoutTeam(p: Person): Omit<Person, 'teamId'> {
  const out: Partial<Person> = { ...p };
  delete out.teamId;
  return out as Omit<Person, 'teamId'>;
}

export const PERSONAS_FORMAT: FileFormat<PersonasData> = {
  owns: (name) =>
    name === MARKER_FILE ||
    name === CATALOG_FILE ||
    name === ORDER_FILE ||
    isTeamFile(name) ||
    isSprintFile(name),
  serialize(data: PersonasData): FileMap {
    const files: FileMap = new Map();
    files.set(MARKER_FILE, markerText(APP_ID, FORMAT));
    files.set(
      CATALOG_FILE,
      text(
        { roles: data.roles, technologies: data.technologies, locations: data.locations },
        'catalog',
      ),
    );
    files.set(ORDER_FILE, layout({ teams: data.teams.map((t) => t.id) }));
    for (const team of data.teams) {
      const people = data.people.filter((p) => p.teamId === team.id);
      const ids = new Set(people.map((p) => p.id));
      const file: TeamFile = {
        ...team,
        // The team of a person is its file's; never written inside it. Removed
        // here and not as a view key: a sprint's `teamId` must stay.
        people: people.map(withoutTeam),
        absences: data.absences.filter((a) => ids.has(a.personId)),
      };
      files.set(fileFor('team-', team.id), text(file, 'team'));
    }
    for (const sprint of data.sprints) {
      files.set(fileFor('sprint-', sprint.id), text(sprint, 'sprint'));
    }
    return files;
  },
  parse: (files) =>
    attempt(() => {
      const catalog = json(files, CATALOG_FILE);
      if (catalog !== undefined && !isObject(catalog)) throw new Unreadable(CATALOG_FILE);
      const order = json(files, ORDER_FILE);
      if (order !== undefined && (!isObject(order) || !Array.isArray(order.teams))) {
        throw new Unreadable(ORDER_FILE);
      }
      const teamsById = units<TeamFile>(
        files,
        isTeamFile,
        (v) =>
          typeof v.name === 'string' &&
          Array.isArray(v.people) &&
          v.people.every((p) => isObject(p) && typeof p.id === 'string') &&
          (v.absences === undefined || Array.isArray(v.absences)),
      );
      const sprintsById = units<Sprint>(
        files,
        isSprintFile,
        (v) => typeof v.teamId === 'string' && Array.isArray(v.members),
      );
      const teams: Team[] = [];
      const people: Person[] = [];
      const absences: Absence[] = [];
      const seen = new Set<string>();
      for (const file of inOrder(order ? (order.teams as unknown[]) : [], teamsById)) {
        const { people: own, absences: theirs, ...team } = file;
        teams.push(team);
        for (const p of own) {
          // The same person in two teams: one would vanish on the next save.
          if (seen.has(p.id)) throw new Unreadable(fileFor('team-', file.id));
          seen.add(p.id);
          people.push({ ...p, teamId: file.id } as Person);
        }
        absences.push(...(theirs ?? []));
      }
      const sprints = [...sprintsById.values()].sort((a, b) =>
        a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0,
      );
      const cat = (catalog ?? {}) as Record<string, unknown>;
      return normalize({
        roles: cat.roles,
        // Absent catalogue: the PRD's tree, as in a new browser.
        technologies: catalog === undefined ? undefined : cat.technologies,
        locations: cat.locations,
        teams,
        people,
        absences,
        sprints,
      });
    }),
  isEmpty: (d) =>
    d.teams.length === 0 &&
    d.people.length === 0 &&
    d.sprints.length === 0 &&
    d.roles.length === 0 &&
    d.locations.length === 0,
  deletable: (name) => isTeamFile(name) || isSprintFile(name),
};
