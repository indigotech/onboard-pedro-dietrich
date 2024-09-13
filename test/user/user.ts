import getUserTest from './get-user.js';
import getUsersTest from './get-users.js';
import createUserTest from './create-user.js';

describe('User API', function () {
  getUserTest();
  getUsersTest();
  createUserTest();
});
