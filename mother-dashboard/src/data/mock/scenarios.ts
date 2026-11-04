/**
 * DEMO DATA. Illustrative records for exploring the dashboard. They describe no real person.
 * Every record carries `source: 'demo'`, and the UI labels anything derived from them.
 * Dates are generated relative to today so the stages stay meaningful.
 * Phone numbers use the unassigned 000 range so they cannot reach anyone.
 */
import type { Appointment, BabyProfile, EmergencyPlan, MotherProfile } from '@/types';
import { addDays, isoDate } from '@/utils/dates';

export type Scenario = 'pregnant' | 'birth-soon' | 'postpartum';

export const scenarioLabels: Record<Scenario, { title: string; detail: string }> = {
  pregnant: { title: 'Pregnant, 26 weeks', detail: 'Second trimester with antenatal visits booked.' },
  'birth-soon': { title: 'Pregnant, 38 weeks', detail: 'Getting ready for birth, birth plan in progress.' },
  postpartum: { title: 'After birth, baby 5 weeks', detail: 'Postnatal care, feeding and vaccinations.' },
};

const FACILITY = 'Sample Health Centre (demo)';

export interface ScenarioRecords {
  mother: MotherProfile;
  baby: BabyProfile | null;
  appointments: Appointment[];
  plan: EmergencyPlan;
}

export function buildScenario(s: Scenario, today = new Date()): ScenarioRecords {
  const d = (n: number) => isoDate(addDays(today, n));
  const motherId = 'demo-mother';
  const plan: EmergencyPlan = {
    source: 'demo',
    contacts: [
      { id: 'demo-c1', name: 'Baraka (demo)', relation: 'Partner', phone: '+255 000 000 101' },
      { id: 'demo-c2', name: 'Neema (demo)', relation: 'Community health worker', phone: '+255 000 000 102' },
    ],
    facility: { name: FACILITY, phone: '+255 000 000 100', address: 'Sample Road, Sample Ward' },
    transport: { method: 'Bajaji from the village stage', contactName: 'Juma (demo driver)', contactPhone: '+255 000 000 103', moneySaved: s !== 'pregnant' },
  };

  if (s === 'postpartum') {
    const birth = d(-35);
    return {
      plan,
      mother: {
        id: motherId,
        name: 'Amani',
        deliveryDate: birth,
        prescribedSupplements: ['Iron and folic acid'],
        source: 'demo',
        records: [
          { id: 'r1', date: d(-25), kind: 'blood-pressure', label: 'Blood pressure', value: '118/76 mmHg', recordedBy: 'clinic', source: 'demo' },
          { id: 'r2', date: d(-25), kind: 'note', label: 'Postnatal visit', value: 'Day 7–14 check completed', recordedBy: 'clinic', source: 'demo' },
          { id: 'r3', date: d(-34), kind: 'note', label: 'Postnatal visit', value: 'Within 24 hours of birth', recordedBy: 'clinic', source: 'demo' },
        ],
      },
      baby: {
        id: 'demo-baby',
        motherId,
        name: 'Zuri',
        birthDate: birth,
        birthWeightKg: 3.1,
        birthFacility: FACILITY,
        vaccinesGiven: [0],
        source: 'demo',
        growth: [
          { id: 'g1', date: birth, weightKg: 3.1, lengthCm: 49, source: 'demo' },
          { id: 'g2', date: d(-32), weightKg: 3.0, source: 'demo' },
          { id: 'g3', date: d(-25), weightKg: 3.2, source: 'demo' },
          { id: 'g4', date: d(-14), weightKg: 3.7, lengthCm: 52, source: 'demo' },
          { id: 'g5', date: d(-3), weightKg: 4.2, lengthCm: 54, source: 'demo' },
        ],
      },
      appointments: [
        { id: 'a1', type: 'vaccination', title: '6-week vaccines', date: d(7), time: '09:00', facility: FACILITY, status: 'confirmed', forWhom: 'baby', source: 'demo' },
        { id: 'a2', type: 'postnatal', title: 'Postnatal visit, week 6', date: d(7), time: '09:30', facility: FACILITY, status: 'scheduled', forWhom: 'mother', source: 'demo' },
        { id: 'a3', type: 'postnatal', title: 'Postnatal visit, day 7–14', date: d(-25), time: '10:00', facility: FACILITY, status: 'completed', forWhom: 'mother', source: 'demo' },
      ],
    };
  }

  const weeks = s === 'birth-soon' ? 38 : 26;
  const lmp = d(-(weeks * 7 + 2));
  return {
    plan,
    baby: null,
    mother: {
      id: motherId,
      name: 'Amani',
      lmp,
      prescribedSupplements: ['Iron and folic acid'],
      source: 'demo',
      records: [
        { id: 'r1', date: d(-12), kind: 'blood-pressure', label: 'Blood pressure', value: '114/72 mmHg', recordedBy: 'clinic', source: 'demo' },
        { id: 'r2', date: d(-12), kind: 'weight', label: 'Weight', value: '64 kg', recordedBy: 'clinic', source: 'demo' },
        { id: 'r3', date: d(-40), kind: 'note', label: 'Antenatal contact', value: 'Second contact completed', recordedBy: 'clinic', source: 'demo' },
      ],
    },
    appointments:
      s === 'birth-soon'
        ? [
            { id: 'a1', type: 'antenatal', title: 'Seventh antenatal contact', date: d(1), time: '08:30', facility: FACILITY, status: 'confirmed', forWhom: 'mother', source: 'demo' },
            { id: 'a2', type: 'antenatal', title: 'Sixth antenatal contact', date: d(-13), time: '09:00', facility: FACILITY, status: 'completed', forWhom: 'mother', source: 'demo' },
          ]
        : [
            { id: 'a1', type: 'antenatal', title: 'Third antenatal contact', date: d(3), time: '09:00', facility: FACILITY, status: 'confirmed', forWhom: 'mother', source: 'demo' },
            { id: 'a2', type: 'antenatal', title: 'Fourth antenatal contact', date: d(31), time: '09:00', facility: FACILITY, status: 'scheduled', forWhom: 'mother', source: 'demo' },
            { id: 'a3', type: 'antenatal', title: 'Second antenatal contact', date: d(-40), time: '10:30', facility: FACILITY, status: 'completed', forWhom: 'mother', source: 'demo' },
          ],
  };
}
