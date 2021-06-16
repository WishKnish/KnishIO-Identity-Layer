import { generateSecret, generateBundleHash, } from '@wishknish/knishio-client-js/src/libraries/crypto';
import { KNISHIO_SETTINGS, } from 'src/constants/knishio';
import KnishIOVuexModel from 'src/libraries/models/KnishIOVuexModel';
import {connectionDB, deleteDataPromise, getDataPromise, setDataPromise,} from 'src/libraries/storageDB';
import WalletBundle from 'src/libraries/models/WalletBundle';
import Role from 'src/libraries/models/Role';
import KnishIOModel from 'src/libraries/models/KnishIOModel';
import { apolloClient, } from 'boot/apollo';
import UserWallets from 'src/libraries/models/UserWallets';
// import { ACTIVE_WALLET_SUBSCRIPTION, WALLET_BALANCE_SUBSCRIPTION, } from 'src/constants/graphql/subscribtion/wallet';



// Declaring indexedDB database
const db = connectionDB();


export default class User extends KnishIOModel {

  static _instance = null;
  static vuexModel = null;

  static vuexFields = [
    'secret',
    'username',
    'bundle',
    'created_at',
    'metas',

    'auth_token',
    'auth_timeout',
    'logged_in',
    'initialized',

    'user_data',
    'user_roles',
    'user_sessions',
  ];

  static defaultState = {
    secret: null,
    username: null,

    bundle: null,
    created_at: null,
    metas: null,

    userData: {},

    loggedIn: false,
    initialized: false,

    authToken: '',
    authTimeout: null,

    userRoles: {},
    userSessions: {},
  };



  /**
   * Generate vuex getters & setters
   *
   * @param module
   * @returns {*}
   */
  static fillVuexStorage( module ) {

    let getters = [
      { name: 'GET_SECRET', fn: async ( state ) => {
        return state.secret ? state.secret : getDataPromise( db, 'secret' );
      }, },
      { name: 'GET_USERNAME', fn: ( state ) => {
        return state.username ? state.username : getDataPromise( db, 'username' );
      }, },
      { name: 'GET_AUTH_TOKEN', fn: async ( state ) => {
        if ( state.authToken ) {
          return state.authToken;
        }
        let authToken = await getDataPromise( db, 'authToken' );
        return authToken ? JSON.parse( authToken ) : null;
      }, },
    ];
    let mutations = [
      { name: 'SET_SECRET', fn: async ( state, secret ) => {
        state.secret = secret;
        await setDataPromise( db, 'secret', secret );
      }, },
      { name: 'SET_USERNAME', fn: async ( state, username ) => {
        state.username = username;
        await setDataPromise( db, 'username', username );
      }, },
      { name: 'SET_AUTH_TOKEN', fn: async ( state, authToken ) => {
        state.authToken = authToken;
        await setDataPromise( db, 'authToken', JSON.stringify(authToken) );
      }, },

      { name: 'RESET_STATE', fn: async ( state, defaultState ) => {
          console.log( 'User::resetState() - Mutating user state...' );
          await deleteDataPromise( db, 'username' );
          await deleteDataPromise( db, 'secret' );
          Object.assign( state, defaultState );
      }, },
    ];


    // Override state
    KnishIOVuexModel.overrideState( module, User.defaultState );

    // Fill all vuex data
    return KnishIOVuexModel.fillVuexStorage( module, User.vuexFields, getters, mutations );
  }

  /**
   * Create a user instance
   *
   * @param store
   * @param client
   * @param vm
   * @returns {null}
   */
  static instance( store, client, vm ) {
    if ( !User._instance ) {
      User._instance = new User( store, client, vm );
    }
    return User._instance;
  }

  /**
   *
   * @param storage instance of KnishIOVuexModel
   * @param client
   * @param vm
   */
  constructor ( storage, client, vm ) {
    super();

    this.$__storage = storage; // KnishIOVuexModel
    this.$__store = storage.$__store; // Vuex store
    this.$__client = client;
    this.$__vm = vm;

    // Create a user wallets model to operate with user wallets (import / reset)
    this.wallets = new UserWallets( UserWallets.vuexModel, vm );
  }


  /**
   * Set any field (vuex OR attrbiute)
   * @param field
   * @param value
   * @returns {Promise<void>}
   */
  async set( field, value ) {
    await this.$__storage.set( field, value );
  }


