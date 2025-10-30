// Minimal shim to satisfy existing imports during migration

export const microsoftDataService = {
  users: {
    async getEnterpriseUsers() {
      return [];
    },
  },
};



