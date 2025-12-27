import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { ActionModel } from '../models/Action.model';
import { CreateActionRequest, Action } from '../types/action.types';
import { getDatabase } from '../config/database';

const router = Router();

// Helper function for lazy initialization
function getActionModel(): ActionModel {
  return new ActionModel();
}

// All action routes require authentication
router.use(authenticate);

// Save a new action
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const actionModel = getActionModel();
    const action = await actionModel.createAction(req.body as CreateActionRequest);
    
    res.status(201).json({
      success: true,
      data: action,
    });
  } catch (error) {
    console.error('Create action error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create action',
    });
  }
});

// Get all actions (with pagination, filtering, and aggregation)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '50',
      uid,
      companyId,
      type,
      collection,
      removed,
      since,
      fromDate,
      toDate,
      aggregate,
      groupBy,
      sum,
    } = req.query;

    const actionModel = getActionModel();

    // If aggregation is requested, use MongoDB aggregation pipeline
    if (aggregate === 'true') {
      // Validate required parameters for aggregation
      if (!fromDate || !toDate) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: fromDate and toDate are required for aggregation',
        });
        return;
      }

      const fromTimestamp = parseInt(fromDate as string);
      const toTimestamp = parseInt(toDate as string);

      // Validate timestamps
      if (isNaN(fromTimestamp) || isNaN(toTimestamp)) {
        res.status(400).json({
          success: false,
          error: 'Invalid date format. Use Unix timestamps in milliseconds',
        });
        return;
      }

      if (fromTimestamp >= toTimestamp) {
        res.status(400).json({
          success: false,
          error: 'fromDate must be less than toDate',
        });
        return;
      }

      // Default groupBy and sum if not provided (for billing use case)
      const groupByField = (groupBy as string) || 'companyId';
      const sumField = (sum as string) || 'count';

      // Build match stage - companyId is optional
      const matchStage: any = {
        created: {
          $gte: fromTimestamp,
          $lte: toTimestamp,
        },
        removed: { $ne: true }, // Exclude removed actions
      };

      // Add companyId filter only if provided
      if (companyId) {
        matchStage.companyId = companyId;
      }

      // MongoDB Aggregation Pipeline
      const pipeline = [
        // Match stage: Filter by date range (and companyId if provided), exclude removed actions
        { $match: matchStage },
        // Group stage: Group by specified field and sum specified field
        {
          $group: {
            _id: `$${groupByField}`,
            totalSum: { $sum: `$${sumField}` },
            documentCount: { $sum: 1 }, // Count of documents
          },
        },
        // Project stage: Format the output
        {
          $project: {
            _id: 0,
            [groupByField]: '$_id',
            totalSum: 1,
            documentCount: 1,
          },
        },
      ];

      const result = await actionModel.aggregate(pipeline);

      // If companyId was specified, return single result (backward compatible)
      if (companyId) {
        // If no results, return zero
        if (!result || result.length === 0) {
          res.json({
            success: true,
            data: {
              [groupByField]: companyId,
              totalSum: 0,
              documentCount: 0,
              period: {
                fromDate: fromTimestamp,
                toDate: toTimestamp,
              },
            },
          });
          return;
        }

        // Return the aggregated result
        res.json({
          success: true,
          data: {
            ...result[0],
            period: {
              fromDate: fromTimestamp,
              toDate: toTimestamp,
            },
          },
        });
        return;
      } else {
        // If no companyId specified, return all companies grouped
        res.json({
          success: true,
          data: result || [],
          period: {
            fromDate: fromTimestamp,
            toDate: toTimestamp,
          },
        });
        return;
      }
    }

    // Regular query (non-aggregation)
    const query: any = {};
    
    if (uid) query.uid = uid;
    if (companyId) query.companyId = companyId;
    if (type) query.type = type;
    if (collection) query.collection = collection;
    if (removed !== undefined) query.removed = removed === 'true';
    
    // Date range filtering
    if (fromDate && toDate) {
      query.created = {
        $gte: parseInt(fromDate as string),
        $lte: parseInt(toDate as string)
      };
    } else if (fromDate) {
      query.created = { $gte: parseInt(fromDate as string) };
    } else if (toDate) {
      query.created = { $lte: parseInt(toDate as string) };
    } else if (since) {
      // For real-time updates: get actions created after this timestamp
      query.created = { $gt: parseInt(since as string) };
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const { actions, total } = await actionModel.findMany(query, {
      page: pageNum,
      limit: limitNum,
      sort: { created: -1 }
    });

    // Actions already have _id converted to string in the model
    res.json({
      success: true,
      data: actions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get actions error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get actions',
    });
  }
});

// Get distinct company IDs
router.get('/companies', async (req: Request, res: Response): Promise<void> => {
  try {
    const actionModel = getActionModel();
    const companyIds = await actionModel.distinct('companyId', { removed: { $ne: true } });
    
    res.json({
      success: true,
      data: companyIds.sort(), // Sort alphabetically
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get companies',
    });
  }
});

// Get distinct collections
router.get('/collections', async (req: Request, res: Response): Promise<void> => {
  try {
    const actionModel = getActionModel();
    const collections = await actionModel.distinct('collection', { removed: { $ne: true } });
    
    res.json({
      success: true,
      data: collections.sort(), // Sort alphabetically
    });
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get collections',
    });
  }
});

// Get action by ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const actionModel = getActionModel();
    const action = await actionModel.findById(id);
    
    if (!action) {
      res.status(404).json({
        success: false,
        error: 'Action not found',
      });
      return;
    }
    
    // Action already has _id converted to string in the model
    res.json({
      success: true,
      data: action,
    });
  } catch (error) {
    console.error('Get action error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get action',
    });
  }
});

// Update action
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const actionModel = getActionModel();
    const updated = await actionModel.updateAction(id, req.body);
    
    if (!updated) {
      res.status(404).json({
        success: false,
        error: 'Action not found',
      });
      return;
    }
    
    // Get updated action (already has _id as string)
    const action = await actionModel.findById(id);
    if (!action) {
      res.status(404).json({
        success: false,
        error: 'Action not found after update',
      });
      return;
    }
    
    res.json({
      success: true,
      data: action,
    });
  } catch (error) {
    console.error('Update action error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update action',
    });
  }
});

// Delete all actions (hard delete - removes from database)
router.delete('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const actionModel = getActionModel();
    const deletedCount = await actionModel.deleteAll();
    
    res.json({
      success: true,
      message: `Deleted ${deletedCount} actions`,
      deletedCount,
    });
  } catch (error) {
    console.error('Delete all actions error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete actions',
    });
  }
});

// Delete action (hard delete - remove from database)
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const actionModel = getActionModel();
    const deleted = await actionModel.deleteAction(id);
    
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Action not found',
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Action deleted permanently',
    });
  } catch (error) {
    console.error('Delete action error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete action',
    });
  }
});

export default router;

