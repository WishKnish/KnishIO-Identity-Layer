/**
 *
 */
export default class ModelEventListener {

  constructor( logging = false ) {
    this.$__logging = logging;
    this.events = {};
  }

  bind( eventName, callback ) {
    this.events[ eventName ] = callback;
  }

  unbind( eventName ) {
    if ( this.events[ eventName ] ) {
      delete this.events[ eventName ];
    }
  }

  async on( eventName, model, db ) {
    if ( this.events[ eventName ] ) {
      if ( this.$__logging ) {
        console.log( `ModelEventListener.on: ${ eventName }` );
      }
      await this.events[ eventName ] ( model, db );
    }
  }

}
