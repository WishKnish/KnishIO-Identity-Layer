import { KNISHIO_SETTINGS, } from 'src/constants/knishio';
import Meta from '@wishknish/knishio-client-js/src/Meta';
import KnishIOQueryModel from 'src/libraries/models/KnishIOQueryModel';
import BaseException from '@wishknish/knishio-client-js/src/exception/BaseException';

export default class Role extends KnishIOQueryModel {

  /**
   * Toggles the status of the Review
   *
   * @param {KnishIOClient} client
   * @param {object} metaData
   * @returns {Promise<boolean>}
   */
  async changeStatus ( client, metaData = {} ) {

    const response = await this.save( client, {
      metaData: metaData,
    } );

    if ( !response.error ) {
      return true;
    } else {
      throw( new BaseException( response.error_message ) );
    }
  }

  /**
   * Retrieves a list of Role from Knish.IO
   *
   * @param {KnishIOClient} client
   * @param {null|string} bundleHash
   * @param {null|string} objectId
   * @param {null|string} type
   * @param {null|string} status
   * @param {null|{}} queryArgs
   * @returns {Promise<[]>}
   */
  static async query ( client, {
    bundleHash = null,
    objectId = null,
    type = null,
    status = null,
    queryArgs,
  } ) {
    try {
      const filters = [];

      if ( bundleHash ) {
        filters.push( {
          key: 'bundleHash',
          value: bundleHash,
          comparison: '=',
        } );
      }

      if ( objectId ) {
        filters.push( {
          key: 'objectId',
          value: objectId,
          comparison: '=',
        } );
      }

      if ( type ) {
        filters.push( {
          key: 'type',
          value: type,
          comparison: '=',
        } );
      }

      if ( status ) {
        filters.push( {
          key: 'status',
          value: status,
          comparison: '=',
        } );
      }

      const result = await client.queryMeta( {
        metaType: KNISHIO_SETTINGS.types.role,
        metaId: null,
        filter: filters,
        latest: true,
        latestMetas: true,
        queryArgs,
      } );

      const rawRoles = result && result.instances && result.instances.length > 0 ? result.instances : [];
      const roles = [];
      rawRoles.forEach( rawRole => {
        rawRole.metas = Meta.aggregateMeta( rawRole.metas );

        roles.push( new Role( rawRole ) );
      } );

      let returnObj = {
        instances: roles,
      };

      // If need pagination, return products and rows number
      if ( result && queryArgs && typeof result.paginatorInfo !== 'undefined' && result.paginatorInfo.total ) {
        returnObj.paginatorInfo = result.paginatorInfo;
      }

      return returnObj;

    } catch ( e ) {
      throw e;
    }
  }

  /**
   * Check role already exist
   *
   * @param {KnishIOClient} client
   * @param {array} filterData
   * @return {boolean}
   */
  static async exists ( client, filterData ) {

    let filters = [];
    for ( let i in filterData ) {
      filters.push( {
        key: i,
        value: filterData[ i ],
        comparison: '=',
      } );
    }

    const result = await client.queryMeta( {
      metaType: KNISHIO_SETTINGS.types.role,
      filter: filters,
      countBy: '*',
      latest: true,
      latestMetas: true,
    } );

    return result.instanceCount.length > 0;
  }
}
