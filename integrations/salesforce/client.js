// Salesforce Integration Client
// Uses jsforce / REST API with JWT bearer flow
// See specs/ARCHITECTURE.md for API details

export class SalesforceClient {
  constructor(config) {
    // TODO: Initialize jsforce connection with JWT auth
  }

  async getContactByEmail(email) {
    // TODO: SOQL query to find contact by email
    return null;
  }

  async getAccountContext(accountId) {
    // TODO: Fetch account + open opportunities + recent activity
    return null;
  }

  async getOpportunities(accountId) {
    // TODO: Fetch open opportunities for account
    return [];
  }
}
