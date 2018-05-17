import * as monk from 'monk';
import * as shortid from 'shortid';
import * as _ from 'lodash';

import { IUser } from '../models/user';

export interface IUserData {
  createUser: (user: IUser) => Promise<IUser>;
  updateUser: (user: IUser) => Promise<IUser>;
  getUserById: (id: string) => Promise<IUser>;
  getUsersWithIds: (ids: string[]) => Promise<IUser[]>;
  getUserByEmail: (email: string) => Promise<IUser>;
  getAllUsers: () => Promise<IUser[]>;
}

export class MongoUserData implements IUserData {

  private users: monk.ICollection; 

  constructor(mongoConnectionStr: string) {
    let db = monk.default(mongoConnectionStr);
    this.users = db.get('users', { castIds: false });
  }

  getUsersWithIds(ids: string[]): Promise<IUser[]> {
    return this.users.find({ _id: { $in: ids }});
  }

  getUserById(userId: string): Promise<IUser> {
    return this.users.findOne({ _id: userId });
  }

  getUserByEmail(email: string): Promise<IUser> {
    return this.users.findOne({ email });
  }

  createUser(user: IUser): Promise<IUser> {
    const copy = _.cloneDeep(user);
    copy._id = shortid.generate();
    return this.users.insert(copy);
  }

  updateUser(user: IUser): Promise<IUser> {
    return this.users.findOneAndUpdate({ _id: user._id }, user)
  }

  getAllUsers(): Promise<IUser[]> {
    return this.users.find({});
  }

}