// Enrichment Integration Client — Apollo / Clearbit unified interface
// See specs/SALES-INTEL.md for API details

export class EnrichmentClient {
  constructor(config) {
    this.provider = config.enrichment_provider || 'apollo';
    // TODO: Initialize API client based on provider
  }

  async enrichContact(email) {
    // TODO: Look up contact by email — returns title, company, LinkedIn, seniority
    return null;
  }

  async enrichCompany(domain) {
    // TODO: Look up company by domain — returns size, industry, revenue, tech stack
    return null;
  }

  async getSignals(domain) {
    // TODO: Fetch buying intent signals for company
    return [];
  }
}