  /**
   * Get any field (vuex OR attrbiute)
   * @param field
   * @returns {*}
   */
  get( field ) {
    return this.$__storage.get( field );
  }


  /**
   * Init
   * @param newSecret
   * @param username
   * @param uriRefhash
   * @returns {Promise<void>}
   */
  async init( { newSecret = null, username = null, uriRefhash = null, } ) {
    console.log( 'User::init() - Beginning bootstrap procedure...' );


    // Generating / recovering user's secret
    let secret;
    if ( newSecret ) {
      secret = newSecret;
    }
    else {
      secret = await this.$__storage.getVuexAsync( 'secret' );
    }
    // !!! Set the secret for update a local state to set related computed up to date
    await this.$__store.commit( 'user/SET_SECRET', secret );

    // Save username
    if ( username ) {
      await this.set( 'username', username );
    }

    // User authorization
    await this.authorize( { newSecret, } );

    // Has a secret on the client?
    if ( this.$__client.hasSecret() ) {

      // Getting everything the ledger knows about this bundle
      await this.restore();

    } else {

      console.warn( 'User::init() - User is not logged in...' );

    }

    await this.set( 'initialized', true );
    console.log( 'User::init() - Bootstrap complete...' );



    // --- Set refhash
    let refhash = await getDataPromise( db, 'refhash' );
    let isLoggedIn = this.get( 'logged_in' );
    if ( !refhash && !isLoggedIn ) {

      let client = this.$__client;

      // Get refhash param in setTimeout, because router in store not ready immediately
      setTimeout( client => async function () {
        if ( typeof uriRefhash !== 'undefined' ) {

          let userBundle = new WalletBundle( {} );
          await userBundle.query( client, {
            usernameHash: uriRefhash,
          }, );

          if ( userBundle.id ) {
            await setDataPromise( db, 'refhash', uriRefhash );
          }
        }
      }, 3000 );
    }
    else if ( refhash && isLoggedIn ) {
      await deleteDataPromise( db, 'refhash' );
    }

    // --- Set user roles
    if ( isLoggedIn ) {
      console.log( 'User::init() - Set user roles' );

      let queryParams = {
        bundleHash: this.$__client.getBundle(),
        status: 'active',
      };

      let roles = await Role.query( this.$__client, queryParams );
      if ( roles.instances.length > 0 ) {
        await this.set( 'user_roles', roles.instances );
      }
    }
    else {
      await this.set( 'user_roles', {} );
    }


  }


  /**
   * Restore
   *
   * @returns {Promise<void>}
   */
  async restore() {
    console.log( 'User::restore() - Beginning remote restore...' );

    // Get a user's bundle
    let result = await this.$__client.queryBundle( {} );
    if ( !result || !Object.keys( result ).length ) {
      return;
    }

    // Importing recovered wallets
    await this.restoreWallets();

    // Restore user data from the bundle object
    const bundle = Object.values( result ).pop();
    await this.restoreData( bundle );

    // Set logged_in flag
    await this.set( 'logged_in', true );

    console.log( 'User::restore() - Restore complete...' );
  }


  /**
   * Restore wallets
   *
   * @returns {Promise<void>}
   */
  async restoreWallets() {

    // Importing recovered wallets
    console.log( 'User::restoreWallets() - Restoring remote wallets...' );
    let wallets = await this.$__client.queryWallets( {} );

    // Import wallets
    await this.wallets.import( wallets );

    console.log( 'User::restoreWallets() - Restoring complete...' );
  }


  /**
   *
   * @param bundle
   * @returns {Promise<void>}
   */
  async restoreData( bundle ) {

    // Init user data
    let data = {
      bundle: bundle.bundleHash,
      createdAt: Number( bundle.createdAt ),
      metas: bundle.metas,
    };

    // Init old data to get a cover value
    let oldData = await this.get( 'user_data' );

    console.log( 'User::restoreData() - Restoring remote metadata...' );
    if ( !bundle.metas ) {
      console.warn( 'User::restoreData() - No remote metadata found...' );
    }

    // Fill data with attributes (from bundle metas)
    this.$__storage.attributes().forEach( ( attribute ) => {
      console.log( `User::restoreData() - Setting ${ attribute } to ${ bundle.metas[ attribute ] }...` );
      data[ attribute ] = bundle.metas[ attribute ];
    } );


    // Init a cover if it does not exist
    if ( !oldData[ 'cover' ] ) {

      // Generate a random cover
      const GeoPattern = require( 'geopattern' );
      data[ 'cover' ] = GeoPattern.generate( bundle.bundleHash )
        .toDataUrl();

    }

    // Sync user data with vuex storage
    await this.set( 'user_data', data );
  }


