import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { CompanyModel } from '../models/Company.model';
import { InviteModel } from '../models/Invite.model';
import { UserModel } from '../models/User.model';
import { CreateCompanyRequest, InviteRequest, Company } from '../types/company.types';
import { getDatabase } from '../config/database';
import { UserRole } from '../types/user.types';

const router = Router();

// Helper functions for lazy initialization
function getCompanyModel(): CompanyModel {
  return new CompanyModel();
}

function getInviteModel(): InviteModel {
  return new InviteModel();
}

function getUserModel(): UserModel {
  return new UserModel();
}

// All company routes require authentication
router.use(authenticate);

// Create company
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

    const data: CreateCompanyRequest = {
      name: req.body.name,
      description: req.body.description,
    };

    if (!data.name || data.name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Company name is required',
        code: 'MISSING_NAME',
      });
      return;
    }

    const companyModel = getCompanyModel();
    const userModel = getUserModel();

    // Get current user to add as company member
    const user = await userModel.findByUid(req.user.uid);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Create company
    const company = await companyModel.createCompany(data, req.user.uid);

    // Add creator as Creator member to the company
    const companyMember = {
      uid: user.uid,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'Creator' as const,
      joinedAt: Date.now(),
    };

    await companyModel.addMember(company.companyId, companyMember);

    // Add company membership to user
    await userModel.addCompanyMembership(req.user.uid, company.companyId, 'Creator');

    // Update user role to Creator
    await userModel.updateRole(req.user.uid, 'Creator');

    // Get updated company with members
    const updatedCompany = await companyModel.findByCompanyId(company.companyId);

    res.status(201).json({
      success: true,
      message: 'Company created successfully. Your role has been updated to Creator.',
      data: {
        companyId: company.companyId,
        name: company.name,
        description: company.description,
        created: company.created,
        createdBy: company.createdBy,
        members: updatedCompany?.members || [],
      },
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create company',
      code: 'CREATE_COMPANY_FAILED',
    });
  }
});

// Get user's companies
router.get('/my-companies', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const companyModel = getCompanyModel();
    
    // Get companies where user is creator
    const createdCompanies = await companyModel.findByCreator(req.user.uid);
    
    // Get companies where user is a member
    const memberCompanies = await companyModel.findByMember(req.user.uid);

    // Combine and deduplicate
    const allCompanyIds = new Set([
      ...createdCompanies.map(c => c.companyId),
      ...memberCompanies.map(c => c.companyId)
    ]);

    const db = getDatabase();
    const companiesCollection = db.collection<Company>('companies');
    
    const companies = await companiesCollection
      .find({ 
        companyId: { $in: Array.from(allCompanyIds) },
        removed: false 
      })
      .toArray();

    res.status(200).json({
      success: true,
      data: {
        companies: companies.map(company => ({
          companyId: company.companyId,
          name: company.name,
          description: company.description,
          created: company.created,
          createdBy: company.createdBy,
          members: company.members || [],
        })),
      },
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get companies',
      code: 'GET_COMPANIES_FAILED',
    });
  }
});

