import {getField as getFieldWrapper, updateField as setFieldWrapper, } from 'vuex-map-fields';


/**
 *
 */
export default class KnishIOVuexModel {


  /**
   * Generate vuex getters & setters
   * @param object
   * @param fields
   * @param getters
   * @param mutations
   * @returns {*}
   */
  static fillVuexStorage( object, prefix, fields, defaultState, getters = [], mutations = [] ) {

    let withPrefix = ( key ) => {
      return `${ prefix }/${ key }`;
    };

    // Fill getters & mutations with base fields
    fields.forEach( ( field ) => {
      getters.push( {
        name: `get_${ field }`.toUpperCase(), fn: ( state ) => {
          return state[ prefix ][ field.toCamelCase() ];
        },
      } );
      mutations.push( {
        name: `set_${ field }`.toUpperCase(), fn: ( state, value ) => {
          state[ prefix ][ field.toCamelCase() ] = value;
        },
      } );
    } );

    // Add getters & mutations to the object
    getters.forEach( ( getter ) => {
      if ( !object.getters.hasOwnProperty( withPrefix( getter.name ) ) ) {
        // console.log( `KnishIOVuexModel::fillVuexStorage ADD: ${ getter.name } => ${ getter.fn }` );
        object.getters[ withPrefix( getter.name ) ] = getter.fn;
      }
    } );
    mutations.forEach( ( mutation ) => {
      if ( !object.mutations.hasOwnProperty( withPrefix( mutation.name ) ) ) {
        // console.log( `KnishIOVuexModel::fillVuexStorage ADD: ${ mutation.name } => ${ mutation.fn }` );
        object.mutations[ withPrefix( mutation.name ) ] = mutation.fn;
      }
    } );

    // Add get/set field functions
    object.getters[ withPrefix( 'getField' ) ] = getFieldWrapper;
    object.mutations[ withPrefix( 'updateField' ) ] = setFieldWrapper;

    // Override module.getters & state
    object.getters[ withPrefix( 'GET_DEFAULT_STATE' ) ] = () => {
      return defaultState;
    };
    object.state[ prefix ] = defaultState;

    return object;
  }



  /**
   *
   * @param store
   * @param vuexFields
   * @param attributes
   * @param prefix
   * @param logging
   */
  constructor ( store, vuexFields, prefix, attributes = [], logging = false ) {

    // Vuex store
    this.$__store = store;

    // Vuex fields & attributes (stores in [prefix]_data vuex field)
    this.$__vuexFields = vuexFields;
    this.$__attributes = attributes;

    // Vuex prefix
    this.$__prefix = prefix || this.constructor.name.toSnakeCase();

    // Logging
    this.$__logging = logging;
  }


  /**
   *
   * @returns {*[]}
   */
  attributes() {
    return this.$__attributes;
  }


  /**
   *
   * @returns {{}}
   */
  getComputed() {
    let computed = {};
    this.$__vuexFields.concat( this.$__attributes ).forEach( ( field ) => {
      let computedField = this.$__vuexFields.includes( field ) ? field.toCamelCase() : field;
      computed[ computedField ] = {
        get: () => {
          return this.get( field );
        },
        set: ( value ) => {
          this.set( field, value );
        },
      };
    } );
    return computed;
  }


  /**
   * Set data value
   *
   * @param key
   * @param value
   */
  async setData( key, value ) {
    let fieldName = `${ this.$__prefix }_data`;
    let data = this.get( fieldName );
    data[ key ] = value;
    if ( this.$__logging ) {
      console.log( `------- setAttribute ${ fieldName }: ${key} = ${value}` );
    }
    await this.setVuex( fieldName, data );
  }


  /**
   * Get a data value
   * @param key
   * @returns {Promise<void>}
   */
  getData( key ) {
    let fieldName = `${ this.$__prefix }_data`;
    let data = this.get( fieldName );
    if ( !data ) {
      if ( this.$__logging ) {
        console.warn( ` ${this.constructor.name}.data is empty.` );
      }
      return null;
    }
    if ( !data.hasOwnProperty( key ) ) {
      if ( this.$__logging ) {
        console.error( ` ${this.constructor.name}.data[ ${key} ] does exists.` );
      }
      return null;
    }
    let value = data[ key ];
    if ( this.$__logging ) {
      console.log( `------- getAttribute ${ fieldName }: ${ key } => ${ value }` );
    }
    return value;
  }



  /**
   * Set a value to vuex
   * @param field
   * @param value
   */
  async setVuex( field, value ) {
    if ( this.$__logging ) {
      console.log( `------- setVuex: ${this.$__prefix}/SET_${field.toUpperCase()} = ${value}` );
    }
    await this.$__store.commit( `${ this.$__prefix }/SET_${ field.toUpperCase() }`, value );
    /*
    this.$__store.commit( `${this.$__prefix}/updateField`, {
      path: field.toCamelCase(),
      value: value,
    } );
    */
  }


  /**
   * Get a value from vuex
   */
  getVuex( field ) {
    let value = this.$__store.getters[ `${ this.$__prefix }/getField` ]( `${ this.$__prefix }.${ field.toCamelCase() }` );
    // let value = this.$__store.getters[ `${ this.$__prefix }/GET_${ field.toUpperCase() }` ];
    if ( this.$__logging ) {
      console.log( `------- getVuex: ${this.$__prefix}/GET_${field.toUpperCase()} - ${value}` );
    }
    return value;
  }


  /**
   * Get a value from vuex with async
   *
   * @param field
   * @returns {Promise<*>}
   */
  async getVuexAsync( field ) {
    let value = await this.$__store.getters[ `${ this.$__prefix }/GET_${ field.toUpperCase() }` ];
    if ( this.$__logging ) {
      console.log( `------- getVuexAsync: ${this.$__prefix}/GET_${field.toUpperCase()} - ${value}` );
    }
    return value;
  }


  /**
   * Set any field (vuex OR attrbiute)
   * @param field
   * @param value
   * @returns {Promise<void>}
   */
  async set( field, value ) {
    if( this.$__vuexFields.includes( field ) ) {
      await this.setVuex( field, value );
    }
    else {
      await this.setData( field, value );
    }
  }


  /**
   * Get any field (vuex OR attrbiute)
   * @param field
   * @returns {Promise<void>}
   */
  get( field ) {
    if( this.$__vuexFields.includes( field ) ) {
      return this.getVuex( field );
    }
    else {
      return this.getData( field );
    }
  }


}