  /**
   *
   * @param newSecret
   * @returns {Promise<void>}
   */
  async authorize( { newSecret, }, ) {

    console.log( 'User::authorize() - Starting authorization process...' );

    // Has a new secret: saving secret locally & update it on KnishIOClient
    if ( newSecret ) {
      console.log( 'User::authorize() - Replacing user secret...' );
      await this.set( 'secret', newSecret );
    }

    // Get stored secret & set it to the KnishIOClient
    console.log( 'User::authorize() - Retrieving user identity...' );
    let secret = await this.$__storage.getVuexAsync( 'secret' );
    // await this.$__store.getters[ `${ this.$__prefix}/GET_SECRET` ];
    if ( secret ) {
      this.$__client.setSecret( secret );
    }

    // Auth token default initialization
    let authToken = await this.$__storage.getVuex( 'auth_token' );
    // await this.$__store.getters[ `${ this.$__prefix}/GET_AUTH_TOKEN` ];
    console.log( `User::authorize() - Retrieving auth token ${ authToken ? authToken.token : 'NONE' }...` );

    // Try to get a new auth token
    if ( newSecret || !authToken || !authToken.expiresAt || authToken.expiresAt * 1000 < Date.now() ) {
      authToken = await this.$__client.authorize({
        secret,
      });
      console.log( `User::authorize() - Get a new auth token ${ authToken.token }...` );

      // Save authToken & set some refresh code
      await this.$__storage.setVuex( 'auth_token', authToken );
      // await this.$__store.commit( `${ this.$__prefix}/SET_AUTH_TOKEN`, authToken );
    }

    // Set an auth token to the KnishIOClient
    this.$__client.setAuthToken( authToken );



    // Remove previous timeout for the auth token update
    let authTimeout = await this.get( 'auth_timeout' );
    clearTimeout( authTimeout );

    // Create a new auth token timeouts
    console.log( `User::authorize() - Set auth timeout to ${ new Date(authToken.expiresAt * 1000) } ...` );
    let self = this;
    authTimeout = setTimeout( self => {
      ( async self => {
        await self.authorize( { newSecret, } );
      } )( self );
    }, ( authToken.expiresAt * 1000 ) - Date.now(), self );
    // Save auth timeout
    await this.set( 'auth_timeout', authTimeout );


  }


  /**
   * Attempts to log in the user by hashing a new secret and retrieving the user's data
   *
   * @param username
   * @param password
   * @param secret
   * @returns {Promise<void>}
   */
  async login ( { username, password, secret, } ) {

    console.log( 'User::login() - Starting login process...' );

    if ( !KNISHIO_SETTINGS.salt ) {
      throw 'User::login() - Salt is required for secure hashing!';
    }

    // Starting new Knish.IO session
    if ( !secret ) {
      secret = generateSecret( `${ username }:${ password }:${ KNISHIO_SETTINGS.salt }` );
    }
    const bundle = generateBundleHash( secret );

    // Attempting to retrieve user's metadata for the given secret
    const result = await this.$__client.queryBundle( {
      bundle,
    } );

    if ( result ) {

      console.log( `User::login() - Retrieved ${ Object.keys( result ).length } results for bundle hash ${ bundle }...` );

    } else {

      console.warn( `User::login() - Failed to retrieve results for bundle hash ${ bundle }...` );

    }

    // Successful login, proceed to session initialization
    if ( result && result[ bundle ] && Object.keys( result[ bundle ].metas ).length > 0 ) {

      console.log( 'User::login() - Logging in...' );
      await this.init( { newSecret: secret, username, } );

      // Delete refhash when user logged in
      let refhash = await getDataPromise( db, 'refhash' );
      if ( refhash ) {
        await deleteDataPromise( db, 'refhash' );
      }

    } else {

      console.warn( 'User::login() - User not registered; Aborting login...' );
      await this.logout();

    }
  }


