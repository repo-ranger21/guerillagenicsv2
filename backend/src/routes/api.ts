import { Router } from 'express';
import { getTeams, getTeamReport, runIngestion } from '../services/dataIngestion.ts';
import type { Sport } from '../types/guerilla.ts';

const router = Router();

router.get('/futures/:sport', (req, res) => {
  const sport = req.params.sport as Sport;
  const teams = getTeams(sport);
  // Return teams ranked by CFS
  res.json(teams.sort((a, b) => b.cfs - a.cfs));
});

router.get('/team/:sport/:id', (req, res) => {
  const { sport, id } = req.params;
  const report = getTeamReport(sport as Sport, id);
  if (report) {
    res.json(report);
  } else {
    res.status(404).json({ error: 'Team data not found' });
  }
});

router.get('/needle/:sport', (req, res) => {
  const sport = req.params.sport as Sport;
  const teams = getTeams(sport).filter(t => t.tier === 'NEEDLE');
  res.json(teams);
});

router.post('/ingest/:sport', async (req, res) => {
  const sport = req.params.sport as Sport;
  await runIngestion(sport);
  res.json({ status: 'Ingestion triggered and complete' });
});

export default router;
