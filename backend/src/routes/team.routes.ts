import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { TeamModel } from '../models/Team.model';
import { UserModel } from '../models/User.model';
import { CreateTeamRequest, Team } from '../types/team.types';
import { getDatabase } from '../config/database';

const router = Router();

// Helper function to get TeamModel instance (lazy initialization)
function getTeamModel(): TeamModel {
  return new TeamModel();
}

function getUserModel(): UserModel {
  return new UserModel();
}

// All team routes require authentication
router.use(authenticate);

// Create team
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const data: CreateTeamRequest = {
      name: req.body.name,
      description: req.body.description,
    };

    if (!data.name || data.name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Team name is required',
        code: 'MISSING_NAME',
      });
      return;
    }

    const teamModel = getTeamModel();
    const userModel = getUserModel();

    // Get current user to add as team member
    const user = await userModel.findByUid(req.user.uid);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Create team
    const team = await teamModel.createTeam(data, req.user.uid);

    // Add creator as Admin member to the team
    const teamMember = {
      uid: user.uid,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'Admin' as const,
      joinedAt: Date.now(),
    };

    await teamModel.addMember(team.teamId, teamMember);

    // Add team membership to user
    await userModel.addTeamMembership(req.user.uid, team.teamId, 'Admin');

    // Get updated team with members
    const updatedTeam = await teamModel.findByTeamId(team.teamId);

    // Remove password from response
    const { pw, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: {
        teamId: team.teamId,
        name: team.name,
        description: team.description,
        created: team.created,
        createdBy: team.createdBy,
        members: updatedTeam?.members || [],
      },
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create team',
      code: 'CREATE_TEAM_FAILED',
    });
  }
});

// Get user's teams
router.get('/my-teams', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const userModel = getUserModel();
    const user = await userModel.findByUid(req.user.uid);

    if (!user || !user.teams || user.teams.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          teams: [],
        },
      });
      return;
    }

    const teamModel = getTeamModel();
    const teamIds = user.teams.map(t => t.teamId);
    const db = getDatabase();
    const teamsCollection = db.collection<Team>('teams');
    
    const teams = await teamsCollection
      .find({ 
        teamId: { $in: teamIds },
        removed: false 
      })
      .toArray();

    res.status(200).json({
      success: true,
      data: {
        teams: teams.map(team => ({
          teamId: team.teamId,
          name: team.name,
          description: team.description,
          created: team.created,
          createdBy: team.createdBy,
          members: team.members || [],
        })),
      },
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get teams',
      code: 'GET_TEAMS_FAILED',
    });
  }
});

export default router;

