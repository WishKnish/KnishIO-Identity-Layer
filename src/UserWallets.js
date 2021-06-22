import KnishIOVuexModel from './KnishIOVuexModel';
import { Wallet, } from '@wishknish/knishio-client-js';


/**
 *
 */
export default class UserWallets {

  static vuexFields() {
    return [
      'wallets',
      'shadow_wallets',
    ];
  }
  static defaultState() {
    return {
      wallets: {},
      shadowWallets: {},
    };
  };


  /**
   * Generate vuex getters & setters
   *
   * @param module
   * @returns {*}
   */
  static fillVuexStorage( module ) {

    let getters = [
    ];
    let mutations = [
      { name: 'RESET_STATE', fn: ( state, defaultState ) => {
        Object.keys( defaultState ).forEach( key => {
          state[ key ] = defaultState[ key ];
        } );
      }, },
    ];


    // Override state
    KnishIOVuexModel.overrideState( module, UserWallets.defaultState() );

    // Fill all vuex data
    return KnishIOVuexModel.fillVuexStorage( module, UserWallets.vuexFields(), getters, mutations );
  }


  /**
   *
   * @param storage
   * @param vm
   */
  constructor ( storage, vm ) {
    this.$__storage = storage; // KnishIOVuexModel
    this.$__store = storage.$__store; // Vuex store
    this.$__vm = vm;
  }


  /**
   *
   * @param tokenSlug
   * @param shadow
   * @returns {Promise<*|*>}
   */
  async getWallets( tokenSlug = null, shadow = false ) {
    let wallets = await this.$__storage.getVuex( shadow ? 'shadow_wallets' : 'wallets' );
    if ( !tokenSlug ) {
      return wallets;
    }
    return wallets[ tokenSlug ];
  }


  /**
   *
   * @param tokenSlug
   * @returns {Promise<*>}
   */
  async getShadowWallets( tokenSlug = null ) {
    return await this.getWallets( tokenSlug, true );
  }


  /**
   * !!! @todo not used
   * @param secret
   * @param token
   * @param position
   * @returns {Promise<void>}
   */
  async init ( { secret, token, position = null, } ) {
    const wallet = new Wallet( {
      secret,
      token,
      position,
    } );

    // Generating initial master wallet
    await this.setWallet( wallet );
  }


  /**
   *
   * @returns {Promise<void>}
   */
  async reset () {
    console.log( 'Wallet::reset() - Deleting wallet meta...' );
    
    this.$__store.commit( 'wallet/RESET_STATE', UserWallets.defaultState() );
  }


  /**
   *
   * @param wallets
   * @returns {Promise<void>}
   */
  async import ( wallets ) {
    console.log( `Wallet::import() - Preparing to restore ${ wallets.length } remote wallets...` );

    // Reset state
    await this.reset();

    // If we have an address, it's a regular wallet; otherwise, it's a show wallet
    wallets.forEach( wallet => {
      wallet.balance = Number( wallet.balance );

      // Set wallet
      if ( wallet.address ) {
        this.setWallet( wallet );
      }
      else {
        this.setShadowWallet( wallet );
      }

    } );

    console.log( 'Wallet::import() - All remote wallets restored...' );
  }


  /**
   *
   * @param wallet
   * @returns {Promise<void>}
   */
  async setWallet ( wallet ) {
    const oldWallet = await this.getWallets( wallet.token );

    if ( !oldWallet || !wallet.createdAt || oldWallet.createdAt <= wallet.createdAt ) {
      console.log( `Wallet::SET_WALLET - Setting ${ wallet.token } wallet with a balance of ${ wallet.balance }...` );

      this.$__vm.$set( this.$__store.state.wallet.wallets, wallet.token, wallet );
    } else {
      console.warn( `Wallet::SET_WALLET - ${ wallet.token } wallet with a balance of ${ wallet.balance } is outdated; Not setting...` );
    }
  }


  /**
   *
   * @param wallet
   * @returns {Promise<void>}
   */
  async setShadowWallet ( wallet ) {
    console.log( `Wallet::SET_WALLET_SHADOW - Setting ${ wallet.token } shadow wallet...` );
    this.$__vm.$set( this.$__store.state.wallet.shadowWallets, wallet.token, wallet );
  }


}
