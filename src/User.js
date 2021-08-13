import { generateSecret, generateBundleHash, } from '@wishknish/knishio-client-js/src/libraries/crypto';
import storageDB from "./libraries/storageDB";
import KnishIOVuexModel from './KnishIOVuexModel';
import UserWallets from './UserWallets';
import ModelEventListener from '@wishknish/knishio-identity-layer/src/ModelEventListener';
import AuthToken from "@wishknish/knishio-client-js/src/AuthToken";




// Declaring indexedDB database
const db = new storageDB();


export default class User {


  static vuexFields() {
    return [
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
    ];
  }
  static defaultState() {
    return {
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
    }
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
        return state.user.secret ? state.user.secret : db.getDataPromise( 'secret' );
      }, },
      { name: 'GET_USERNAME', fn: ( state ) => {
        return state.user.username ? state.user.username : db.getDataPromise('username' );
      }, },
      { name: 'GET_AUTH_TOKEN', fn: async ( state ) => {
        if ( state.user.authToken ) {
          return state.user.authToken;
        }
        let authToken = await db.getDataPromise( 'authToken' );
        return authToken ? JSON.parse( authToken ) : null;
      }, },
    ];
    let mutations = [
      { name: 'SET_SECRET', fn: async ( state, secret ) => {
        state.user.secret = secret;
        await db.setDataPromise( 'secret', secret );
      }, },
      { name: 'SET_USERNAME', fn: async ( state, username ) => {
        state.user.username = username;
        await db.setDataPromise( 'username', username );
      }, },
      { name: 'SET_AUTH_TOKEN', fn: async ( state, authToken ) => {
        state.user.authToken = authToken;
        await db.setDataPromise( 'authToken', JSON.stringify(authToken) );
      }, },

      { name: 'RESET_STATE', fn: async ( state, defaultState ) => {
          console.log( 'User::resetState() - Mutating user state...' );
          await db.deleteDataPromise( 'username' );
          await db.deleteDataPromise( 'secret' );
          Object.assign( state.user, defaultState );
      }, },
    ];

    // Fill all vuex data
    return KnishIOVuexModel.fillVuexStorage( module, 'user', User.vuexFields(), User.defaultState(), getters, mutations );
  }

  /**
   * Create new user instance
   *
   * @param store
   * @param client
   * @param vm
   * @param salt
   * @returns {User}
   */
  static instance( store, client, vm, salt ) {
    if ( !User._instance ) {
      User._instance = new User( store, client, vm, salt );
    }
    return User._instance;
  }

  /**
   *
   * @param storage
   * @param client
   * @param vm
   * @param salt
   */
  constructor ( storage, client, vm, salt ) {
    this.$__storage = storage; // KnishIOVuexModel
    this.$__store = storage.$__store; // Vuex store
    this.$__client = client;
    this.$__vm = vm;

    this.$__salt = salt;

    // Create an empty event listener
    this.$__listener = new ModelEventListener( true );

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
   * @returns {Promise<void>}
   */
  async init( { newSecret = null, username = null, } ) {
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
    await this.$__storage.setVuex( 'secret', secret );

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

    // On user init
    await this.$__listener.on( 'init', this, db );

    await this.set( 'initialized', true );
    console.log( 'User::init() - Bootstrap complete...' );
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
    if ( secret ) {
      this.$__client.setSecret( secret );
    }

    // Auth token default initialization
    let authTokenData = await this.$__storage.getVuexAsync( 'auth_token' );

    // Has a stored auth token data - restore an authToken object from it
    let authTokenObject = null;
    if ( authTokenData ) {
      authTokenObject = AuthToken.restore( authTokenData, secret );
    }
    console.log( `User::authorize() - Retrieving auth token ${ authTokenObject ? authTokenObject.getToken() : 'NONE' }...` );


    // Try to get a new auth token
    if ( newSecret || !authTokenObject || authTokenObject.isExpired() ) {

      // Get a new auth token
      authTokenObject = await this.$__client.authorize({
        secret,
      });
      console.log( `User::authorize() - Get a new auth token ${ authTokenObject.getToken() }...` );

      // Save authToken & set some refresh code
      await this.set( 'auth_token', authTokenObject.getSnapshot() );
    }

    // Set an auth token to the KnishIOClient
    this.$__client.setAuthToken( authTokenObject );



    // Remove previous timeout for the auth token update
    let authTimeout = await this.get( 'auth_timeout' );
    clearTimeout( authTimeout );

    // Create a new auth token timeouts
    console.log( `User::authorize() - Set auth timeout interval to ${ Math.floor( authTokenObject.getExpireInterval() / 1000 ) } seconds...` );
    let self = this;
    authTimeout = setTimeout( self => {
      ( async self => {
        await self.authorize( { newSecret, } );
      } )( self );
    }, authTokenObject.getExpireInterval(), self );

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

    if ( !this.$__salt ) {
      throw 'User::login() - Salt is required for secure hashing!';
    }

    // Starting new Knish.IO session
    if ( !secret ) {
      secret = generateSecret( `${ username }:${ password }:${ this.$__salt }` );
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

      // On login success
      await this.$__listener.on( 'loginSuccess', this, db );

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

    if ( !this.$__salt ) {
      throw 'User::register() - Salt is required for secure hashing!';
    }

    // Starting new Knish.IO session
    const newSecret = generateSecret( `${ username }:${ password }:${ this.$__salt }` );

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

    await this.set( 'auth_token', false );

    await this.set( 'user_data', {} );

    // Reset wallets
    await this.wallets.reset();

    await this.set( 'initialized', true );
    console.log( 'User::logout() - User session cleared...' );
  }


  /**
   *
   * @param apolloClient
   * @param gqlQuery
   * @param masterToken
   * @returns {Promise<void>}
   */
  async subscribeWalletBalance ( apolloClient, gqlQuery, masterToken ) {

    console.log( 'User::update() - Subscribe wallet balance...' );

    let wallets = await this.wallets.getWallets();

    for ( let token in wallets ) {
      if ( token === masterToken ) {
        continue;
      }

      let wallet = wallets[ token ];
      let self = this;

      const observer = apolloClient.subscribe( {
        query: gqlQuery,
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
   * @param apolloClient
   * @param gqlQuery
   * @param masterToken
   * @returns {Promise<void>}
   */
  async subscribeActiveWallet ( apolloClient, gqlQuery, masterToken ) {

    console.log( 'User::subscribeActiveWallet() - Subscribe active wallet...' );

    let wallets = await this.wallets.getWallets();

    for ( let token in wallets ) {
      if ( token === masterToken ) {
        continue;
      }

      let wallet = wallets[ token ];
      let self = this;

      const observer = apolloClient.subscribe( {
        query: gqlQuery,
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


}