  /**
   * Validates the registration state of the user to ensure there is no duplicate
   *
   * @param username
   * @param password
   * @returns {Promise<void>}
   */
  async register ( { username, password, } ) {

    console.log( 'User::register() - Starting registration process...' );

    if ( !KNISHIO_SETTINGS.salt ) {
      throw 'User::register() - Salt is required for secure hashing!';
    }

    // Starting new Knish.IO session
    const newSecret = generateSecret( `${ username }:${ password }:${ KNISHIO_SETTINGS.salt }` );

    // Get a bundle from the secret
    const bundle = generateBundleHash( newSecret );

    // Attempting to retrieve user's metadata for the given secret
    const result = await this.$__client.queryBundle( {
      bundle,
    } );

    if ( result ) {

      console.log( `User::register() - Retrieved ${ Object.keys( result ).length } results for bundle hash ${ bundle }...` );

    } else {

      console.warn( `User::register() - Failed to retrieve results for bundle hash ${ bundle }...` );

    }

    // Successful login - this means we can't register!
    if ( result && result[ bundle ] && Object.keys( result[ bundle ].metas ).length > 0 ) {

      console.warn( 'User::register() - User already registered; Aborting registration...' );
      await this.logout();

    } else {

      console.log( 'User::register() - User not registered; Registration can proceed...' );
      await this.init( { newSecret, username, } );

    }
  }


  /**
   * Clears the user state to begin an empty session
   *
   * @returns {Promise<void>}
   */
  async logout () {
    console.log( 'User::logout() - Clearing user session...' );
    await this.set( 'initialized', false );
    await this.$__client.deinitialize();
    await this.set( 'logged_in', false );
    await this.set( 'secret', false );
    await this.set( 'username', false );
    await this.set( 'bundle', false );
    await this.set( 'user_roles', {} );

    await this.set( 'auth_token', false );

    await this.set( 'user_data', {} );

    // Reset wallets
    await this.wallets.reset();

    await this.set( 'initialized', true );
    console.log( 'User::logout() - User session cleared...' );
  }


  /**
   *
   * @returns {Promise<void>}
   */
  async subscribeWalletBalance () {

    console.log( 'User::update() - Subscribe wallet balance...' );

    let wallets = await this.wallets.getWallets();
    // let wallets = await this.$__store.rootGetters[ 'wallet/GET_WALLETS' ]();

    for ( let token in wallets ) {
      if ( token === KNISHIO_SETTINGS.masterToken ) {
        continue;
      }

      let wallet = wallets[ token ];
      let self = this;

      const observer = apolloClient.subscribe( {
        query: WALLET_BALANCE_SUBSCRIPTION,
        variables: {
          'bundle': wallet.bundle,
          'token': wallet.token,
        },
        fetchPolicy: 'no-cache',
      } );

      observer.subscribe( {
        next ( data ) {

          if ( data.data.WalletStatus.token === wallet.token && data.data.WalletStatus.balance !== wallet.balance ) {

            wallet.balance = data.data.WalletStatus.balance;
            self.wallets.setWallet( wallet );

          }
        },
        error ( error ) {
          console.log( error );
        },
      } );
    }
  }


  /**
   *
   * @returns {Promise<void>}
   */
  async subscribeActiveWallet () {

    console.log( 'User::subscribeActiveWallet() - Subscribe active wallet...' );

    let wallets = await this.wallets.getWallets();

    for ( let token in wallets ) {
      if ( token === KNISHIO_SETTINGS.masterToken ) {
        continue;
      }

      let wallet = wallets[ token ];
      let self = this;
      // let vm = this.$__vm;

      const observer = apolloClient.subscribe( {
        query: ACTIVE_WALLET_SUBSCRIPTION,
        variables: { 'bundle': wallet.bundle, },
        fetchPolicy: 'no-cache',
      } );

      observer.subscribe( {
        next ( data ) {

          if ( data.data.ActiveWallet.tokenSlug === wallet.token ) {

            wallet.position = data.data.ActiveWallet.position;
            wallet.molecules = data.data.ActiveWallet.molecules;
            wallet.batchId = data.data.ActiveWallet.batchId;
            wallet.address = data.data.ActiveWallet.address;
            wallet.balance = data.data.ActiveWallet.amount;

            self.wallets.setWallet( wallet );
          }
        },
        error ( error ) {
          console.log( error );
        },
      } );
    }
  }


  /**
   * Reset user sessions
   *
   * @returns {Promise<void>}
   */
  async resetSessions() {
    await this.set( 'user_sessions', {} );
  }

}
