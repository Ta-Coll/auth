import 'dotenv/config';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import serverlessExpress from '@vendia/serverless-express';
import app from './app';
import { connectDatabase } from './config/database';

let serverlessApp: any;
let dbConnected = false;

async function ensureDatabaseConnection(): Promise<void> {
  if (!dbConnected) {
    await connectDatabase();
    dbConnected = true;
  }
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Ensure database is connected
  await ensureDatabaseConnection();

  // Initialize serverless app on first invocation
  if (!serverlessApp) {
    serverlessApp = serverlessExpress({ app });
  }

  return serverlessApp(event, context);
};