// Invite user to company
router.post('/invite', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const { email, companyId }: InviteRequest = req.body;

    if (!email || !email.trim()) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
        code: 'MISSING_EMAIL',
      });
      return;
    }

    if (!companyId || !companyId.trim()) {
      res.status(400).json({
        success: false,
        error: 'Company ID is required',
        code: 'MISSING_COMPANY_ID',
      });
      return;
    }

    const companyModel = getCompanyModel();
    const inviteModel = getInviteModel();
    const userModel = getUserModel();

    // Verify company exists and user has permission (must be Creator or Admin)
    const company = await companyModel.findByCompanyId(companyId);
    if (!company) {
      res.status(404).json({
        success: false,
        error: 'Company not found',
        code: 'COMPANY_NOT_FOUND',
      });
      return;
    }

    // Check if user is Creator or Admin of the company
    const userMember = company.members?.find(m => m.uid === req.user.uid);
    if (!userMember || (userMember.role !== 'Creator' && userMember.role !== 'Admin')) {
      res.status(403).json({
        success: false,
        error: 'Only Creators and Admins can invite users',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await userModel.findByEmail(email);
    
    // Check if user is already a member
    if (existingUser) {
      const isMember = company.members?.some(m => m.uid === existingUser.uid);
      if (isMember) {
        res.status(400).json({
          success: false,
          error: 'User is already a member of this company',
          code: 'ALREADY_MEMBER',
        });
        return;
      }
    }

    // Check for existing pending invite
    const existingInvites = await inviteModel.findPendingByEmail(email);
    const existingInvite = existingInvites.find(inv => inv.companyId === companyId);
    
    if (existingInvite) {
      res.status(400).json({
        success: false,
        error: 'An invite has already been sent to this email',
        code: 'INVITE_EXISTS',
      });
      return;
    }

    // Create invite
    const invite = await inviteModel.createInvite(companyId, email, req.user.uid);

    res.status(201).json({
      success: true,
      message: 'Invite sent successfully',
      data: {
        inviteId: invite.inviteId,
        email: invite.email,
        companyId: invite.companyId,
        status: invite.status,
      },
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send invite',
      code: 'INVITE_FAILED',
    });
  }
});

// Accept invite
router.post('/invite/:inviteId/accept', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const { inviteId } = req.params;
    const inviteModel = getInviteModel();
    const companyModel = getCompanyModel();
    const userModel = getUserModel();

    // Get invite
    const invite = await inviteModel.findByInviteId(inviteId);
    if (!invite) {
      res.status(404).json({
        success: false,
        error: 'Invite not found',
        code: 'INVITE_NOT_FOUND',
      });
      return;
    }

    // Verify invite is for current user's email
    if (invite.email.toLowerCase() !== req.user.email.toLowerCase()) {
      res.status(403).json({
        success: false,
        error: 'This invite is not for your email',
        code: 'INVITE_MISMATCH',
      });
      return;
    }

    // Verify invite is pending
    if (invite.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: `Invite has already been ${invite.status}`,
        code: 'INVITE_NOT_PENDING',
      });
      return;
    }

    // Get company
    const company = await companyModel.findByCompanyId(invite.companyId);
    if (!company) {
      res.status(404).json({
        success: false,
        error: 'Company not found',
        code: 'COMPANY_NOT_FOUND',
      });
      return;
    }

    // Get user
    const user = await userModel.findByUid(req.user.uid);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Check if already a member
    const isMember = company.members?.some(m => m.uid === user.uid);
    if (isMember) {
      res.status(400).json({
        success: false,
        error: 'You are already a member of this company',
        code: 'ALREADY_MEMBER',
      });
      return;
    }

    // Add user as Member to company
    const companyMember = {
      uid: user.uid,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'Member' as const,
      joinedAt: Date.now(),
    };

    await companyModel.addMember(invite.companyId, companyMember);
    await userModel.addCompanyMembership(req.user.uid, invite.companyId, 'Member');

    // Mark invite as accepted
    await inviteModel.acceptInvite(inviteId);

    res.status(200).json({
      success: true,
      message: 'Invite accepted successfully',
      data: {
        companyId: invite.companyId,
        companyName: company.name,
      },
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept invite',
      code: 'ACCEPT_INVITE_FAILED',
    });
  }
});

// Get pending invites for current user
router.get('/invites/pending', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const inviteModel = getInviteModel();
    const companyModel = getCompanyModel();

    const invites = await inviteModel.findPendingByEmail(req.user.email);

    // Get company details for each invite
    const invitesWithCompanies = await Promise.all(
      invites.map(async (invite) => {
        const company = await companyModel.findByCompanyId(invite.companyId);
        return {
          inviteId: invite.inviteId,
          companyId: invite.companyId,
          companyName: company?.name || 'Unknown Company',
          invitedBy: invite.invitedBy,
          invitedAt: invite.invitedAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        invites: invitesWithCompanies,
      },
    });
  } catch (error) {
    console.error('Get pending invites error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending invites',
      code: 'GET_INVITES_FAILED',
    });
  }
});

export default router;

