!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports,require("vuex-map-fields"),require("@wishknish/knishio-client-js/src/libraries/crypto"),require("dexie"),require("@wishknish/knishio-client-js")):"function"==typeof define&&define.amd?define(["exports","vuex-map-fields","@wishknish/knishio-client-js/src/libraries/crypto","dexie","@wishknish/knishio-client-js"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).KnishIO={},e.vuexMapFields,e.crypto,e.Dexie,e.knishioClientJs)}(this,(function(e,t,s,a,i){"use strict";function r(e){return e&&"object"==typeof e&&"default"in e?e:{default:e}}var o=r(a);class l{static fillVuexStorage(e,s,a=[],i=[]){return s.forEach((e=>{a.push({name:`get_${e}`.toUpperCase(),fn:t=>t[e.toCamelCase()]}),i.push({name:`set_${e}`.toUpperCase(),fn:(t,s)=>{t[e.toCamelCase()]=s}})})),a.forEach((t=>{e.getters.hasOwnProperty(t.name)||(e.getters[t.name]=t.fn)})),i.forEach((t=>{e.mutations.hasOwnProperty(t.name)||(e.mutations[t.name]=t.fn)})),e.getters.getField=t.getField,e.mutations.updateField=t.updateField,e}static overrideState(e,t){let s={};for(let t in e.getters)Object.prototype.hasOwnProperty.call(e.getters,"GET_DEFAULT_STATE")&&(s[t]=e.getters[t]);if(e.getters.GET_DEFAULT_STATE)for(let s in e.getters.GET_DEFAULT_STATE())t[s]=e.getters.GET_DEFAULT_STATE()[s];s.GET_DEFAULT_STATE=()=>t,e.getters=s,e.state=t}constructor(e,t,s,a=[],i=!1){this.$__store=e,this.$__vuexFields=t,this.$__attributes=a,this.$__prefix=s||this.constructor.name.toSnakeCase(),this.$__logging=i}attributes(){return this.$__attributes}getComputed(){let e={};return this.$__vuexFields.concat(this.$__attributes).forEach((t=>{let s=this.$__vuexFields.includes(t)?t.toCamelCase():t;e[s]={get:()=>this.get(t),set:e=>this.set(t,e)}})),e}async setData(e,t){let s=`${this.$__prefix}_data`,a=this.get(s);a[e]=t,this.$__logging&&console.log(`------- setAttribute ${s}: ${e} = ${t}`),await this.setVuex(s,a)}getData(e){let t=`${this.$__prefix}_data`,s=this.get(t);if(!s)return this.$__logging&&console.warn(` ${this.constructor.name}.data is empty.`),null;if(!s.hasOwnProperty(e))return this.$__logging&&console.error(` ${this.constructor.name}.data[ ${e} ] does exists.`),null;let a=s[e];return this.$__logging&&console.log(`------- getAttribute ${t}: ${e} => ${a}`),a}async setVuex(e,t){this.$__logging&&console.log(`------- setVuex: ${this.$__prefix}/SET_${e.toUpperCase()} = ${t}`),this.$__store.commit(`${this.$__prefix}/updateField`,{path:e.toCamelCase(),value:t})}getVuex(e){let t=this.$__store.getters[`${this.$__prefix}/getField`](e.toCamelCase());return this.$__logging&&console.log(`------- getVuex: ${this.$__prefix}/GET_${e.toUpperCase()} - ${t}`),t}async getVuexAsync(e){let t=await this.$__store.getters[`${this.$__prefix}/GET_${e.toUpperCase()}`];return this.$__logging&&console.log(`------- getVuexAsync: ${this.$__prefix}/GET_${e.toUpperCase()} - ${t}`),t}async set(e,t){this.$__vuexFields.includes(e)?await this.setVuex(e,t):await this.setData(e,t)}get(e){return this.$__vuexFields.includes(e)?this.getVuex(e):this.getData(e)}}class n{constructor(){this.$__db=new o.default("KnishIO"),this.$__db.version(1).stores({store:"++key, value"})}getDataPromise(e,t="store"){return this.$__db[t].get({key:e}).then((function(e){return!!e&&e.value})).catch((e=>{console.error(e)}))}async setDataPromise(e,t,s="store"){return this.$__db[s].put({key:e,value:t}).catch((e=>{console.error(e)}))}async deleteDataPromise(e,t="store"){return this.$__db[t].delete(e).catch((e=>{console.error(e)}))}}class c{static vuexFields(){return["wallets","shadow_wallets"]}static defaultState(){return{wallets:{},shadowWallets:{}}}static fillVuexStorage(e){let t=[{name:"RESET_STATE",fn:(e,t)=>{Object.keys(t).forEach((s=>{e[s]=t[s]}))}}];return l.overrideState(e,c.defaultState()),l.fillVuexStorage(e,c.vuexFields(),[],t)}constructor(e,t){this.$__storage=e,this.$__store=e.$__store,this.$__vm=t}async getWallets(e=null,t=!1){let s=await this.$__storage.getVuex(t?"shadow_wallets":"wallets");return e?s[e]:s}async getShadowWallets(e=null){return await this.getWallets(e,!0)}async init({secret:e,token:t,position:s=null}){const a=new i.Wallet({secret:e,token:t,position:s});await this.setWallet(a)}async reset(){console.log("Wallet::reset() - Deleting wallet meta..."),console.log(this.$__store.getters),this.$__store.commit("wallet/RESET_STATE",c.defaultState())}async import(e){console.log(`Wallet::import() - Preparing to restore ${e.length} remote wallets...`),await this.reset(),e.forEach((e=>{e.balance=Number(e.balance),e.address?this.setWallet(e):this.setShadowWallet(e)})),console.log("Wallet::import() - All remote wallets restored...")}async setWallet(e){const t=await this.getWallets(e.token);!t||!e.createdAt||t.createdAt<=e.createdAt?(console.log(`Wallet::SET_WALLET - Setting ${e.token} wallet with a balance of ${e.balance}...`),this.$__vm.$set(this.$__store.state.wallet.wallets,e.token,e)):console.warn(`Wallet::SET_WALLET - ${e.token} wallet with a balance of ${e.balance} is outdated; Not setting...`)}async setShadowWallet(e){console.log(`Wallet::SET_WALLET_SHADOW - Setting ${e.token} shadow wallet...`),this.$__store.$set(this.$__store.state.shadowWallets,e.token,e)}}const u=new n;class h{static vuexFields(){return["secret","username","bundle","created_at","metas","auth_token","auth_timeout","logged_in","initialized","user_data"]}static defaultState(){return{secret:null,username:null,bundle:null,created_at:null,metas:null,userData:{},loggedIn:!1,initialized:!1,authToken:"",authTimeout:null,userRoles:{},userSessions:{}}}static fillVuexStorage(e){let t=[{name:"GET_SECRET",fn:async e=>e.secret?e.secret:u.getDataPromise("secret")},{name:"GET_USERNAME",fn:e=>e.username?e.username:u.getDataPromise("username")},{name:"GET_AUTH_TOKEN",fn:async e=>{if(e.authToken)return e.authToken;let t=await u.getDataPromise("authToken");return t?JSON.parse(t):null}}],s=[{name:"SET_SECRET",fn:async(e,t)=>{e.secret=t,await u.setDataPromise("secret",t)}},{name:"SET_USERNAME",fn:async(e,t)=>{e.username=t,await u.setDataPromise("username",t)}},{name:"SET_AUTH_TOKEN",fn:async(e,t)=>{e.authToken=t,await u.setDataPromise("authToken",JSON.stringify(t))}},{name:"RESET_STATE",fn:async(e,t)=>{console.log("User::resetState() - Mutating user state..."),await u.deleteDataPromise("username"),await u.deleteDataPromise("secret"),Object.assign(e,t)}}];return l.overrideState(e,h.defaultState()),l.fillVuexStorage(e,h.vuexFields(),t,s)}static instance(e,t,s){return h._instance||(h._instance=new h(e,t,s)),h._instance}constructor(e,t,s,a){this.$__storage=e,this.$__store=e.$__store,this.$__client=t,this.$__vm=s,this.$__salt=a,this.wallets=new c(c.vuexModel,s)}async set(e,t){await this.$__storage.set(e,t)}get(e){return this.$__storage.get(e)}async init({newSecret:e=null,username:t=null,uriRefhash:s=null}){let a;console.log("User::init() - Beginning bootstrap procedure..."),a=e||await this.$__storage.getVuexAsync("secret"),await this.$__store.commit("user/SET_SECRET",a),t&&await this.set("username",t),await this.authorize({newSecret:e}),this.$__client.hasSecret()?await this.restore():console.warn("User::init() - User is not logged in..."),await this.set("initialized",!0),console.log("User::init() - Bootstrap complete...")}async restore(){console.log("User::restore() - Beginning remote restore...");let e=await this.$__client.queryBundle({});if(!e||!Object.keys(e).length)return;await this.restoreWallets();const t=Object.values(e).pop();await this.restoreData(t),await this.set("logged_in",!0),console.log("User::restore() - Restore complete...")}async restoreWallets(){console.log("User::restoreWallets() - Restoring remote wallets...");let e=await this.$__client.queryWallets({});await this.wallets.import(e),console.log("User::restoreWallets() - Restoring complete...")}async restoreData(e){let t={bundle:e.bundleHash,createdAt:Number(e.createdAt),metas:e.metas},s=await this.get("user_data");if(console.log("User::restoreData() - Restoring remote metadata..."),e.metas||console.warn("User::restoreData() - No remote metadata found..."),this.$__storage.attributes().forEach((s=>{console.log(`User::restoreData() - Setting ${s} to ${e.metas[s]}...`),t[s]=e.metas[s]})),!s.cover){const s=require("geopattern");t.cover=s.generate(e.bundleHash).toDataUrl()}await this.set("user_data",t)}async authorize({newSecret:e}){console.log("User::authorize() - Starting authorization process..."),e&&(console.log("User::authorize() - Replacing user secret..."),await this.set("secret",e)),console.log("User::authorize() - Retrieving user identity...");let t=await this.$__storage.getVuexAsync("secret");t&&this.$__client.setSecret(t);let s=await this.$__storage.getVuex("auth_token");console.log(`User::authorize() - Retrieving auth token ${s?s.token:"NONE"}...`),(e||!s||!s.expiresAt||1e3*s.expiresAt<Date.now())&&(s=await this.$__client.authorize({secret:t}),console.log(`User::authorize() - Get a new auth token ${s.token}...`),await this.$__storage.setVuex("auth_token",s)),this.$__client.setAuthToken(s);let a=await this.get("auth_timeout");clearTimeout(a),console.log(`User::authorize() - Set auth timeout to ${new Date(1e3*s.expiresAt)} ...`);a=setTimeout((t=>{(async t=>{await t.authorize({newSecret:e})})(t)}),1e3*s.expiresAt-Date.now(),this),await this.set("auth_timeout",a)}async login({username:e,password:t,secret:a}){if(console.log("User::login() - Starting login process..."),!this.$__salt)throw"User::login() - Salt is required for secure hashing!";a||(a=s.generateSecret(`${e}:${t}:${this.$__salt}`));const i=s.generateBundleHash(a),r=await this.$__client.queryBundle({bundle:i});if(r?console.log(`User::login() - Retrieved ${Object.keys(r).length} results for bundle hash ${i}...`):console.warn(`User::login() - Failed to retrieve results for bundle hash ${i}...`),r&&r[i]&&Object.keys(r[i].metas).length>0){console.log("User::login() - Logging in..."),await this.init({newSecret:a,username:e}),await u.getDataPromise("refhash")&&await u.deleteDataPromise("refhash")}else console.warn("User::login() - User not registered; Aborting login..."),await this.logout()}async register({username:e,password:t}){if(console.log("User::register() - Starting registration process..."),!this.$__salt)throw"User::register() - Salt is required for secure hashing!";const a=s.generateSecret(`${e}:${t}:${this.$__salt}`),i=s.generateBundleHash(a),r=await this.$__client.queryBundle({bundle:i});r?console.log(`User::register() - Retrieved ${Object.keys(r).length} results for bundle hash ${i}...`):console.warn(`User::register() - Failed to retrieve results for bundle hash ${i}...`),r&&r[i]&&Object.keys(r[i].metas).length>0?(console.warn("User::register() - User already registered; Aborting registration..."),await this.logout()):(console.log("User::register() - User not registered; Registration can proceed..."),await this.init({newSecret:a,username:e}))}async logout(){console.log("User::logout() - Clearing user session..."),await this.set("initialized",!1),await this.$__client.deinitialize(),await this.set("logged_in",!1),await this.set("secret",!1),await this.set("username",!1),await this.set("bundle",!1),await this.set("user_roles",{}),await this.set("auth_token",!1),await this.set("user_data",{}),await this.wallets.reset(),await this.set("initialized",!0),console.log("User::logout() - User session cleared...")}async subscribeWalletBalance(e,t,s){console.log("User::update() - Subscribe wallet balance...");let a=await this.wallets.getWallets();for(let i in a){if(i===s)continue;let r=a[i],o=this;e.subscribe({query:t,variables:{bundle:r.bundle,token:r.token},fetchPolicy:"no-cache"}).subscribe({next(e){e.data.WalletStatus.token===r.token&&e.data.WalletStatus.balance!==r.balance&&(r.balance=e.data.WalletStatus.balance,o.wallets.setWallet(r))},error(e){console.log(e)}})}}async subscribeActiveWallet(e,t,s){console.log("User::subscribeActiveWallet() - Subscribe active wallet...");let a=await this.wallets.getWallets();for(let i in a){if(i===s)continue;let r=a[i],o=this;e.subscribe({query:t,variables:{bundle:r.bundle},fetchPolicy:"no-cache"}).subscribe({next(e){e.data.ActiveWallet.tokenSlug===r.token&&(r.position=e.data.ActiveWallet.position,r.molecules=e.data.ActiveWallet.molecules,r.batchId=e.data.ActiveWallet.batchId,r.address=e.data.ActiveWallet.address,r.balance=e.data.ActiveWallet.amount,o.wallets.setWallet(r))},error(e){console.log(e)}})}}}e.KnishIOVuexModel=l,e.StorageDB=n,e.User=h,e.UserWallets=c,Object.defineProperty(e,"__esModule",{value:!0})}));
