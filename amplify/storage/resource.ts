import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'planMarkStorage',
  access: (allow) => ({
    'documents/*': [
      allow.guest.to(['read', 'write', 'delete'])
    ],
  })
});
