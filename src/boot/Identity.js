import KnishIOVuexModel from '@wishknish/knishio-identity-layer/src/KnishIOVuexModel';
import User from '@wishknish/knishio-identity-layer/src/User';
import UserWallets from '@wishknish/knishio-identity-layer/src/UserWallets';

import Vuex from 'vuex';

/**
 *
 */
export default class Identity {


  /**
   * Get all computed fields
   * @returns {*}
   */
  static getComputed() {
    return Object.assign( User.vuexModel.getComputed() , UserWallets.vuexModel.getComputed() );
  }


  /**
   *
   * @param Vue
   * @param userAttributes
   */
  constructor( Vue, userAttributes ) {
    this.init( Vue, userAttributes );
  }


  /**
   *
   * @param Vue
   * @param userAttributes
   * @param logging
   */
  init( Vue, userAttributes, logging ) {

    // Create a vuex store object
    this.$__store = this.createStore( Vue );

    // Init vuex models for User & UserWallets
    this.initVuexModels( this.$__store, userAttributes, logging );
  }


  /**
   *
   * @param Vue
   * @returns {Store<unknown>}
   */
  createStore( Vue ) {
    Vue.use( Vuex );

    // Init store options
    let options = {
      state: {},
      getters: {},
      mutations: {},
    };
    User.fillVuexStorage( options );
    UserWallets.fillVuexStorage( options );

    return new Vuex.Store( options );
  }


  /**
   *
   * @param store
   * @param userAttributes
   * @param logging
   */
  initVuexModels( store, userAttributes, logging = false ) {

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
