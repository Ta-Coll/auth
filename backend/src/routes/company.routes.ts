import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { CompanyModel } from '../models/Company.model';
import { InviteModel } from '../models/Invite.model';
import { UserModel } from '../models/User.model';
import { CreateCompanyRequest, InviteRequest, Company, CompanyRole } from '../types/company.types';
import { Creds } from '../types/creds.types';
import { getDatabase } from '../config/database';

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

    // Add creator as Admin (team admin) to the company
    const companyMember = {
      uid: user.uid,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'admin' as const, // Team Admin role
      joinedAt: Date.now(),
    };

    await companyModel.addMember(company.companyId, companyMember);

    // Create Creds document for this user-company relationship
    const { CredsModel } = await import('../models/Creds.model');
    const credsModel = new CredsModel(user.uid);
    await credsModel.createCreds(user.uid, company.companyId, {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'admin', // Team Admin role
      invitedBy: user.uid, // Self-created
      status: 'accepted',
    });

    // Update user's role in users collection to 'admin' when they create a company
    // This updates the role to reflect their team admin status
    await userModel.updateRole(user.uid, 'admin');

    // Get updated company with members
    const updatedCompany = await companyModel.findByCompanyId(company.companyId);

    res.status(201).json({
      success: true,
      message: 'Company created successfully. You are now the team Admin.',
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

    const { email, companyId, role }: InviteRequest = req.body;

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

    // Check if user is Admin (team admin) of the company
    const userMember = company.members?.find(m => m.uid === req.user.uid);
    if (!userMember || userMember.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Only team Admins can invite users',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    // Get role from request (default to 'member')
    // Only 'member' or 'creator' can be invited, 'admin' cannot be assigned via invite
    const inviteRole = role || 'member';
    
    // Validate role - only member or creator can be invited
    const validRoles: Array<'member' | 'creator'> = ['member', 'creator'];
    if (!validRoles.includes(inviteRole)) {
      res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}. Admin role cannot be assigned via invite.`,
        code: 'INVALID_ROLE',
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

    // Create invite with role - save to invites collection
    const invite = await inviteModel.createInvite(companyId, email, req.user.uid, inviteRole as any);

    // If user doesn't exist, create user in users collection with emailVerified: false
    // User will verify email when they click the invite link
    if (!existingUser) {
      // Generate unique username from email
      const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const uniqueUsername = `${baseUsername}_${Date.now().toString().slice(-6)}`;
      
      // Create user with default password "12345" and emailVerified: false
      // User will set their password when they click the invite link
      await userModel.createUser({
        email: email.toLowerCase().trim(),
        username: uniqueUsername,
        password: '12345', // Default password - user should change via invite link
        firstName: '', // Will be empty, user can update later
        lastName: '', // Will be empty, user can update later
        timeZone: 'America/New_York', // Default timezone
      }, req.user.uid);
      // Note: emailVerified remains false - user will verify via invite link
    }

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

    // Check if user exists (by email from invite)
    let user = await userModel.findByEmail(invite.email);
    
    // If user doesn't exist, create them with default password "12345"
    if (!user) {
      // Generate unique username from email
      const baseUsername = invite.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const uniqueUsername = `${baseUsername}_${Date.now().toString().slice(-6)}`;
      
      // User should have been created when invite was sent
      // If not, create them now (fallback)
      // Note: emailVerified should remain false until user verifies via invite link
      user = await userModel.createUser({
        email: invite.email.toLowerCase().trim(),
        username: uniqueUsername,
        password: '12345', // Default password - user should change via invite link
        firstName: '', // Will be empty, user can update later
        lastName: '', // Will be empty, user can update later
        timeZone: 'America/New_York', // Default timezone
      }, invite.invitedBy);
      // emailVerified remains false - user should verify via invite link
    } else {
      // User exists - verify it's the same user accepting the invite (if logged in)
      if (req.user && user.uid !== req.user.uid) {
        res.status(403).json({
          success: false,
          error: 'This invite is not for your account',
          code: 'INVITE_MISMATCH',
        });
        return;
      }
      // If user exists but not logged in, verify email matches
      if (!req.user && invite.email.toLowerCase() !== user.email.toLowerCase()) {
        res.status(403).json({
          success: false,
          error: 'This invite is not for your email',
          code: 'INVITE_MISMATCH',
        });
        return;
      }
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

    // Get role from invite (default to 'member' if not specified)
    const teamRole = invite.role || 'member';

    // Add user to company with the role from invite
    const companyMember = {
      uid: user.uid,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: teamRole as CompanyRole,
      joinedAt: Date.now(),
    };

    await companyModel.addMember(invite.companyId, companyMember);

    // Create Creds document for this user-company relationship
    // This is where the user is saved to Creds collection after accepting invite
    const { CredsModel } = await import('../models/Creds.model');
    const credsModel = new CredsModel(user.uid);
    await credsModel.createCreds(user.uid, invite.companyId, {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: teamRole as any,
      invitedBy: invite.invitedBy,
      status: 'accepted',
    });

    // Remove invite from invites collection (delete it)
    await inviteModel.deleteInvite(inviteId);

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

// Get all company members with status (Admin only)
router.get('/:companyId/members', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const { companyId } = req.params;
    const companyModel = getCompanyModel();
    const { CredsModel } = await import('../models/Creds.model');

    // Verify company exists
    const company = await companyModel.findByCompanyId(companyId);
    if (!company) {
      res.status(404).json({
        success: false,
        error: 'Company not found',
        code: 'COMPANY_NOT_FOUND',
      });
      return;
    }

    // Check if user is Admin (team admin) of the company
    const userMember = company.members?.find(m => m.uid === req.user.uid);
    if (!userMember || userMember.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Only team Admins can view company members',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    // Get all creds for this company (accepted members)
    const credsCollection = CredsModel.getCredsCollection();
    const allCreds = await credsCollection
      .find({ companyId })
      .toArray();

    // Get pending invites for this company (invited but not accepted yet)
    const inviteModel = getInviteModel();
    const pendingInvites = await inviteModel.findByCompanyId(companyId);

    // Map all Creds documents to members list (accepted members)
    const membersList = allCreds.map(creds => ({
      uid: creds.uid,
      email: creds.email,
      firstName: creds.firstName || '',
      lastName: creds.lastName || '',
      role: creds.role,
      status: creds.status || 'accepted',
      invitedBy: creds.invitedBy,
      startDate: creds.startDate,
      lastLogin: creds.lastLogin,
    }));

    // Add pending invites as "invited" status members
    // These are in invites collection, will be moved to Creds when accepted
    pendingInvites
      .filter(inv => inv.status === 'pending')
      .forEach(invite => {
        // Check if already in members list (shouldn't happen, but safety check)
        const exists = membersList.some(m => m.email === invite.email);
        if (!exists) {
          membersList.push({
            uid: undefined, // No uid yet, user hasn't accepted
            email: invite.email,
            firstName: '',
            lastName: '',
            role: invite.role || 'member',
            status: 'invited',
            invitedBy: invite.invitedBy,
            startDate: invite.invitedAt,
            lastLogin: undefined,
          });
        }
      });

    res.status(200).json({
      success: true,
      data: {
        companyId,
        companyName: company.name,
        members: membersList,
      },
    });
  } catch (error) {
    console.error('Get company members error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get company members',
      code: 'GET_MEMBERS_FAILED',
    });
  }
});

// Manually add user to company (for testing - bypasses invite system)
router.post('/:companyId/members/manual', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const { companyId } = req.params;
    const { email, role, firstName, lastName } = req.body;

    if (!email || !email.trim()) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
        code: 'MISSING_EMAIL',
      });
      return;
    }

    // Validate role - only member or creator can be added manually (admin is set when creating company)
    const validRoles: Array<'member' | 'creator'> = ['member', 'creator'];
    const memberRole = role || 'member';
    if (!validRoles.includes(memberRole)) {
      res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        code: 'INVALID_ROLE',
      });
      return;
    }

    const companyModel = getCompanyModel();
    const userModel = getUserModel();
    const { CredsModel } = await import('../models/Creds.model');

    // Verify company exists
    const company = await companyModel.findByCompanyId(companyId);
    if (!company) {
      res.status(404).json({
        success: false,
        error: 'Company not found',
        code: 'COMPANY_NOT_FOUND',
      });
      return;
    }

    // Check if user is Admin (team admin) of the company
    const userMember = company.members?.find(m => m.uid === req.user.uid);
    if (!userMember || userMember.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Only team Admins can add members',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    // Check if user exists
    const existingUser = await userModel.findByEmail(email);
    
    if (existingUser) {
      // User exists - check if already a member
      const isMember = company.members?.some(m => m.uid === existingUser.uid);
      if (isMember) {
        res.status(400).json({
          success: false,
          error: 'User is already a member of this company',
          code: 'ALREADY_MEMBER',
        });
        return;
      }

      // Add user to company
      const companyMember = {
        uid: existingUser.uid,
        email: existingUser.email,
        username: existingUser.username,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        role: memberRole as CompanyRole,
        joinedAt: Date.now(),
      };

      await companyModel.addMember(companyId, companyMember);

      // Create Creds document
      const credsModel = new CredsModel(existingUser.uid);
      await credsModel.createCreds(existingUser.uid, companyId, {
        email: existingUser.email,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        role: memberRole,
        invitedBy: req.user.uid,
        status: 'accepted',
      });

      res.status(200).json({
        success: true,
        message: 'User added to company successfully',
        data: {
          uid: existingUser.uid,
          email: existingUser.email,
          role: memberRole,
          status: 'accepted',
        },
      });
    } else {
      // User doesn't exist - create user in users collection and Creds with accepted status
      // Set default password as "12345" (user can change it later via password reset)
      const defaultPassword = '12345';
      
      // Generate unique username from email
      const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const uniqueUsername = `${baseUsername}_${Date.now().toString().slice(-6)}`;
      
      // Create user in users collection
      const newUser = await userModel.createUser({
        email: email.toLowerCase().trim(),
        username: uniqueUsername,
        password: defaultPassword,
        firstName: firstName || '',
        lastName: lastName || '',
        timeZone: 'America/New_York', // Default timezone
      }, req.user.uid);

      // Set email as verified since user was added by admin
      await userModel.updateEmailVerified(newUser.uid, true);

      // Add user to company
      const companyMember = {
        uid: newUser.uid,
        email: newUser.email,
        username: newUser.username,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: memberRole as CompanyRole,
        joinedAt: Date.now(),
      };

      await companyModel.addMember(companyId, companyMember);

      // Create Creds document with accepted status
      const credsModel = new CredsModel(newUser.uid);
      await credsModel.createCreds(newUser.uid, companyId, {
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: memberRole,
        invitedBy: req.user.uid,
        status: 'accepted',
      });

      res.status(200).json({
        success: true,
        message: 'User created and added to company successfully',
        data: {
          uid: newUser.uid,
          email: newUser.email,
          role: memberRole,
          status: 'accepted',
        },
      });
    }
  } catch (error) {
    console.error('Manual add member error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add member',
      code: 'ADD_MEMBER_FAILED',
    });
  }
});

// Delete member from company (Admin only)
router.post('/:companyId/members/delete', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const { companyId } = req.params;
    const { email, uid } = req.body;

    if (!email || !email.trim()) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
        code: 'MISSING_EMAIL',
      });
      return;
    }

    const companyModel = getCompanyModel();
    const { CredsModel } = await import('../models/Creds.model');
    const inviteModel = getInviteModel();

    // Verify company exists
    const company = await companyModel.findByCompanyId(companyId);
    if (!company) {
      res.status(404).json({
        success: false,
        error: 'Company not found',
        code: 'COMPANY_NOT_FOUND',
      });
      return;
    }

    // Check if user is Admin (team admin) of the company
    const userMember = company.members?.find(m => m.uid === req.user.uid);
    if (!userMember || userMember.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Only team Admins can delete members',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    // Prevent admin from deleting themselves
    if (uid && uid === req.user.uid) {
      res.status(400).json({
        success: false,
        error: 'You cannot delete yourself from the company',
        code: 'CANNOT_DELETE_SELF',
      });
      return;
    }

    // Delete Creds document (if exists)
    const credsCollection = CredsModel.getCredsCollection();
    if (uid) {
      // Delete by uid and companyId
      await credsCollection.deleteMany({ uid, companyId });
    } else {
      // Delete by email and companyId (for invited users without uid)
      await credsCollection.deleteMany({ email: email.toLowerCase().trim(), companyId });
    }

    // Remove from company members array
    if (uid) {
      await companyModel.removeMember(companyId, uid);
    } else {
      // For invited users without uid, remove by email match
      const db = getDatabase();
      const companiesCollection = db.collection('companies');
      await companiesCollection.updateOne(
        { companyId },
        { $pull: { members: { email: email.toLowerCase().trim() } } } as any
      );
    }

    // Delete any pending invites for this email/company
    const pendingInvites = await inviteModel.findByCompanyId(companyId);
    const invitesToDelete = pendingInvites.filter(
      inv => inv.email.toLowerCase().trim() === email.toLowerCase().trim()
    );
    for (const invite of invitesToDelete) {
      await inviteModel.deleteInvite(invite.inviteId);
    }

    // Delete user from users collection if they were only invited (not a regular registered user)
    // Check if user exists and if they were only created via invite (check if they have other companies)
    if (uid) {
      const userModel = getUserModel();
      const user = await userModel.findByUid(uid);
      
      if (user) {
        // Check if user has other company memberships
        const otherCreds = await credsCollection.find({ 
          uid, 
          companyId: { $ne: companyId } 
        }).toArray();
        
        // If user has no other company memberships and email is not verified,
        // they were likely only invited, so delete from users collection
        if (otherCreds.length === 0 && !user.emailVerified) {
          const db = getDatabase();
          const usersCollection = db.collection('users');
          await usersCollection.deleteOne({ uid });
        }
      }
    } else {
      // For invited users without uid, find by email and delete if not verified
      const userModel = getUserModel();
      const user = await userModel.findByEmail(email);
      
      if (user && !user.emailVerified) {
        // Check if user has other company memberships
        const otherCreds = await credsCollection.find({ 
          uid: user.uid, 
          companyId: { $ne: companyId } 
        }).toArray();
        
        // If no other memberships, delete from users collection
        if (otherCreds.length === 0) {
          const db = getDatabase();
          const usersCollection = db.collection('users');
          await usersCollection.deleteOne({ uid: user.uid });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Member deleted successfully',
      data: { email, uid },
    });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete member',
      code: 'DELETE_MEMBER_FAILED',
    });
  }
});

// Update member role in company (Admin only)
router.patch('/:companyId/members/:uid/role', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const { companyId, uid } = req.params;
    const { role } = req.body;

    if (!role) {
      res.status(400).json({
        success: false,
        error: 'Role is required',
        code: 'MISSING_ROLE',
      });
      return;
    }

    // Validate role - only team roles allowed
    const validRoles: Array<'member' | 'creator' | 'admin'> = ['member', 'creator', 'admin'];
    const normalizedRole = role.toLowerCase();
    if (!validRoles.includes(normalizedRole as any)) {
      res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        code: 'INVALID_ROLE',
      });
      return;
    }

    const companyModel = getCompanyModel();
    const { CredsModel } = await import('../models/Creds.model');

    // Verify company exists
    const company = await companyModel.findByCompanyId(companyId);
    if (!company) {
      res.status(404).json({
        success: false,
        error: 'Company not found',
        code: 'COMPANY_NOT_FOUND',
      });
      return;
    }

    // Check if user is Admin (team admin) of the company
    const userMember = company.members?.find(m => m.uid === req.user.uid);
    if (!userMember || userMember.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Only team Admins can update member roles',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    // Prevent admin from changing their own role (they must remain admin)
    if (uid === req.user.uid && normalizedRole !== 'admin') {
      res.status(400).json({
        success: false,
        error: 'You cannot change your own role from admin',
        code: 'CANNOT_CHANGE_OWN_ROLE',
      });
      return;
    }

    // Check if member exists in company
    const memberToUpdate = company.members?.find(m => m.uid === uid);
    if (!memberToUpdate) {
      res.status(404).json({
        success: false,
        error: 'Member not found in this company',
        code: 'MEMBER_NOT_FOUND',
      });
      return;
    }

    // Update role in company members array
    await companyModel.updateMemberRole(companyId, uid, normalizedRole as CompanyRole);

    // Update role in Creds collection
    const credsCollection = CredsModel.getCredsCollection();
    await credsCollection.updateOne(
      { uid, companyId },
      { $set: { role: normalizedRole } }
    );

    res.status(200).json({
      success: true,
      message: 'Member role updated successfully',
      data: { uid, role: normalizedRole },
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update member role',
      code: 'UPDATE_MEMBER_ROLE_FAILED',
    });
  }
});

// Update invite role (for pending invites - Admin only)
router.patch('/:companyId/invites/:email/role', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const { companyId, email } = req.params;
    const { role } = req.body;

    if (!role) {
      res.status(400).json({
        success: false,
        error: 'Role is required',
        code: 'MISSING_ROLE',
      });
      return;
    }

    // Validate role - only member or creator can be assigned via invite (admin cannot be invited)
    const validRoles: Array<'member' | 'creator'> = ['member', 'creator'];
    const normalizedRole = role.toLowerCase();
    if (!validRoles.includes(normalizedRole as any)) {
      res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}. Admin role cannot be assigned via invite.`,
        code: 'INVALID_ROLE',
      });
      return;
    }

    const companyModel = getCompanyModel();
    const inviteModel = getInviteModel();

    // Verify company exists
    const company = await companyModel.findByCompanyId(companyId);
    if (!company) {
      res.status(404).json({
        success: false,
        error: 'Company not found',
        code: 'COMPANY_NOT_FOUND',
      });
      return;
    }

    // Check if user is Admin (team admin) of the company
    const userMember = company.members?.find(m => m.uid === req.user.uid);
    if (!userMember || userMember.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Only team Admins can update invite roles',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    // Check if invite exists
    const invites = await inviteModel.findByCompanyId(companyId);
    const invite = invites.find(inv => inv.email.toLowerCase() === email.toLowerCase() && inv.status === 'pending');
    
    if (!invite) {
      res.status(404).json({
        success: false,
        error: 'Pending invite not found for this email',
        code: 'INVITE_NOT_FOUND',
      });
      return;
    }

    // Update invite role
    await inviteModel.updateInviteRole(companyId, email, normalizedRole as any);

    res.status(200).json({
      success: true,
      message: 'Invite role updated successfully',
      data: { email, role: normalizedRole },
    });
  } catch (error) {
    console.error('Update invite role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update invite role',
      code: 'UPDATE_INVITE_ROLE_FAILED',
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

