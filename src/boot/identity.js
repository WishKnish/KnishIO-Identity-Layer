import User from '@wishknish/knishio-identity-layer/src/User';
import KnishIOVuexModel from '@wishknish/knishio-identity-layer/src/KnishIOVuexModel';
import UserWallets from '@wishknish/knishio-identity-layer/src/UserWallets';
import user from '../../../../../src/store/user';
import wallet from '../../../../../src/store/wallet';

/**
 *
 */
export default class identity {


  /**
   *
   * @param options
   * @returns {{}}
   */
  static fillStore( options = {} ) {

    options.state = {};
    options.getters = {};
    options.mutations = {};

    User.fillVuexStorage( options ),
    UserWallets.fillVuexStorage( options ),
    console.error( options );

    return options;
  }


  /**
   *
   * @param userAttributes
   * @param logging
   */
  static initVuexModels( store, userAttributes, logging = false ) {

    // Create a user vuex model from the base model class without KnishIOClient
    User.vuexModel = new KnishIOVuexModel(
      store,
      User.vuexFields(),
      'user',
      userAttributes,
      logging
    );

    // Create a user wallets model
    UserWallets.vuexModel = new KnishIOVuexModel(
      store,
      UserWallets.vuexFields(),
      'wallet',
      [],
      logging
    );

  }

}
