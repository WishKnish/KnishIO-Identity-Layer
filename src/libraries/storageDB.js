import Dexie from 'dexie';


/**
 *
 */
export default class storageDB {

  /**
   *
   */
  constructor () {

    // Declaring indexedDB database
    this.$__db = new Dexie( 'KnishIO' );

    // Declare tables, IDs and indexes
    this.$__db.version( 1 )
      .stores( {
        store: '++key, value'
      } );
  }

  /**
   * Retrieve a field from IndexDb
   *
   * @param field
   * @param store
   * @returns {Promise<*>}
   */
  getDataPromise ( field, store = 'store' ) {
    return this.$__db[ store ]
      .get( {
        key: field
      } )
      .then( function ( foundData ) {
        if ( foundData ) {
          return foundData.value;
        } else return false;
      } )
      .catch( err => {
        console.error( err );
      } );
  }

  /**
   * Update a field in IndexDb with new data
   *
   * @param field
   * @param newValue
   * @param store
   * @returns {Promise<*>}
   */
  async setDataPromise ( field, newValue, store = 'store' ) {
    return this.$__db[ store ].put( {
      key: field,
      value: newValue
    } )
      .catch( err => {
        console.error( err );
      } );
  }

  /**
   * Delete a field from IndexDb
   *
   * @param field
   * @param store
   * @returns {Promise<*>}
   */
  async deleteDataPromise ( field, store = 'store' ) {
    return this.$__db[ store ].delete( field )
      .catch( err => {
        console.error( err );
      } );
  }


}
